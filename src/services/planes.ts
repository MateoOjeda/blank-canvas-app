import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  addDoc
} from "firebase/firestore";
import { ChunkedBatch } from "@/lib/chunking";
import { LEVELS, DEFAULT_PRICES } from "@/lib/planConstants";
import { createNotification } from "./notifications";

export interface GlobalPlan {
  id: string;
  plan_type: string;
  level: string;
  price: number;
  content: string;
  active: boolean;
}

const PLAN_TYPES_CONFIG = [
  { key: "nutricion" },
  { key: "entrenamiento" },
  { key: "cambios_fisicos" },
] as const;

export async function fetchGlobalPlans(trainerId: string): Promise<{ plans: GlobalPlan[] }> {
  const q = query(collection(db, "global_plans"), where("trainer_id", "==", trainerId));
  const snap = await getDocs(q);
  let existing = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

  const missing: any[] = [];
  for (const pt of PLAN_TYPES_CONFIG) {
    for (const level of LEVELS) {
      if (!existing.find((e: any) => e.plan_type === pt.key && e.level === level)) {
        missing.push({
          trainer_id: trainerId,
          plan_type: pt.key,
          level,
          price: DEFAULT_PRICES[level],
          content: "",
          active: true,
        });
      }
    }
  }

  if (missing.length > 0) {
    const batch = new ChunkedBatch(db);
    const newPlans: any[] = [];
    missing.forEach(m => {
      const newDocRef = doc(collection(db, "global_plans"));
      batch.set(newDocRef, m);
      newPlans.push({ id: newDocRef.id, ...m });
    });
    await batch.commit();
    existing = [...existing, ...newPlans];
  }

  // Cleanup legacy "unico" level documents from cambios_fisicos
  const legacyUnico = existing.filter((e: any) => e.plan_type === "cambios_fisicos" && e.level === "unico");
  if (legacyUnico.length > 0) {
    const cleanupBatch = new ChunkedBatch(db);
    legacyUnico.forEach((e: any) => cleanupBatch.delete(doc(db, "global_plans", e.id)));
    await cleanupBatch.commit();
    existing = existing.filter((e: any) => !(e.plan_type === "cambios_fisicos" && e.level === "unico"));
  }

  return {
    plans: existing,
  };
}

export async function saveGlobalPlan(plan: GlobalPlan) {
  await updateDoc(doc(db, "global_plans", plan.id), { 
    price: plan.price, 
    content: plan.content, 
    active: plan.active 
  });
}

export async function toggleGlobalPlanActive(id: string, active: boolean) {
  await updateDoc(doc(db, "global_plans", id), { active });
}

export async function updatePlanAssignment(
  trainerId: string,
  studentId: string,
  planType: string,
  level: string
) {
  const batch = new ChunkedBatch(db);
  let hasWrites = false;

  // 1. Fetch existing levels for this plan type
  const q = query(
    collection(db, "plan_levels"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId),
    where("plan_type", "==", planType)
  );
  const snap = await getDocs(q);

  // 2. Deactivate levels that are currently unlocked and not the target level
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.level !== level && data.unlocked !== false) {
      batch.update(d.ref, { unlocked: false });
      hasWrites = true;
    }
  });

  // 3. Unlock specifically the NEW level
  if (level !== "none") {
    const existing = snap.docs.find(d => d.data().level === level);
    if (existing) {
      if (existing.data().unlocked !== true) {
        batch.update(existing.ref, { unlocked: true });
        hasWrites = true;
      }
    } else {
      const levelId = `${trainerId}_${studentId}_${planType}_${level}`;
      batch.set(doc(db, "plan_levels", levelId), {
        trainer_id: trainerId,
        student_id: studentId,
        plan_type: planType,
        level,
        unlocked: true,
        content: "",
        created_at: new Date().toISOString()
      }, { merge: true });
      hasWrites = true;
    }
  }

  // 4. Update trainer_students shortcut field if it actually changes
  const FIELD_MAP: Record<string, string> = {
    entrenamiento: "plan_entrenamiento",
    nutricion: "plan_alimentacion",
    cambios_fisicos: "plan_cambio_fisico",
  };
  const updateField = FIELD_MAP[planType] || "plan_alimentacion";
  const linkQuery = query(
    collection(db, "trainer_students"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );
  const linkSnap = await getDocs(linkQuery);
  if (!linkSnap.empty) {
    const docRef = linkSnap.docs[0].ref;
    const data = linkSnap.docs[0].data();
    const newValue = level === "none" ? null : level;
    if (data[updateField] !== newValue) {
      batch.update(docRef, { [updateField]: newValue });
      hasWrites = true;
    }
  }

  if (hasWrites) {
    await batch.commit();
  }

  // Notify student about plan level change
  if (level !== "none") {
    const PLAN_LABELS: Record<string, string> = {
      entrenamiento: "entrenamiento",
      nutricion: "alimentación",
      cambios_fisicos: "cambio físico",
    };
    createNotification({
      userId: studentId,
      type: "plan",
      title: "Nivel de plan actualizado",
      message: `Tu entrenador te ha asignado el nivel "${level}" del plan de ${PLAN_LABELS[planType] || planType}.`,
    }).catch(() => {});
  }
}

