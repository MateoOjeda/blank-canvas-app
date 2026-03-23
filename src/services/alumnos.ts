import { supabase } from "@/integrations/supabase/client";

export interface StudentProfile {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
  weight: number | null;
  age: number | null;
}

export interface LinkedStudent extends StudentProfile {
  linked_at: string;
  planEntrenamiento: string;
  planAlimentacion: string;
  linkId: string;
  paymentStatus: string;
}

export interface AvailableStudent {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
}

export async function fetchLinkedStudents(trainerId: string): Promise<LinkedStudent[]> {
  const { data: links } = await supabase
    .from("trainer_students")
    .select("id, student_id, created_at, payment_status, plan_entrenamiento, plan_alimentacion")
    .eq("trainer_id", trainerId);

  if (!links || links.length === 0) return [];

  const studentIds = links.map((l) => l.student_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_initials, avatar_url, weight, age")
    .in("user_id", studentIds);

  return (profiles || []).map((p: any) => {
    const link = links.find((l) => l.student_id === p.user_id);
    return {
      ...p,
      linked_at: link?.created_at || "",
      planEntrenamiento: link?.plan_entrenamiento || "inicial",
      planAlimentacion: link?.plan_alimentacion || "inicial",
      linkId: link?.id || "",
      paymentStatus: link?.payment_status || "pendiente",
    };
  });
}

export async function fetchAvailableStudents(trainerId: string): Promise<AvailableStudent[]> {
  const { data: links } = await supabase
    .from("trainer_students")
    .select("student_id")
    .eq("trainer_id", trainerId);

  const linkedIds = (links || []).map((l) => l.student_id);
  const excludeIds = [...linkedIds, trainerId];

  const { data: studentRoles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "student");

  const studentUserIds = (studentRoles || [])
    .map((r) => r.user_id)
    .filter((id) => !excludeIds.includes(id));

  if (studentUserIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_initials, avatar_url")
    .in("user_id", studentUserIds);

  return profiles || [];
}

export async function linkStudent(trainerId: string, studentId: string) {
  const { error } = await supabase
    .from("trainer_students")
    .insert({ trainer_id: trainerId, student_id: studentId });
  if (error) throw error;
}

export async function unlinkStudent(trainerId: string, studentId: string) {
  const { error } = await supabase
    .from("trainer_students")
    .delete()
    .eq("trainer_id", trainerId)
    .eq("student_id", studentId);
  if (error) throw error;
}

export async function deleteStudentPermanently(trainerId: string, studentId: string) {
  await Promise.all([
    supabase.from("exercise_logs").delete().eq("student_id", studentId).eq("trainer_id", trainerId),
    supabase.from("exercises").delete().eq("student_id", studentId).eq("trainer_id", trainerId),
    supabase.from("plan_levels").delete().eq("student_id", studentId).eq("trainer_id", trainerId),
    supabase.from("trainer_changes").delete().eq("student_id", studentId).eq("trainer_id", trainerId),
    supabase.from("routine_day_config").delete().eq("student_id", studentId).eq("trainer_id", trainerId),
  ]);
  const { error } = await supabase
    .from("trainer_students")
    .delete()
    .eq("trainer_id", trainerId)
    .eq("student_id", studentId);
  if (error) throw error;
}

export async function updatePaymentStatus(linkId: string, status: "pagado" | "pendiente") {
  const { error } = await supabase
    .from("trainer_students")
    .update({ payment_status: status })
    .eq("id", linkId);
  if (error) throw error;
}

export async function updatePlanLevel(
  linkId: string,
  field: "plan_entrenamiento" | "plan_alimentacion",
  value: string
) {
  const { error } = await supabase
    .from("trainer_students")
    .update({ [field]: value } as any)
    .eq("id", linkId);
  if (error) throw error;
}

export async function fetchStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_initials, avatar_url, weight, age")
    .eq("user_id", studentId)
    .maybeSingle();
  return data as StudentProfile | null;
}
