import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export async function fetchStudentProfile(studentId: string) {
  const snap = await getDoc(doc(db, "profiles", studentId));
  return snap.exists() ? snap.data() : null;
}

export async function fetchStudentTrainerLink(studentId: string) {
  const q = query(collection(db, "trainer_students"), where("student_id", "==", studentId));
  const snap = await getDocs(q);
  return !snap.empty ? snap.docs[0].data() : null;
}

export async function fetchTrainerChanges(studentId: string) {
  const q = query(
    collection(db, "trainer_changes"),
    where("student_id", "==", studentId),
    orderBy("created_at", "desc"),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
