import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  doc,
} from "firebase/firestore";

export interface DiagnosticData {
  id: string;
  student_id: string;
  created_at: string;
  [key: string]: unknown;
}

export async function fetchDiagnostic(studentId: string): Promise<DiagnosticData | null> {
  const q = query(
    collection(db, "seguimiento_personal"),
    where("student_id", "==", studentId),
    orderBy("created_at", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const document = snap.docs[0];
  return { id: document.id, ...document.data() } as DiagnosticData;
}

export async function saveDiagnostic(
  studentId: string,
  existingId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  if (existingId) {
    await updateDoc(doc(db, "seguimiento_personal", existingId), payload);
  } else {
    await setDoc(doc(db, "seguimiento_personal", studentId), {
      student_id: studentId,
      created_at: new Date().toISOString(),
      ...payload,
    });
  }
}
