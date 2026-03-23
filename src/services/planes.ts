import { supabase } from "@/integrations/supabase/client";
import { LEVELS, DEFAULT_PRICES } from "@/lib/planConstants";

export interface GlobalPlan {
  id: string;
  plan_type: string;
  level: string;
  price: number;
  content: string;
  active: boolean;
}

const PLAN_TYPES_CONFIG = [
  { key: "nutricion" },
  { key: "entrenamiento" },
] as const;

export async function fetchGlobalPlans(trainerId: string): Promise<{ plans: GlobalPlan[]; cambioFisico: GlobalPlan | null }> {
  const { data } = await supabase
    .from("global_plans")
    .select("id, plan_type, level, price, content, active")
    .eq("trainer_id", trainerId);

  let existing = data || [];

  const missing: any[] = [];
  for (const pt of PLAN_TYPES_CONFIG) {
    for (const level of LEVELS) {
      if (!existing.find((e) => e.plan_type === pt.key && e.level === level)) {
        missing.push({
          trainer_id: trainerId,
          plan_type: pt.key,
          level,
          price: DEFAULT_PRICES[level],
          content: "",
          active: true,
        });
      }
    }
  }
  if (!existing.find((e) => e.plan_type === "cambios_fisicos")) {
    missing.push({
      trainer_id: trainerId,
      plan_type: "cambios_fisicos",
      level: "unico",
      price: 0,
      content: "",
      active: true,
    });
  }

  if (missing.length > 0) {
    const { data: inserted } = await supabase
      .from("global_plans")
      .insert(missing)
      .select("id, plan_type, level, price, content, active");
    if (inserted) existing = [...existing, ...inserted];
  }

  return {
    plans: existing.filter((e) => e.plan_type !== "cambios_fisicos"),
    cambioFisico: existing.find((e) => e.plan_type === "cambios_fisicos") || null,
  };
}

export async function saveGlobalPlan(plan: GlobalPlan) {
  const { error } = await supabase
    .from("global_plans")
    .update({ price: plan.price, content: plan.content, active: plan.active })
    .eq("id", plan.id);
  if (error) throw error;
}

export async function toggleGlobalPlanActive(id: string, active: boolean) {
  const { error } = await supabase
    .from("global_plans")
    .update({ active })
    .eq("id", id);
  if (error) throw error;
}

export async function updatePlanAssignment(
  trainerId: string,
  studentId: string,
  planType: string,
  level: string
) {
  // Deactivate all levels for this plan type
  await supabase
    .from("plan_levels")
    .update({ unlocked: false })
    .eq("trainer_id", trainerId)
    .eq("student_id", studentId)
    .eq("plan_type", planType);

  if (level !== "none") {
    const { data: existing } = await supabase
      .from("plan_levels")
      .select("id")
      .eq("trainer_id", trainerId)
      .eq("student_id", studentId)
      .eq("plan_type", planType)
      .eq("level", level)
      .maybeSingle();

    if (existing) {
      await supabase.from("plan_levels").update({ unlocked: true }).eq("id", existing.id);
    } else {
      await supabase.from("plan_levels").insert({
        trainer_id: trainerId,
        student_id: studentId,
        plan_type: planType,
        level,
        unlocked: true,
        content: "",
      });
    }
  }

  // Update trainer_students shortcut fields
  const updateField = planType === "entrenamiento" ? "plan_entrenamiento" : "plan_alimentacion";
  await supabase
    .from("trainer_students")
    .update({ [updateField]: level === "none" ? null : level } as any)
    .eq("trainer_id", trainerId)
    .eq("student_id", studentId);
}
