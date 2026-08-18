import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  addDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { ChunkedBatch } from "@/lib/chunking";
import { createNotification } from "./notifications";

// ── Types & Constants ──────────────────────────────────────────────────────────

export type TargetType = "ALUMNO" | "GRUPO";
export type RoutineStatus = "ACTIVA" | "ARCHIVADA";
export type RoutineType = "INDIVIDUAL" | "GRUPAL";
export type ExerciseType = "NORMAL" | "DROP_SET" | "PIRAMIDE" | "AL_FALLO" | "BI_SERIE";

export const EXERCISE_TYPES: { value: ExerciseType; label: string }[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "DROP_SET", label: "Drop Set" },
  { value: "PIRAMIDE", label: "Pirámide" },
  { value: "AL_FALLO", label: "Al Fallo" },
  { value: "BI_SERIE", label: "Bi Serie" },
];

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

// ── Routine Management ─────────────────────────────────────────────────────────

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

  const routineId = `${trainerId}_${targetId}`;
  const routineData = {
    trainer_id: trainerId,
    target_type: targetType,
    target_id: targetId,
    status: "ACTIVA",
    routine_type: routineType,
    name: targetType === "GRUPO" ? "Rutina grupal" : "Rutina individual",
    created_at: new Date().toISOString()
  };

  await setDoc(doc(db, "routines", routineId), routineData, { merge: true });
  return { id: routineId, ...routineData } as Routine;
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

  const batch = new ChunkedBatch(db);
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
    where("target_type", "==", "ALUMNO"),
    where("status", "==", "ARCHIVADA"),
    orderBy("created_at", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Routine));
}

// ── Routine Data & Exercises ───────────────────────────────────────────────────

