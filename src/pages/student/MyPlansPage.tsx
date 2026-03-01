import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Dumbbell, TrendingUp, User, Lock, Unlock, Loader2, ClipboardList } from "lucide-react";

const PLAN_TYPES = [
  { key: "nutricion", label: "Nutrición", icon: Apple },
  { key: "entrenamiento", label: "Entrenamiento", icon: Dumbbell },
  { key: "cambios_fisicos", label: "Cambios Físicos", icon: TrendingUp },
  { key: "cambios_personales", label: "Personales", icon: User },
];

const LEVELS = ["principiante", "intermedio", "avanzado"];
const LEVEL_LABELS: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

interface PlanLevel {
  id: string;
  plan_type: string;
  level: string;
  content: string;
  unlocked: boolean;
}

export default function MyPlansPage() {
  const { user } = useAuth();
  const [planLevels, setPlanLevels] = useState<PlanLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlanLevels = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("plan_levels")
      .select("id, plan_type, level, content, unlocked")
      .eq("student_id", user.id);
    setPlanLevels(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchPlanLevels();
  }, [fetchPlanLevels]);

  // Realtime for plan level changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("student-plan-levels")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "plan_levels", filter: `student_id=eq.${user.id}` },
        () => { fetchPlanLevels(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchPlanLevels]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (planLevels.length === 0) {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Planes</h1>
        <p className="text-muted-foreground text-sm mt-1">Contenido desbloqueado por tu entrenador</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PLAN_TYPES.map((pt) => {
          const levels = planLevels.filter((p) => p.plan_type === pt.key);
          const unlockedCount = levels.filter((l) => l.unlocked).length;
          const Icon = pt.icon;
          return (
            <Card key={pt.key} className="card-glass">
              <CardContent className="p-4 text-center">
                <Icon className="h-5 w-5 text-primary mx-auto mb-1" />
                <p className="text-lg font-bold">{unlockedCount}/3</p>
                <p className="text-[10px] text-muted-foreground">{pt.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="nutricion" className="space-y-4">
        <TabsList className="bg-secondary/50 w-full justify-start overflow-x-auto">
          {PLAN_TYPES.map((pt) => (
            <TabsTrigger key={pt.key} value={pt.key} className="gap-2 text-xs">
              <pt.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{pt.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {PLAN_TYPES.map((pt) => (
          <TabsContent key={pt.key} value={pt.key} className="space-y-4">
            {LEVELS.map((level) => {
              const pl = planLevels.find((p) => p.plan_type === pt.key && p.level === level);
              if (!pl) return null;

              return (
                <Card
                  key={pl.id}
                  className={`card-glass transition-all ${pl.unlocked ? "neon-border" : "opacity-50"}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          pl.unlocked ? "bg-primary/15" : "bg-secondary"
                        }`}
                      >
                        {pl.unlocked ? (
                          <Unlock className="h-4 w-4 text-primary" />
                        ) : (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-sm">{LEVEL_LABELS[level]}</CardTitle>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            pl.unlocked
                              ? "border-primary/40 text-primary"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {pl.unlocked ? "Desbloqueado" : "Bloqueado"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {pl.unlocked ? (
                      pl.content ? (
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">
                          {pl.content}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Tu entrenador aún no ha agregado contenido para este nivel.
                        </p>
                      )
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="h-4 w-4" />
                        Nivel bloqueado por tu entrenador
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
