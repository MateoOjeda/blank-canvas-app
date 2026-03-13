import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Loader2, CheckCircle, Dumbbell, Lock, Unlock } from "lucide-react";

interface Exercise {
  id: string;
  name: string;
  completed: boolean;
  day: string;
}

interface PlanLevel {
  plan_type: string;
  level: string;
  unlocked: boolean;
}

export default function TrackingPage() {
  const { user } = useAuth();
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [planLevels, setPlanLevels] = useState<PlanLevel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0].user_id);
    }
  }, [students, selectedStudent]);

  const fetchData = useCallback(async () => {
    if (!user || !selectedStudent) return;
    setLoading(true);
    const [exRes, plRes] = await Promise.all([
      supabase.from("exercises").select("id, name, completed, day").eq("trainer_id", user.id).eq("student_id", selectedStudent),
      supabase.from("plan_levels").select("plan_type, level, unlocked").eq("trainer_id", user.id).eq("student_id", selectedStudent),
    ]);
    setExercises(exRes.data || []);
    setPlanLevels(plRes.data || []);
    setLoading(false);
  }, [user, selectedStudent]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const completedCount = exercises.filter((e) => e.completed).length;
  const totalExercises = exercises.length;
  const completionRate = totalExercises > 0 ? Math.round((completedCount / totalExercises) * 100) : 0;
  const unlockedLevels = planLevels.filter((p) => p.unlocked).length;

  const student = students.find((s) => s.user_id === selectedStudent);

  if (loadingStudents) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Seguimiento</h1>
          <p className="text-muted-foreground text-sm mt-1">Progreso por alumno vinculado</p>
        </div>
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Vincula alumnos primero para ver su seguimiento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Seguimiento</h1>
        <p className="text-muted-foreground text-sm mt-1">Progreso por alumno vinculado</p>
      </div>

      <div className="max-w-xs">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Alumno</Label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue placeholder="Seleccionar alumno" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="card-glass neon-border">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold text-primary">{completionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">Completitud</p>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{completedCount}/{totalExercises}</p>
                <p className="text-xs text-muted-foreground mt-1">Ejercicios</p>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{unlockedLevels}/12</p>
                <p className="text-xs text-muted-foreground mt-1">Niveles desbloqueados</p>
              </CardContent>
            </Card>
            <Card className="card-glass">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-bold">{student?.age || "—"}</p>
                <p className="text-xs text-muted-foreground mt-1">Edad</p>
              </CardContent>
            </Card>
          </div>

          {/* Exercise Status */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Estado de Ejercicios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin ejercicios asignados</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exercises.map((ex) => (
                    <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                      <CheckCircle className={`h-4 w-4 ${ex.completed ? "text-primary" : "text-muted-foreground/30"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ex.name}</p>
                        <p className="text-[10px] text-muted-foreground">{ex.day}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${ex.completed ? "border-primary/40 text-primary" : "border-border"}`}>
                        {ex.completed ? "Hecho" : "Pendiente"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Levels Status */}
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Estado de Niveles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {["nutricion", "entrenamiento", "cambios_fisicos", "cambios_personales"].map((type) => {
                  const typeLevels = planLevels.filter((p) => p.plan_type === type);
                  const labels: Record<string, string> = {
                    nutricion: "Nutrición", entrenamiento: "Entrenamiento",
                    cambios_fisicos: "Cambios Físicos", cambios_personales: "Cambios Personales",
                  };
                  return (
                    <div key={type} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                      <p className="text-sm font-semibold">{labels[type]}</p>
                      <div className="flex gap-2">
                        {typeLevels.map((l) => (
                          <Badge
                            key={`${l.plan_type}-${l.level}`}
                            variant="outline"
                            className={`text-[10px] gap-1 ${l.unlocked ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
                          >
                            {l.unlocked ? <Unlock className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
                            {l.level.charAt(0).toUpperCase() + l.level.slice(1)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
