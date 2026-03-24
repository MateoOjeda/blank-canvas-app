import { supabase } from "@/integrations/supabase/client";

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
}

export async function fetchRoutineData(trainerId: string, studentId: string) {
  const [exRes, dayRes, tsRes] = await Promise.all([
    supabase.from("exercises").select("*").eq("trainer_id", trainerId).eq("student_id", studentId),
    supabase.from("routine_day_config").select("day, body_part_1, body_part_2").eq("trainer_id", trainerId).eq("student_id", studentId),
    supabase.from("trainer_students").select("routine_next_change_date").eq("trainer_id", trainerId).eq("student_id", studentId).maybeSingle(),
  ]);

  const exercises = (exRes.data as Exercise[]) || [];

  const dayConfigs: Record<string, DayConfig> = {};
  (dayRes.data || []).forEach((d: any) => {
    dayConfigs[d.day] = { day: d.day, body_part_1: d.body_part_1 || "", body_part_2: d.body_part_2 || "" };
  });

  const routineNextChange = tsRes.data?.routine_next_change_date || null;

  return { exercises, dayConfigs, routineNextChange };
}

export async function saveDayConfig(
  trainerId: string,
  studentId: string,
  day: string,
  body_part_1: string,
  body_part_2: string
) {
  await supabase.from("routine_day_config").upsert(
    { trainer_id: trainerId, student_id: studentId, day, body_part_1, body_part_2 } as any,
    { onConflict: "trainer_id,student_id,day" }
  );
}

export async function addExercise(exercise: NewExercise): Promise<string | null> {
  const { data, error } = await supabase
    .from("exercises")
    .insert(exercise as any)
    .select("id")
    .single();

  if (error) throw error;
  return data?.id || null;
}

export async function removeExercise(exerciseId: string) {
  const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
  if (error) throw error;
}

export async function bulkRemoveExercises(ids: string[]) {
  const { error } = await supabase.from("exercises").delete().in("id", ids);
  if (error) throw error;
}

export async function logTrainerChange(
  trainerId: string,
  studentId: string,
  changeType: string,
  description: string,
  entityId?: string
) {
  await supabase.from("trainer_changes").insert({
    trainer_id: trainerId,
    student_id: studentId,
    change_type: changeType,
    description,
    entity_id: entityId || null,
  });
}

export async function setRoutineNextChangeDate(trainerId: string, studentId: string, days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const dateStr = date.toISOString().split("T")[0];
  await supabase
    .from("trainer_students")
    .update({ routine_next_change_date: dateStr } as any)
    .eq("trainer_id", trainerId)
    .eq("student_id", studentId);
  return dateStr;
}
