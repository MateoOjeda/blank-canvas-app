import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// Load environment variables manually from .env file without printing secret values
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    for (const line of envConfig.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    }
  }
}

loadEnv();

const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || "cip-fits-app";
const args = process.argv.slice(2);
const isExecute = args.includes("--execute");
const isDryRun = !isExecute || args.includes("--dry-run");

console.log("=================================================");
console.log(`CIP FITS Administrative Relationship Migration Utility`);
console.log(`Mode: ${isExecute ? "EXECUTE (WRITES ENABLED)" : "DRY RUN (READ ONLY - 0 WRITES, 0 DELETES)"}`);
console.log(`Target Project: ${PROJECT_ID}`);
console.log("=================================================\n");

interface MigrationStats {
  total: number;
  deterministic: number;
  legacy: number;
  duplicates: number;
  malformed: number;
  migrated: number;
  skipped: number;
  conflicts: number;
  errors: number;
}

let dbInstance: FirebaseFirestore.Firestore | null = null;
let authMechanismUsed: string | null = null;

function initializeAdminSDK(): boolean {
  // Option 1: GOOGLE_APPLICATION_CREDENTIALS file path
  const gacPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (gacPath) {
    const resolvedPath = path.isAbsolute(gacPath) ? gacPath : path.resolve(process.cwd(), gacPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
        if (!getApps().length) {
          initializeApp({
            credential: cert(serviceAccount),
            projectId: PROJECT_ID,
          });
        }
        dbInstance = getFirestore();
        authMechanismUsed = "GOOGLE_APPLICATION_CREDENTIALS (Service Account File)";
        console.log("[AUTH] ADMIN AUTH: PASS");
        console.log(`[AUTH] Authenticated via GOOGLE_APPLICATION_CREDENTIALS file: ${gacPath}\n`);
        return true;
      } catch (err: any) {
        console.error("[AUTH ERROR] Failed parsing service account file:", err?.message || err);
      }
    } else {
      console.error(`[AUTH ERROR] Specified GOOGLE_APPLICATION_CREDENTIALS file not found: ${resolvedPath}`);
    }
  }

  // Option 2: FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountJson) {
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      if (!getApps().length) {
        initializeApp({
          credential: cert(serviceAccount),
          projectId: PROJECT_ID,
        });
      }
      dbInstance = getFirestore();
      authMechanismUsed = "FIREBASE_SERVICE_ACCOUNT_KEY (Service Account Env Var)";
      console.log("[AUTH] ADMIN AUTH: PASS");
      console.log("[AUTH] Authenticated via FIREBASE_SERVICE_ACCOUNT_KEY environment variable.\n");
      return true;
    } catch (err: any) {
      console.error("[AUTH ERROR] Failed parsing FIREBASE_SERVICE_ACCOUNT_KEY JSON:", err?.message || err);
    }
  }

  // No standard Admin credentials configured: STOP immediately
  console.log("=================================================");
  console.log("ADMIN AUTH: FAIL");
  console.log("MIGRATION: NOT EXECUTED");
  console.log("=================================================");
  console.log("REASON: Neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_SERVICE_ACCOUNT_KEY");
  console.log("is configured in the environment.");
  console.log("The migration script strictly requires Firebase Admin SDK credentials to run.");
  console.log("No fallback to client SDK or rule bypass is permitted.");
  console.log("=================================================");
  console.log("DATABASE WRITES: 0");
  console.log("DATABASE DELETES: 0");
  console.log("=================================================");
  return false;
}

async function auditAndMigrateTrainerStudents(db: FirebaseFirestore.Firestore): Promise<MigrationStats> {
  console.log("--- Auditing Collection: trainer_students ---");
  const stats: MigrationStats = {
    total: 0,
    deterministic: 0,
    legacy: 0,
    duplicates: 0,
    malformed: 0,
    migrated: 0,
    skipped: 0,
    conflicts: 0,
    errors: 0
  };

  try {
    const snapshot = await db.collection("trainer_students").get();
    stats.total = snapshot.size;
    const seenRelationships = new Set<string>();

    for (const docObj of snapshot.docs) {
      const data = docObj.data();
      const currentId = docObj.id;
      const trainerId = data.trainer_id;
      const studentId = data.student_id;

      if (!trainerId || !studentId) {
        console.warn(`[MALFORMED] Doc ID ${currentId} missing trainer_id or student_id`);
        stats.malformed++;
        continue;
      }

      const expectedId = `${trainerId}_${studentId}`;
      const relKey = `${trainerId}:${studentId}`;

      if (seenRelationships.has(relKey)) {
        stats.duplicates++;
      } else {
        seenRelationships.add(relKey);
      }

      if (currentId === expectedId) {
        stats.deterministic++;
      } else {
        stats.legacy++;
        console.log(`[LEGACY CANDIDATE] Current ID: ${currentId} -> Deterministic ID: ${expectedId}`);

        if (isExecute) {
          try {
            const destRef = db.collection("trainer_students").doc(expectedId);
            const destSnap = await destRef.get();
            if (destSnap.exists) {
              console.warn(`[CONFLICT] Destination ${expectedId} already exists. Skipping.`);
              stats.conflicts++;
              stats.skipped++;
            } else {
              await destRef.set(data, { merge: true });
              const verifySnap = await destRef.get();
              if (verifySnap.exists) {
                console.log(`[MIGRATED & VERIFIED] ${currentId} -> ${expectedId}`);
                stats.migrated++;
              } else {
                stats.errors++;
              }
            }
          } catch (err: any) {
            console.error(`[ERROR] Migrating ${currentId}:`, err?.message || err);
            stats.errors++;
          }
        } else {
          stats.skipped++;
        }
      }
    }
  } catch (err: any) {
    console.error("Error reading trainer_students collection:", err?.message || err);
  }

  return stats;
}

