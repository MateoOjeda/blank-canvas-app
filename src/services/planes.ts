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
] as const;

export async function fetchGlobalPlans(trainerId: string): Promise<{ plans: GlobalPlan[]; cambioFisico: GlobalPlan | null }> {
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
  if (!existing.find((e: any) => e.plan_type === "cambios_fisicos")) {
    missing.push({
      trainer_id: trainerId,
      plan_type: "cambios_fisicos",
      level: "unico",
      price: 0,
      content: "",
      active: true,
    });
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

  return {
    plans: existing.filter((e: any) => e.plan_type !== "cambios_fisicos"),
    cambioFisico: existing.find((e: any) => e.plan_type === "cambios_fisicos") || null,
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
      const newDocRef = doc(collection(db, "plan_levels"));
      batch.set(newDocRef, {
        trainer_id: trainerId,
        student_id: studentId,
        plan_type: planType,
        level,
        unlocked: true,
        content: "",
        created_at: new Date().toISOString()
      });
      hasWrites = true;
    }
  }

  // 4. Update trainer_students shortcut field if it actually changes
  const updateField = planType === "entrenamiento" ? "plan_entrenamiento" : "plan_alimentacion";
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
    createNotification({
      userId: studentId,
      type: "plan",
      title: "Nivel de plan actualizado",
      message: `Tu entrenador te ha asignado el nivel "${level}" del plan de ${planType === "entrenamiento" ? "entrenamiento" : "alimentación"}.`,
    }).catch(() => {});
  }
}

