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
  addDoc,
  writeBatch
} from "firebase/firestore";

export type ExerciseType = "NORMAL" | "DROP_SET" | "PIRAMIDE" | "AL_FALLO" | "VI_SERIE";

export const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "DROP_SET", label: "Drop Set" },
  { value: "PIRAMIDE", label: "Pirámide" },
  { value: "AL_FALLO", label: "Al Fallo" },
  { value: "VI_SERIE", label: "VI Serie" },
];

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  completed: boolean;
  body_part: string;
  is_to_failure: boolean;
  is_dropset: boolean;
  is_piramide: boolean;
  pyramid_reps: string | null;
  exercise_type: ExerciseType;
  parent_exercise_id: string | null;
  routine_id: string;
}

export interface DayConfig {
  day: string;
  body_part_1: string;
  body_part_2: string;
}

export interface NewExercise {
  trainer_id: string;
  student_id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  body_part: string;
  is_to_failure: boolean;
  is_dropset: boolean;
  is_piramide: boolean;
  pyramid_reps: string | null;
  exercise_type: ExerciseType;
  routine_id: string;
  parent_exercise_id?: string | null;
}

export async function fetchRoutineData(trainerId: string, studentId: string) {
  // 1. Get or create active routine first
  const { getOrCreateActiveRoutine } = await import("./routineManager");
  const routine = await getOrCreateActiveRoutine(trainerId, "ALUMNO", studentId);

  // 2. Fetch exercises for THIS routine
  const exercisesQuery = query(
    collection(db, "exercises"), 
    where("routine_id", "==", routine.id)
  );
  
  // 3. Day configs are still per student/trainer/day for now
  const dayConfigQuery = query(
    collection(db, "routine_day_config"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );

  const [exSnap, daySnap] = await Promise.all([
    getDocs(exercisesQuery),
    getDocs(dayConfigQuery)
  ]);

  const exercises = exSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));

  const dayConfigs: Record<string, DayConfig> = {};
  daySnap.docs.forEach((d) => {
    const data = d.data();
    dayConfigs[data.day] = { 
      day: data.day, 
      body_part_1: data.body_part_1 || "", 
      body_part_2: data.body_part_2 || "" 
    };
  });

  // Fetch routine next change date from trainer_students link
  const linkQuery = query(
    collection(db, "trainer_students"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );
  const linkSnap = await getDocs(linkQuery);
  const routineNextChange = linkSnap.docs.length > 0 ? linkSnap.docs[0].data().routine_next_change_date : null;
  const routineAssignmentDate = linkSnap.docs.length > 0 ? linkSnap.docs[0].data().routine_assignment_date : null;

  return { exercises, dayConfigs, routineNextChange, routineAssignmentDate, routineId: routine.id };
}

export async function saveDayConfig(
  trainerId: string,
  studentId: string,
  day: string,
  body_part_1: string,
  body_part_2: string
) {
  // Use a composite ID for uniqueness
  const docId = `${trainerId}_${studentId}_${day}`;
  await setDoc(doc(db, "routine_day_config", docId), {
    trainer_id: trainerId,
    student_id: studentId,
    day,
    body_part_1,
    body_part_2,
    updated_at: new Date().toISOString()
  });
}

export async function addExercise(exercise: NewExercise) {
  if (!exercise.trainer_id || !exercise.student_id || !exercise.routine_id) {
    console.error("Missing required IDs for exercise", exercise);
    return null;
  }
  
  const docRef = await addDoc(collection(db, "exercises"), {
    ...exercise,
    created_at: new Date().toISOString(),
    completed: false
  });
  return docRef.id;
}

export async function removeExercise(exerciseId: string) {
  await deleteDoc(doc(db, "exercises", exerciseId));
}

export async function bulkRemoveExercises(ids: string[]) {
  const batch = writeBatch(db);
  ids.forEach(id => batch.delete(doc(db, "exercises", id)));
  await batch.commit();
}

export async function addViSerieChild(
  parentExercise: Exercise,
  trainerId: string,
  studentId: string
): Promise<string | null> {
  const docRef = await addDoc(collection(db, "exercises"), {
    trainer_id: trainerId,
    student_id: studentId,
    name: `${parentExercise.name} (VI Serie)`,
    sets: parentExercise.sets,
    reps: parentExercise.reps,
    weight: 0,
    day: parentExercise.day,
    body_part: parentExercise.body_part,
    is_to_failure: false,
    is_dropset: false,
    is_piramide: false,
    pyramid_reps: null,
    exercise_type: "VI_SERIE",
    parent_exercise_id: parentExercise.id,
    routine_id: parentExercise.routine_id,
    created_at: new Date().toISOString(),
    completed: false
  });
  return docRef.id;
}

export async function removeViSerieChild(parentId: string) {
  const q = query(collection(db, "exercises"), where("parent_exercise_id", "==", parentId));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
}

export async function logTrainerChange(
  trainerId: string,
  studentId: string,
  changeType: string,
  description: string,
  entityId?: string
) {
  await addDoc(collection(db, "trainer_changes"), {
    trainer_id: trainerId,
    student_id: studentId,
    change_type: changeType,
    description,
    entity_id: entityId || null,
    created_at: new Date().toISOString()
  });
}

export async function setRoutineNextChangeDate(trainerId: string, studentId: string, days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const dateStr = date.toISOString().split("T")[0];
  
  const q = query(
    collection(db, "trainer_students"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );
  const snap = await getDocs(q);
  
  if (snap.docs.length > 0) {
    await updateDoc(snap.docs[0].ref, { routine_next_change_date: dateStr });
  }
  
  return dateStr;
}

export async function setRoutineCycleDates(
  trainerId: string, 
  studentId: string, 
  assignmentDate: string, 
  nextChangeDate: string
) {
  const q = query(
    collection(db, "trainer_students"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );
  const snap = await getDocs(q);
  
  if (snap.docs.length > 0) {
    await updateDoc(snap.docs[0].ref, { 
      routine_assignment_date: assignmentDate,
      routine_next_change_date: nextChangeDate 
    });
  }
}

