import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Target, Zap, Weight, TrendingUp, Dumbbell, Loader2 } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  completed: boolean;
  day: string;
}

interface Profile {
  display_name: string;
  avatar_initials: string | null;
  weight: number | null;
}

export default function ProgressPage() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: exercisesData }, { data: profileData }, { data: levelsData }] = await Promise.all([
      supabase
        .from("exercises")
        .select("id, name, completed, day")
        .eq("student_id", user.id),
      supabase
        .from("profiles")
        .select("display_name, avatar_initials, weight")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("plan_levels")
        .select("id")
        .eq("student_id", user.id)
        .eq("unlocked", true),
    ]);

    setExercises(exercisesData || []);
    setProfile(profileData);
    setUnlockedCount(levelsData?.length || 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const completedToday = exercises.filter((e) => e.completed).length;
  const totalExercises = exercises.length;
  const completionRate = totalExercises > 0 ? Math.round((completedToday / totalExercises) * 100) : 0;

  // Group exercises by day
  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const dayStats = days.map((day) => {
    const dayExercises = exercises.filter((e) => e.day === day);
    const done = dayExercises.filter((e) => e.completed).length;
    return { day: day.substring(0, 3), total: dayExercises.length, done };
  });

  return (
    <div className="container-responsive space-y-10 pb-24">
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary blur-xl opacity-20 animate-pulse" />
          <Avatar className="h-20 w-20 border-2 border-white/10 shadow-2xl relative">
            <AvatarFallback className="bg-primary/20 text-primary font-black text-2xl font-display uppercase tracking-widest">
              {profile?.avatar_initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-primary text-white h-6 w-6 rounded-lg flex items-center justify-center shadow-lg border border-white/20">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-display font-bold tracking-tighter neon-text uppercase leading-none">
            {profile?.display_name || "Mi Progreso"}
          </h1>
          <p className="text-xs text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">Resumen de desempeño</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ejercicios", value: totalExercises, sub: "Asignados", icon: Dumbbell, color: "text-blue-400" },
          { label: "Check-ins", value: completedToday, sub: "Completados", icon: Zap, color: "text-amber-400" },
          { label: "Peso", value: profile?.weight ? `${profile.weight} kg` : "—", sub: "Actual", icon: Weight, color: "text-emerald-400" },
          { label: "Nivel", value: `${unlockedCount}/12`, sub: "Evolución", icon: TrendingUp, color: "text-primary" }
        ].map((stat, i) => (
          <Card key={i} className="card-premium border-white/5 bg-white/5 group hover:bg-white/10 transition-all duration-300 overflow-hidden">
            <CardContent className="p-5 flex flex-col items-center justify-center text-center relative">
              <div className={cn("mb-3 p-3 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform duration-500", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-2xl font-black tracking-tighter uppercase">{stat.value}</p>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-50">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Completion by day */}
      <Card className="card-premium border-white/5 bg-white/5 overflow-hidden">
        <CardHeader className="pb-6 border-b border-white/5 bg-white/5">
          <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Consistencia Semanal
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-7 gap-3 sm:gap-6">
            {dayStats.map((ds) => {
              const pct = ds.total > 0 ? Math.round((ds.done / ds.total) * 100) : 0;
              return (
                <div key={ds.day} className="flex flex-col items-center gap-3 group">
                  <div className="relative w-full h-32 bg-white/5 rounded-2xl overflow-hidden shadow-inner border border-white/5">
                    <div
                      className="absolute bottom-0 w-full bg-primary/20 rounded-b-2xl transition-all duration-1000 ease-out"
                      style={{ height: `${pct}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full bg-primary rounded-b-2xl transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(var(--primary),0.5)]"
                      style={{ height: `${ds.total > 0 ? (ds.done / ds.total) * 100 : 0}%` }}
                    />
                    {pct === 100 && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 animate-bounce">
                        <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{ds.day}</p>
                    <p className={cn(
                      "text-[10px] font-bold mt-0.5",
                      ds.done === ds.total && ds.total > 0 ? "text-primary" : "text-muted-foreground/60"
                    )}>
                      {ds.done}/{ds.total}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Completion rate */}
      <Card className="card-premium border-primary/20 bg-primary/5 py-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 animate-pulse" />
        <CardContent className="p-0 text-center relative z-10 space-y-4">
          <div className="h-16 w-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto border border-primary/20 shadow-xl shadow-primary/10 rotate-12 group-hover:rotate-0 transition-transform duration-500">
            <Zap className="h-8 w-8 text-primary fill-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-5xl font-display font-black tracking-tighter text-white neon-text">{completionRate}%</p>
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] font-display">Tasa de Efectividad</p>
          </div>
          <p className="text-sm text-muted-foreground max-w-[200px] mx-auto font-medium leading-tight">
            {completionRate >= 80 ? "¡Estás en la zona elite! Mantén ese ritmo. 🏆" : "Cada repetición cuenta. ¡Sigue presionando! 💪"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
