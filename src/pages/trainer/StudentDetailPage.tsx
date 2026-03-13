import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, CheckCircle, Lock, Unlock, Apple, TrendingUp, User, Loader2, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalDiagnosticTab from "@/components/trainer/PersonalDiagnosticTab";
import ExerciseHistoryTab from "@/components/trainer/ExerciseHistoryTab";
import WeightProgressChart from "@/components/trainer/WeightProgressChart";

interface StudentProfile {
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
  weight: number | null;
  age: number | null;
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  completed: boolean;
}

interface PlanLevel {
  plan_type: string;
  level: string;
  content: string;
  unlocked: boolean;
}

const PLAN_LABELS: Record<string, string> = {
  nutricion: "Nutrición", entrenamiento: "Entrenamiento",
  cambios_fisicos: "Cambios Físicos", cambios_personales: "Cambios Personales",
};
const PLAN_ICONS: Record<string, React.ElementType> = {
  nutricion: Apple, entrenamiento: Dumbbell, cambios_fisicos: TrendingUp, cambios_personales: User,
};
const LEVEL_LABELS: Record<string, string> = {
  principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado",
};

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [planLevels, setPlanLevels] = useState<PlanLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);
    const [profRes, exRes, plRes] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_initials, avatar_url, weight, age").eq("user_id", studentId).single(),
      supabase.from("exercises").select("id, name, sets, reps, weight, day, completed").eq("trainer_id", user.id).eq("student_id", studentId),
      supabase.from("plan_levels").select("plan_type, level, content, unlocked").eq("trainer_id", user.id).eq("student_id", studentId),
    ]);
    setProfile(profRes.data as StudentProfile | null);
    setExercises(exRes.data || []);
    setPlanLevels(plRes.data || []);
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/trainer/students")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
        <p className="text-muted-foreground text-center">Alumno no encontrado</p>
      </div>
    );
  }

  const completedCount = exercises.filter((e) => e.completed).length;
  const totalExercises = exercises.length;
  const completionRate = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
  const unlockedLevels = planLevels.filter((p) => p.unlocked).length;
  const planTypes = ["nutricion", "entrenamiento", "cambios_fisicos", "cambios_personales"];

  const getHighestLevel = (type: string): string => {
    const levels = planLevels.filter((p) => p.plan_type === type && p.unlocked);
    if (levels.find((l) => l.level === "avanzado")) return "Avanzado";
    if (levels.find((l) => l.level === "intermedio")) return "Intermedio";
    if (levels.find((l) => l.level === "principiante")) return "Principiante";
    return "Bloqueado";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/trainer/students")}><ArrowLeft className="h-5 w-5" /></Button>
        <Avatar className="h-14 w-14 border-2 border-primary/30">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
            {profile.avatar_initials || profile.display_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">{profile.display_name}</h1>
          <p className="text-sm text-muted-foreground">Perfil de avance detallado</p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="card-glass neon-border"><CardContent className="p-4 text-center"><p className="text-3xl font-bold text-primary">{completionRate}%</p><p className="text-xs text-muted-foreground mt-1">Completitud</p></CardContent></Card>
        <Card className="card-glass"><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{completedCount}/{totalExercises}</p><p className="text-xs text-muted-foreground mt-1">Ejercicios</p></CardContent></Card>
        <Card className="card-glass"><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{unlockedLevels}/12</p><p className="text-xs text-muted-foreground mt-1">Niveles</p></CardContent></Card>
        <Card className="card-glass"><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{profile.age || "—"}</p><p className="text-xs text-muted-foreground mt-1">Edad</p></CardContent></Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="w-full grid grid-cols-5 bg-secondary/50">
          <TabsTrigger value="history" className="text-xs">📋 Historial</TabsTrigger>
          <TabsTrigger value="weight" className="text-xs">📈 Peso</TabsTrigger>
          <TabsTrigger value="plans" className="text-xs">Planes</TabsTrigger>
          <TabsTrigger value="routine" className="text-xs">Rutina</TabsTrigger>
          <TabsTrigger value="diagnostic" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />Diag.</TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          {studentId && <ExerciseHistoryTab studentId={studentId} />}
        </TabsContent>

        <TabsContent value="weight">
          {studentId && <WeightProgressChart studentId={studentId} />}
        </TabsContent>

        <TabsContent value="plans">
          <Card className="card-glass">
            <CardHeader><CardTitle className="text-lg">Planes y Niveles</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {planTypes.map((type) => {
                const Icon = PLAN_ICONS[type];
                const typeLevels = planLevels.filter((p) => p.plan_type === type);
                return (
                  <div key={type} className="p-4 rounded-lg bg-secondary/30 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center"><Icon className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1"><p className="text-sm font-semibold">{PLAN_LABELS[type]}</p><p className="text-[10px] text-muted-foreground">Nivel más alto: {getHighestLevel(type)}</p></div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {typeLevels.map((l) => (
                        <Badge key={`${l.plan_type}-${l.level}`} variant="outline" className={`text-[10px] gap-1 ${l.unlocked ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
                          {l.unlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                          {LEVEL_LABELS[l.level]}
                        </Badge>
                      ))}
                    </div>
                    {typeLevels.filter((l) => l.unlocked && l.content).map((l) => (
                      <div key={`${l.plan_type}-${l.level}-content`} className="text-xs text-muted-foreground bg-background/50 p-3 rounded-md">
                        <span className="font-medium text-foreground">{LEVEL_LABELS[l.level]}:</span> {l.content.length > 150 ? l.content.slice(0, 150) + "..." : l.content}
                      </div>
                    ))}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routine">
          <Card className="card-glass">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" />Rutina Actual</CardTitle></CardHeader>
            <CardContent>
              {exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin ejercicios asignados</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <CheckCircle className={`h-4 w-4 flex-shrink-0 ${ex.completed ? "text-primary" : "text-muted-foreground/30"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ex.name}</p>
                        <p className="text-[10px] text-muted-foreground">{ex.day} · {ex.sets}×{ex.reps} · {ex.weight}kg</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${ex.completed ? "border-primary/40 text-primary" : "border-border"}`}>
                        {ex.completed ? "✓" : "—"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostic">
          {studentId && <PersonalDiagnosticTab studentId={studentId} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