export async function fetchRoutineData(trainerId: string, studentId: string) {
  // 1. Get or create active routine first
  const routine = await getOrCreateActiveRoutine(trainerId, "ALUMNO", studentId);

  // 2. Fetch exercises for THIS routine
  const exercisesQuery = query(
    collection(db, "exercises"), 
    where("routine_id", "==", routine.id)
  );
  
  // 3. Day configs are still per student/trainer/day
  const dayConfigQuery = query(
    collection(db, "routine_day_config"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );

  // Fetch routine next change date from trainer_students link in parallel
  const linkQuery = query(
    collection(db, "trainer_students"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );

  const [exSnap, daySnap, linkSnap] = await Promise.all([
    getDocs(exercisesQuery),
    getDocs(dayConfigQuery),
    getDocs(linkQuery)
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

  const routineNextChange = linkSnap.docs.length > 0 ? linkSnap.docs[0].data().routine_next_change_date : null;
  const routineAssignmentDate = linkSnap.docs.length > 0 ? linkSnap.docs[0].data().routine_assignment_date : null;

  return { exercises, dayConfigs, routineNextChange, routineAssignmentDate, routineId: routine.id };
}

/**
 * Fetch exercises belonging to a specific routine.
 */
export async function fetchRoutineExercises(routineId: string) {
  const q = query(collection(db, "exercises"), where("routine_id", "==", routineId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  if (!exercise.trainer_id) throw new Error("ID de entrenador faltante.");
  if (!exercise.student_id) throw new Error("ID de alumno faltante.");
  if (!exercise.routine_id) throw new Error("ID de rutina faltante.");
  
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
  const batch = new ChunkedBatch(db);
  ids.forEach(id => batch.delete(doc(db, "exercises", id)));
  await batch.commit();
}

export async function addBiSerieChild(
  parentExercise: Exercise,
  trainerId: string,
  studentId: string
): Promise<string | null> {
  const docRef = await addDoc(collection(db, "exercises"), {
    trainer_id: trainerId,
    student_id: studentId,
    name: `${parentExercise.name} (Bi Serie)`,
    sets: parentExercise.sets,
    reps: parentExercise.reps,
    weight: 0,
    day: parentExercise.day,
    body_part: parentExercise.body_part,
    is_to_failure: false,
    is_dropset: false,
    is_piramide: false,
    pyramid_reps: null,
    exercise_type: "BI_SERIE",
    parent_exercise_id: parentExercise.id,
    routine_id: parentExercise.routine_id,
    created_at: new Date().toISOString(),
    completed: false
  });
  return docRef.id;
}

export async function removeBiSerieChild(parentId: string) {
  const q = query(collection(db, "exercises"), where("parent_exercise_id", "==", parentId));
  const snap = await getDocs(q);
  const batch = new ChunkedBatch(db);
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

// ── Cycle Dates & Group Assignments ───────────────────────────────────────────

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
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayLocal = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = todayLocal.toISOString().split('T')[0];

    await updateDoc(snap.docs[0].ref, { 
      routine_assignment_date: todayStr,
      routine_next_change_date: dateStr 
    });
  }
  
  return dateStr;
}

export async function setRoutineCycleDates(
  trainerId: string, 
  studentId: string, 
  assignmentDate: string | null, 
  nextChangeDate: string | null
) {
  const q = query(
    collection(db, "trainer_students"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );
  const snap = await getDocs(q);
  
  if (snap.docs.length > 0) {
    let finalAssignmentDate = assignmentDate;
    if (!finalAssignmentDate) {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const todayLocal = new Date(today.getTime() - (offset * 60 * 1000));
      finalAssignmentDate = todayLocal.toISOString().split('T')[0];
    }

    await updateDoc(snap.docs[0].ref, { 
      routine_assignment_date: finalAssignmentDate,
      routine_next_change_date: nextChangeDate 
    });
  }
}

export async function autoUpdateRoutineCycle(trainerId: string, studentId: string) {
  const q = query(
    collection(db, "trainer_students"), 
    where("trainer_id", "==", trainerId), 
    where("student_id", "==", studentId)
  );
  const snap = await getDocs(q);
  
  if (snap.docs.length > 0) {
    const docRef = snap.docs[0].ref;
    const data = snap.docs[0].data();
    
    // Get today's local date YYYY-MM-DD
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayLocal = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = todayLocal.toISOString().split('T')[0];
    
    const updates: any = {
      routine_assignment_date: todayStr
    };
    
    // Check if next change date exists and is in the future
    const currentNextChange = data.routine_next_change_date;
    const isFuture = currentNextChange && new Date(currentNextChange) > today;
    
    if (!isFuture) {
      // Set to today + 30 days to keep the cycle active
      const nextChange = new Date(today.getTime() - (offset * 60 * 1000));
      nextChange.setDate(nextChange.getDate() + 30);
      updates.routine_next_change_date = nextChange.toISOString().split('T')[0];
    }
    
    await updateDoc(docRef, updates);
  }
}

export async function assignGroupRoutineToStudent(
  trainerId: string,
  studentId: string,
  groupId: string
): Promise<void> {
  // 1. Archive any active individual routine for this student
  const qActive = query(
    collection(db, "routines"),
    where("trainer_id", "==", trainerId),
    where("target_type", "==", "ALUMNO"),
    where("target_id", "==", studentId),
    where("status", "==", "ACTIVA")
  );

  const qLink = query(
    collection(db, "trainer_students"),
    where("trainer_id", "==", trainerId),
    where("student_id", "==", studentId)
  );

  // 2. Fetch group exercises to copy into student's routine
  const qGroupEx = query(
    collection(db, "group_exercises"),
    where("group_id", "==", groupId)
  );

  const [activeSnap, linkSnap, groupExSnap] = await Promise.all([
    getDocs(qActive),
    getDocs(qLink),
    getDocs(qGroupEx)
  ]);

  const batch = new ChunkedBatch(db);
  let hasWrites = false;

  // Archive current active individual routine
  if (!activeSnap.empty) {
    activeSnap.docs.forEach(d => {
      if (d.data().status !== "ARCHIVADA") {
        batch.update(d.ref, { status: "ARCHIVADA" });
        hasWrites = true;
      }
    });
  }

  // Update cycle dates
  if (!linkSnap.empty) {
    const docRef = linkSnap.docs[0].ref;
    const data = linkSnap.docs[0].data();
    
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const todayLocal = new Date(today.getTime() - (offset * 60 * 1000));
    const todayStr = todayLocal.toISOString().split('T')[0];
    
    const updates: Record<string, string> = {};
    if (data.routine_assignment_date !== todayStr) {
      updates.routine_assignment_date = todayStr;
    }
    
    const currentNextChange = data.routine_next_change_date;
    const isFuture = currentNextChange && new Date(currentNextChange) > today;
    
    if (!isFuture) {
      const nextChange = new Date(today.getTime() - (offset * 60 * 1000));
      nextChange.setDate(nextChange.getDate() + 30);
      const nextChangeStr = nextChange.toISOString().split('T')[0];
      if (data.routine_next_change_date !== nextChangeStr) {
        updates.routine_next_change_date = nextChangeStr;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      batch.update(docRef, updates);
      hasWrites = true;
    }
  }

  if (hasWrites) {
    await batch.commit();
  }

  // 3. Get or create active routine for student and copy group exercises into it
  const routine = await getOrCreateActiveRoutine(trainerId, "ALUMNO", studentId);

  if (!groupExSnap.empty) {
    const exBatch = new ChunkedBatch(db);
    const groupIdToNewId = new Map<string, string>();

    groupExSnap.docs.forEach(d => {
      const data = d.data();
      const newId = `${routine.id}_${d.id}`;
      groupIdToNewId.set(d.id, newId);

      exBatch.set(doc(db, "exercises", newId), {
        trainer_id: trainerId,
        student_id: studentId,
        routine_id: routine.id,
        name: data.name,
        sets: data.sets,
        reps: data.reps,
        weight: data.weight || 0,
        day: data.day,
        body_part: data.body_part,
        is_to_failure: data.is_to_failure || false,
        is_dropset: data.is_dropset || false,
        is_piramide: data.is_piramide || false,
        pyramid_reps: data.pyramid_reps || null,
        exercise_type: data.exercise_type || "NORMAL",
        parent_exercise_id: null,
        completed: false,
        created_at: new Date().toISOString()
      }, { merge: true });
    });

    // Fix parent_exercise_id references
    groupExSnap.docs.forEach(d => {
      const data = d.data();
      if (data.parent_exercise_id && groupIdToNewId.has(data.parent_exercise_id)) {
        const newId = `${routine.id}_${d.id}`;
        exBatch.update(doc(db, "exercises", newId), {
          parent_exercise_id: groupIdToNewId.get(data.parent_exercise_id)
        });
      }
    });

    await exBatch.commit();
  }

  // Notify student
  createNotification({
    userId: studentId,
    type: "routine",
    title: "Nueva rutina grupal",
    message: "Tu entrenador te ha asignado una nueva rutina grupal.",
  }).catch(() => {});
}

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
  const batch = new ChunkedBatch(db);
  snap.docs.forEach(d => batch.update(d.ref, { routine_id: routineId }));
  await batch.commit();
}
