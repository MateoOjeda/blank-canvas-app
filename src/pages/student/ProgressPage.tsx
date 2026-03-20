import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
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
        .single(),
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-primary/40">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl font-display">
            {profile?.avatar_initials || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">
            {profile?.display_name || "Mi Progreso"}
          </h1>
          <p className="text-muted-foreground text-sm">Tu resumen de avance</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="card-glass">
          <CardContent className="p-4 text-center">
            <Dumbbell className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{totalExercises}</p>
            <p className="text-[10px] text-muted-foreground">Ejercicios asignados</p>
          </CardContent>
        </Card>
        <Card className="card-glass">
          <CardContent className="p-4 text-center">
            <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{completedToday}</p>
            <p className="text-[10px] text-muted-foreground">Completados</p>
          </CardContent>
        </Card>
        <Card className="card-glass">
          <CardContent className="p-4 text-center">
            <Weight className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{profile?.weight || "—"} kg</p>
            <p className="text-[10px] text-muted-foreground">Peso actual</p>
          </CardContent>
        </Card>
        <Card className="card-glass">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold">{unlockedCount}/12</p>
            <p className="text-[10px] text-muted-foreground">Niveles desbloqueados</p>
          </CardContent>
        </Card>
      </div>

      {/* Completion by day */}
      <Card className="card-glass">
        <CardHeader>
          <CardTitle className="text-base">Completitud por Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {dayStats.map((ds) => {
              const pct = ds.total > 0 ? Math.round((ds.done / ds.total) * 100) : 0;
              return (
                <div key={ds.day} className="text-center">
                  <div className="relative h-24 bg-secondary/30 rounded-lg overflow-hidden mb-1">
                    <div
                      className="absolute bottom-0 w-full bg-primary/30 rounded-b-lg transition-all"
                      style={{ height: `${pct}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full bg-primary rounded-b-lg transition-all"
                      style={{ height: `${ds.total > 0 ? (ds.done / ds.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{ds.day}</p>
                  <p className="text-[10px] font-medium">
                    {ds.done}/{ds.total}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Completion rate */}
      <Card className="card-glass neon-border">
        <CardContent className="p-6 text-center">
          <Target className="h-10 w-10 text-primary mx-auto mb-2" />
          <p className="text-3xl font-display font-bold neon-text">{completionRate}%</p>
          <p className="text-sm text-muted-foreground mt-1">Tasa de completitud global</p>
        </CardContent>
      </Card>
    </div>
  );
}
