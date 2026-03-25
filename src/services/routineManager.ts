import { supabase } from "@/integrations/supabase/client";

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
  const { data: existing } = await supabase
    .from("routines")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .eq("status", "ACTIVA")
    .maybeSingle();

  if (existing) return existing as unknown as Routine;

  const { data: created, error } = await supabase
    .from("routines")
    .insert({
      trainer_id: trainerId,
      target_type: targetType,
      target_id: targetId,
      status: "ACTIVA",
      routine_type: routineType,
      name: targetType === "GRUPO" ? "Rutina grupal" : "Rutina individual",
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return created as unknown as Routine;
}

/**
 * Archive the active routine for a student (set status to ARCHIVADA).
 */
export async function archiveActiveRoutine(
  trainerId: string,
  studentId: string
): Promise<void> {
  await supabase
    .from("routines")
    .update({ status: "ARCHIVADA" } as any)
    .eq("trainer_id", trainerId)
    .eq("target_type", "ALUMNO")
    .eq("target_id", studentId)
    .eq("status", "ACTIVA");
}

/**
 * Fetch all routines for a student (active + archived).
 */
export async function fetchStudentRoutines(
  trainerId: string,
  studentId: string
): Promise<Routine[]> {
  const { data } = await supabase
    .from("routines")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("target_type", "ALUMNO")
    .eq("target_id", studentId)
    .order("created_at", { ascending: false });

  return (data as unknown as Routine[]) || [];
}

/**
 * Fetch archived routines for a student, including group routines they were part of.
 */
export async function fetchArchivedRoutines(
  trainerId: string,
  studentId: string
): Promise<Routine[]> {
  const { data } = await supabase
    .from("routines")
    .select("*")
    .eq("trainer_id", trainerId)
    .eq("target_id", studentId)
    .eq("status", "ARCHIVADA")
    .order("created_at", { ascending: false });

  return (data as unknown as Routine[]) || [];
}

/**
 * Fetch exercises belonging to a specific routine.
 */
export async function fetchRoutineExercises(routineId: string) {
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("routine_id", routineId);

  return data || [];
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
  // 1. Archive the student's current active routine (if any)
  await archiveActiveRoutine(trainerId, studentId);

  // Also unlink exercises from the old routine (they stay but routine_id nulled)
  // The archived routine's exercises remain queryable via routine_id

  // 2. Fetch group exercises
  const { data: groupExercises } = await supabase
    .from("group_exercises")
    .select("*")
    .eq("group_id", groupId);

  if (!groupExercises || groupExercises.length === 0) return;

  // 3. Create a new GRUPAL routine for this student
  const routine = await getOrCreateActiveRoutine(trainerId, "ALUMNO", studentId, "GRUPAL");

  // 4. Copy group exercises to student's exercises
  const inserts = groupExercises.map((ge: any) => ({
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
  }));

  const { error } = await supabase.from("exercises").insert(inserts as any);
  if (error) throw error;
}

/**
 * Link existing unlinked exercises to a routine.
 */
export async function linkExercisesToRoutine(
  trainerId: string,
  studentId: string,
  routineId: string
): Promise<void> {
  await supabase
    .from("exercises")
    .update({ routine_id: routineId } as any)
    .eq("trainer_id", trainerId)
    .eq("student_id", studentId)
    .is("routine_id", null);
}
