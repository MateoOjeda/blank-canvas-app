import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PlanCard from "@/components/student/PlanCard";
import PlanLevelDetail from "@/components/student/PlanLevelDetail";
import { PLAN_TYPES } from "@/lib/planConstants";

interface PlanLevel {
  id: string;
  plan_type: string;
  level: string;
  content: string;
  unlocked: boolean;
}

interface TrainerInfo {
  mercadopago_alias: string;
  whatsapp_number: string;
  display_name: string;
}

export default function MyPlansPage() {
  const { user } = useAuth();
  const [planLevels, setPlanLevels] = useState<PlanLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);
  const [trainerPrices, setTrainerPrices] = useState<Record<string, number>>({});
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const fetchPlanLevels = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("plan_levels").select("id, plan_type, level, content, unlocked").eq("student_id", user.id);
    setPlanLevels(data || []);

    const { data: links } = await supabase.from("trainer_students").select("trainer_id").eq("student_id", user.id).limit(1);
    if (links && links.length > 0) {
      const trainerId = links[0].trainer_id;
      const [profileRes, pricesRes] = await Promise.all([
        supabase.from("profiles").select("display_name, mercadopago_alias, whatsapp_number").eq("user_id", trainerId).single(),
        supabase.from("plan_prices").select("plan_type, level, price").eq("trainer_id", trainerId),
      ]);
      if (profileRes.data) setTrainerInfo(profileRes.data as TrainerInfo);
      if (pricesRes.data) {
        const priceMap: Record<string, number> = {};
        pricesRes.data.forEach((p: any) => { priceMap[`${p.plan_type}-${p.level}`] = p.price; });
        setTrainerPrices(priceMap);
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPlanLevels(); }, [fetchPlanLevels]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("student-plan-levels")
      .on("postgres_changes", { event: "*", schema: "public", table: "plan_levels", filter: `student_id=eq.${user.id}` }, () => fetchPlanLevels())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPlanLevels]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (planLevels.length === 0) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Planes</h1><p className="text-muted-foreground text-sm mt-1">Planes asignados por tu entrenador</p></div>
        <Card className="card-glass"><CardContent className="p-8 text-center"><ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Aún no tienes planes asignados. Tu entrenador los configurará pronto.</p></CardContent></Card>
      </div>
    );
  }

  const activePlanType = PLAN_TYPES.find((pt) => pt.key === selectedPlan);

  if (activePlanType) {
    return (
      <div className="space-y-6">
        <div><h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Planes</h1><p className="text-muted-foreground text-sm mt-1">Contenido desbloqueado por tu entrenador</p></div>
        <PlanLevelDetail planType={activePlanType} planLevels={planLevels} trainerInfo={trainerInfo} trainerPrices={trainerPrices} onBack={() => setSelectedPlan(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Planes</h1><p className="text-muted-foreground text-sm mt-1">Seleccioná un plan para ver los niveles disponibles</p></div>
      <div className="space-y-3">
        {PLAN_TYPES.map((pt) => {
          const levels = planLevels.filter((p) => p.plan_type === pt.key);
          const unlockedCount = levels.filter((l) => l.unlocked).length;
          return <PlanCard key={pt.key} label={pt.label} description={pt.description} icon={pt.icon} unlockedCount={unlockedCount} totalLevels={3} onClick={() => setSelectedPlan(pt.key)} />;
        })}
      </div>
    </div>
  );
}
