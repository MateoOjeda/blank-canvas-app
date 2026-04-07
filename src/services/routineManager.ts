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
  writeBatch,
  orderBy,
  limit
} from "firebase/firestore";

export type TargetType = "ALUMNO" | "GRUPO";
export type RoutineStatus = "ACTIVA" | "ARCHIVADA";
export type RoutineType = "INDIVIDUAL" | "GRUPAL";

export interface Routine {
  id: string;
  trainer_id: string;
  target_type: TargetType;
  target_id: string;
  status: RoutineStatus;
  routine_type: RoutineType;
  name: string;
  created_at: string;
}

/**
 * Get or create the active routine for a given target (student or group).
 * If no routine exists, one is created automatically.
 */
export async function getOrCreateActiveRoutine(
  trainerId: string,
  targetType: TargetType,
  targetId: string,
  routineType: RoutineType = "INDIVIDUAL"
): Promise<Routine> {
  const q = query(
    collection(db, "routines"),
    where("trainer_id", "==", trainerId),
    where("target_type", "==", targetType),
    where("target_id", "==", targetId),
    where("status", "==", "ACTIVA"),
    limit(1)
  );
  
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Routine;
  }

  const newDoc = {
    trainer_id: trainerId,
    target_type: targetType,
    target_id: targetId,
    status: "ACTIVA",
    routine_type: routineType,
    name: targetType === "GRUPO" ? "Rutina grupal" : "Rutina individual",
    created_at: new Date().toISOString()
  };

  const docRef = await addDoc(collection(db, "routines"), newDoc);
  return { id: docRef.id, ...newDoc } as Routine;
}

/**
 * Archive the active routine for a student (set status to ARCHIVADA).
 */
export async function archiveActiveRoutine(
  trainerId: string,
  studentId: string
): Promise<void> {
  const q = query(
    collection(db, "routines"),
    where("trainer_id", "==", trainerId),
    where("target_type", "==", "ALUMNO"),
    where("target_id", "==", studentId),
    where("status", "==", "ACTIVA")
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { status: "ARCHIVADA" }));
  await batch.commit();
}

/**
 * Fetch all routines for a student (active + archived).
 */
export async function fetchStudentRoutines(
  trainerId: string,
  studentId: string
): Promise<Routine[]> {
  const q = query(
    collection(db, "routines"),
    where("trainer_id", "==", trainerId),
    where("target_type", "==", "ALUMNO"),
    where("target_id", "==", studentId),
    orderBy("created_at", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Routine));
}

/**
 * Fetch archived routines for a student, including group routines they were part of.
 */
export async function fetchArchivedRoutines(
  trainerId: string,
  studentId: string
): Promise<Routine[]> {
  const q = query(
    collection(db, "routines"),
    where("trainer_id", "==", trainerId),
    where("target_id", "==", studentId),
    where("status", "==", "ARCHIVADA"),
    orderBy("created_at", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Routine));
}

/**
 * Fetch exercises belonging to a specific routine.
 */
export async function fetchRoutineExercises(routineId: string) {
  const q = query(collection(db, "exercises"), where("routine_id", "==", routineId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * When a student joins a group that has exercises:
 * 1. Archive the student's active individual routine
 * 2. Copy group exercises to the student's exercises with a new GRUPAL routine
 */
export async function assignGroupRoutineToStudent(
  trainerId: string,
  studentId: string,
  groupId: string
): Promise<void> {
  // 1. Archive ANY current active routine for this student (be it individual or another group)
  const qActive = query(
    collection(db, "routines"),
    where("trainer_id", "==", trainerId),
    where("target_type", "==", "ALUMNO"),
    where("target_id", "==", studentId),
    where("status", "==", "ACTIVA")
  );
  const activeSnap = await getDocs(qActive);
  if (!activeSnap.empty) {
    const batchArch = writeBatch(db);
    activeSnap.docs.forEach(d => batchArch.update(d.ref, { status: "ARCHIVADA" }));
    await batchArch.commit();
  }

  // 2. Fetch group exercises
  const q = query(collection(db, "group_exercises"), where("group_id", "==", groupId));
  const snap = await getDocs(q);
  const groupExercises = snap.docs.map(d => d.data());

  if (groupExercises.length === 0) return;

  // 3. Create a new GRUPAL routine for this student
  const routine = await getOrCreateActiveRoutine(trainerId, "ALUMNO", studentId, "GRUPAL");

  // 4. Copy group exercises to student's exercises
  const batch = writeBatch(db);
  groupExercises.forEach((ge: any) => {
    const newExRef = doc(collection(db, "exercises"));
    batch.set(newExRef, {
      trainer_id: trainerId,
      student_id: studentId,
      name: ge.name,
      sets: ge.sets,
      reps: ge.reps,
      weight: ge.weight || 0,
      day: ge.day,
      body_part: ge.body_part || "",
      is_to_failure: ge.is_to_failure || false,
      is_dropset: ge.is_dropset || false,
      is_piramide: ge.is_piramide || false,
      pyramid_reps: ge.pyramid_reps || null,
      exercise_type: ge.exercise_type || "NORMAL",
      routine_id: routine.id,
      created_at: new Date().toISOString(),
      completed: false
    });
  });

  await batch.commit();
}

/**
 * Link existing unlinked exercises to a routine.
 */
export async function linkExercisesToRoutine(
  trainerId: string,
  studentId: string,
  routineId: string
): Promise<void> {
  const q = query(
    collection(db, "exercises"),
    where("trainer_id", "==", trainerId),
    where("student_id", "==", studentId),
    where("routine_id", "==", null)
  );
  
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { routine_id: routineId }));
  await batch.commit();
}