async function auditAndMigrateTrainingGroupMembers(db: FirebaseFirestore.Firestore): Promise<MigrationStats> {
  console.log("\n--- Auditing Collection: training_group_members ---");
  const stats: MigrationStats = {
    total: 0,
    deterministic: 0,
    legacy: 0,
    duplicates: 0,
    malformed: 0,
    migrated: 0,
    skipped: 0,
    conflicts: 0,
    errors: 0
  };

  try {
    const snapshot = await db.collection("training_group_members").get();
    stats.total = snapshot.size;
    const seenMemberships = new Set<string>();

    for (const docObj of snapshot.docs) {
      const data = docObj.data();
      const currentId = docObj.id;
      const groupId = data.group_id;
      const studentId = data.student_id;

      if (!groupId || !studentId) {
        console.warn(`[MALFORMED] Doc ID ${currentId} missing group_id or student_id`);
        stats.malformed++;
        continue;
      }

      const expectedId = `${groupId}_${studentId}`;
      const memKey = `${groupId}:${studentId}`;

      if (seenMemberships.has(memKey)) {
        stats.duplicates++;
      } else {
        seenMemberships.add(memKey);
      }

      if (currentId === expectedId) {
        stats.deterministic++;
      } else {
        stats.legacy++;
        console.log(`[LEGACY CANDIDATE] Current ID: ${currentId} -> Deterministic ID: ${expectedId}`);

        if (isExecute) {
          try {
            const destRef = db.collection("training_group_members").doc(expectedId);
            const destSnap = await destRef.get();
            if (destSnap.exists) {
              console.warn(`[CONFLICT] Destination ${expectedId} already exists. Skipping.`);
              stats.conflicts++;
              stats.skipped++;
            } else {
              await destRef.set(data, { merge: true });
              const verifySnap = await destRef.get();
              if (verifySnap.exists) {
                console.log(`[MIGRATED & VERIFIED] ${currentId} -> ${expectedId}`);
                stats.migrated++;
              } else {
                stats.errors++;
              }
            }
          } catch (err: any) {
            console.error(`[ERROR] Migrating ${currentId}:`, err?.message || err);
            stats.errors++;
          }
        } else {
          stats.skipped++;
        }
      }
    }
  } catch (err: any) {
    console.error("Error reading training_group_members collection:", err?.message || err);
  }

  return stats;
}

async function run() {
  const isAuthSuccess = initializeAdminSDK();
  if (!isAuthSuccess || !dbInstance) {
    process.exit(1);
  }

  const tsStats = await auditAndMigrateTrainerStudents(dbInstance);
  const tgmStats = await auditAndMigrateTrainingGroupMembers(dbInstance);

  console.log("\n=================================================");
  console.log("FINAL MIGRATION AUDIT REPORT");
  console.log("=================================================");
  console.log(`ADMIN AUTH: PASS`);
  console.log(`Authentication Mechanism: ${authMechanismUsed}`);
  console.log(`Dry-Run Mode: ${isDryRun ? "YES (0 Writes, 0 Deletes)" : "NO (Writes Executed)"}`);
  console.log("\ntrainer_students:");
  console.log(`  - Total Documents: ${tsStats.total}`);
  console.log(`  - Deterministic Documents: ${tsStats.deterministic}`);
  console.log(`  - Legacy Random-ID Documents: ${tsStats.legacy}`);
  console.log(`  - Duplicates: ${tsStats.duplicates}`);
  console.log(`  - Malformed Records: ${tsStats.malformed}`);
  console.log(`  - Migration Candidates: ${tsStats.legacy}`);
  console.log("\ntraining_group_members:");
  console.log(`  - Total Documents: ${tgmStats.total}`);
  console.log(`  - Deterministic Documents: ${tgmStats.deterministic}`);
  console.log(`  - Legacy Random-ID Documents: ${tgmStats.legacy}`);
  console.log(`  - Duplicates: ${tgmStats.duplicates}`);
  console.log(`  - Malformed Records: ${tgmStats.malformed}`);
  console.log(`  - Migration Candidates: ${tgmStats.legacy}`);
  console.log("=================================================");
  console.log("SAFETY GUARANTEE: Legacy documents are PRESERVED and NOT deleted.");
  console.log("=================================================");

  process.exit(0);
}

run();
