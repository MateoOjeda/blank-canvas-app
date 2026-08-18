import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

export interface ExerciseLogDay {
  log_date: string;
  completed: boolean;
}

export async function fetchExerciseLogs(
  studentId: string,
  trainerId: string
): Promise<ExerciseLogDay[]> {
  const q = query(
    collection(db, "exercise_logs"),
    where("student_id", "==", studentId),
    where("trainer_id", "==", trainerId),
    orderBy("log_date", "desc"),
    limit(200)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    log_date: d.data().log_date,
    completed: !!d.data().completed,
  }));
}
