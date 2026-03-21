import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PlanCard from "@/components/student/PlanCard";
import PlanLevelDetail from "@/components/student/PlanLevelDetail";
import { PLAN_TYPES } from "@/lib/planConstants";

interface GlobalPlan {
  id: string;
  plan_type: string;
  level: string;
  price: number;
  content: string;
  active: boolean;
}

interface PlanLevel {
  id: string;
  plan_type: string;
  level: string;
  unlocked: boolean;
}

interface TrainerInfo {
  mercadopago_alias: string;
  whatsapp_number: string;
  display_name: string;
}

export default function MyPlansPage() {
  const { user } = useAuth();
  const [globalPlans, setGlobalPlans] = useState<GlobalPlan[]>([]);
  const [planLevels, setPlanLevels] = useState<PlanLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Get student's linked trainer
    const { data: links } = await supabase
      .from("trainer_students")
      .select("trainer_id")
      .eq("student_id", user.id)
      .limit(1);

    if (!links || links.length === 0) {
      setLoading(false);
      return;
    }

    const trainerId = links[0].trainer_id;

    const [globalRes, levelsRes, profileRes] = await Promise.all([
      supabase.from("global_plans").select("id, plan_type, level, price, content, active").eq("trainer_id", trainerId),
      supabase.from("plan_levels").select("id, plan_type, level, unlocked").eq("student_id", user.id).eq("trainer_id", trainerId),
      supabase.from("profiles").select("display_name, mercadopago_alias, whatsapp_number").eq("user_id", trainerId).maybeSingle(),
    ]);

    setGlobalPlans(globalRes.data || []);
    setPlanLevels(levelsRes.data || []);
    if (profileRes.data) setTrainerInfo(profileRes.data as TrainerInfo);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: listen for global_plans changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("student-global-plans")
      .on("postgres_changes", { event: "*", schema: "public", table: "global_plans" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_levels", filter: `student_id=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (globalPlans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Planes</h1>
          <p className="text-muted-foreground text-sm mt-1">Planes asignados por tu entrenador</p>
        </div>
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aún no tienes planes asignados. Tu entrenador los configurará pronto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Build merged plan levels with global plan data
  const mergedLevels = globalPlans.map((gp) => {
    const studentLevel = planLevels.find((pl) => pl.plan_type === gp.plan_type && pl.level === gp.level);
    return {
      id: gp.id,
      plan_type: gp.plan_type,
      level: gp.level,
      content: gp.content,
      unlocked: studentLevel?.unlocked ?? false,
      price: gp.price,
      active: gp.active,
    };
  });

  const activePlanType = PLAN_TYPES.find((pt) => pt.key === selectedPlan);

  if (activePlanType) {
    // Build trainerPrices map from global plans
    const trainerPrices: Record<string, number> = {};
    globalPlans.forEach((gp) => {
      trainerPrices[`${gp.plan_type}-${gp.level}`] = gp.price;
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Planes</h1>
          <p className="text-muted-foreground text-sm mt-1">Contenido desbloqueado por tu entrenador</p>
        </div>
        <PlanLevelDetail
          planType={activePlanType}
          planLevels={mergedLevels}
          trainerInfo={trainerInfo}
          trainerPrices={trainerPrices}
          onBack={() => setSelectedPlan(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Planes</h1>
        <p className="text-muted-foreground text-sm mt-1">Seleccioná un plan para ver los niveles disponibles</p>
      </div>
      <div className="space-y-3">
        {PLAN_TYPES.map((pt) => {
          const levels = mergedLevels.filter((p) => p.plan_type === pt.key && p.active);
          return (
            <PlanCard
              key={pt.key}
              label={pt.label}
              description={pt.description}
              icon={pt.icon}
              planLevels={levels}
              onClick={() => setSelectedPlan(pt.key)}
            />
          );
        })}
      </div>
    </div>
  );
}
