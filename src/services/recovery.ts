import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
} from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RecoveryLog {
  id: string;
  trainer_id: string;
  student_id: string;
  recorded_at: string;        // ISO datetime
  sleep_hours?: number | null;
  sleep_quality?: 1 | 2 | 3 | 4 | 5 | null;
  energy?: 1 | 2 | 3 | 4 | 5 | null;
  fatigue?: 1 | 2 | 3 | 4 | 5 | null;
  stress?: 1 | 2 | 3 | 4 | 5 | null;
  pain_level?: number | null;  // 1–10
  pain_zones?: string[];
  notes?: string;
}

export type RecoveryLogInput = Omit<RecoveryLog, "id">;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function fetchRecoveryLogs(
  trainerId: string,
  studentId: string,
  pageSize = 30
): Promise<RecoveryLog[]> {
  const q = query(
    collection(db, "tracking_recovery"),
    where("trainer_id", "==", trainerId),
    where("student_id", "==", studentId),
    orderBy("recorded_at", "desc"),
    limit(pageSize)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RecoveryLog));
}

export async function addRecoveryLog(
  data: RecoveryLogInput
): Promise<string> {
  const ref = await addDoc(collection(db, "tracking_recovery"), data);
  return ref.id;
}

export async function deleteRecoveryLog(id: string): Promise<void> {
  await deleteDoc(doc(db, "tracking_recovery", id));
}
