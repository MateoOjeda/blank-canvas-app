import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarCheck, Dumbbell, Flame, Loader2, ClipboardEdit, Save } from "lucide-react";
import { toast } from "sonner";
import DailyLogDialog from "@/components/student/DailyLogDialog";
import RestTimer from "@/components/student/RestTimer";
import ExerciseVideoButton from "@/components/student/ExerciseVideoButton";

type DayOfWeek = "Domingo" | "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado";

function getTodayDay(): DayOfWeek {
  const days: DayOfWeek[] = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return days[new Date().getDay()];
}

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  completed: boolean;
  trainer_id: string;
  body_part: string;
  is_to_failure: boolean;
}

export default function TodayRoutinePage() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [logExercise, setLogExercise] = useState<Exercise | null>(null);
  const [weightInputs, setWeightInputs] = useState<Record<string, string>>({});
  const [savingWeight, setSavingWeight] = useState<string | null>(null);
  const today = getTodayDay();

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("exercises")
      .select("id, name, sets, reps, weight, day, completed, trainer_id, body_part, is_to_failure")
      .eq("student_id", user.id)
      .eq("day", today) as any;
    const exercises = (data || []) as Exercise[];
    setExercises(exercises);
    
    const todayDate = new Date().toISOString().split("T")[0];
    const exerciseIds = exercises.map((e: Exercise) => e.id);
    if (exerciseIds.length > 0) {
      const { data: logs } = await supabase
        .from("exercise_logs")
        .select("exercise_id, actual_weight")
        .eq("student_id", user.id)
        .eq("log_date", todayDate)
        .in("exercise_id", exerciseIds);
      
      const weights: Record<string, string> = {};
      logs?.forEach((log) => {
        if (log.actual_weight !== null) {
          weights[log.exercise_id] = String(log.actual_weight);
        }
      });
      setWeightInputs(weights);
    }
    setLoading(false);
  }, [user, today]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("student-exercises")
      .on("postgres_changes", { event: "*", schema: "public", table: "exercises", filter: `student_id=eq.${user.id}` }, () => { fetchExercises(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchExercises]);

  const toggleComplete = async (exerciseId: string, current: boolean) => {
    const { error } = await supabase.from("exercises").update({ completed: !current }).eq("id", exerciseId);
    if (error) {
      toast.error("Error al actualizar");
    } else {
      setExercises((prev) => prev.map((e) => (e.id === exerciseId ? { ...e, completed: !current } : e)));
    }
  };

  const saveWeight = async (exercise: Exercise) => {
    if (!user) return;
    const weight = parseFloat(weightInputs[exercise.id] || "0");
    if (!weight || weight <= 0) {
      toast.error("Ingresa un peso válido");
      return;
    }
    setSavingWeight(exercise.id);
    const todayDate = new Date().toISOString().split("T")[0];
    
    const { error } = await supabase
      .from("exercise_logs")
      .upsert({
        exercise_id: exercise.id,
        student_id: user.id,
        trainer_id: exercise.trainer_id,
        log_date: todayDate,
        completed: true,
        actual_weight: weight,
        actual_sets: exercise.sets,
        actual_reps: exercise.is_to_failure ? null : exercise.reps,
      }, { onConflict: "exercise_id,log_date" });

    setSavingWeight(null);
    if (error) {
      toast.error("Error al guardar peso");
    } else {
      toast.success(`${exercise.name}: ${weight}kg guardado`);
    }
  };

  const completedCount = exercises.filter((e) => e.completed).length;
  const allDone = exercises.length > 0 && completedCount === exercises.length;

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  // Collect all unique body parts for the day header
  const allBodyParts = [...new Set(exercises.map((e) => e.body_part).filter(Boolean))];
  const dayHeader = allBodyParts.length > 0
    ? `${today.toUpperCase()} — ${allBodyParts.join(" · ").toUpperCase()}`
    : today.toUpperCase();

  // Group by body part
  const grouped: Record<string, Exercise[]> = {};
  exercises.forEach((ex) => {
    const key = ex.body_part || "General";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ex);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mi Rutina Hoy</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <Badge variant="outline" className="border-primary/40 text-primary text-xs font-bold">{dayHeader}</Badge>
          <span className="text-sm text-muted-foreground">{completedCount}/{exercises.length} completados</span>
        </div>
      </div>

      <RestTimer />

      {allDone && (
        <Card className="card-glass neon-border neon-glow">
          <CardContent className="p-6 text-center">
            <Flame className="h-12 w-12 text-primary mx-auto mb-2 animate-pulse" />
            <h2 className="text-xl font-display font-bold neon-text">¡Rutina Completada!</h2>
            <p className="text-sm text-muted-foreground mt-1">Excelente trabajo hoy 💪</p>
          </CardContent>
        </Card>
      )}

      {exercises.length === 0 ? (
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold">Día de descanso</h3>
            <p className="text-sm text-muted-foreground mt-1">No tienes ejercicios programados para hoy</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([bodyPart, exs]) => (
            <div key={bodyPart}>
              <Badge className="mb-2 bg-primary/20 text-primary border-0 text-xs">{bodyPart}</Badge>
              <div className="space-y-3">
                {exs.map((exercise) => (
                  <Card
                    key={exercise.id}
                    className={`card-glass transition-all duration-300 ${exercise.completed ? "neon-border opacity-70" : "hover:neon-border"}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-4">
                        <Checkbox
                          checked={exercise.completed}
                          onCheckedChange={() => toggleComplete(exercise.id, exercise.completed)}
                          className="h-6 w-6 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Dumbbell className={`h-5 w-5 ${exercise.completed ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold ${exercise.completed ? "line-through text-muted-foreground" : ""}`}>
                            {exercise.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {exercise.sets} series × {exercise.is_to_failure
                              ? <span className="text-amber-400 font-bold">AL FALLO 🔥</span>
                              : <span>{exercise.reps} reps</span>
                            }
                          </p>
                        </div>
                        <ExerciseVideoButton exerciseName={exercise.name} />
                        <Button
                          size="icon" variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => setLogExercise(exercise)}
                          title="Registrar desempeño detallado"
                        >
                          <ClipboardEdit className="h-4 w-4" />
                        </Button>
                        {exercise.completed && <Badge className="bg-primary/15 text-primary border-0 text-xs">Hecho</Badge>}
                      </div>
                      
                      {/* Weight input for student - always enabled even for "al fallo" */}
                      <div className="flex items-center gap-2 pl-10">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">Peso usado:</span>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="kg"
                          value={weightInputs[exercise.id] || ""}
                          onChange={(e) => setWeightInputs((prev) => ({ ...prev, [exercise.id]: e.target.value }))}
                          className="h-8 w-24 text-sm bg-secondary/50 border-border"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2"
                          onClick={() => saveWeight(exercise)}
                          disabled={savingWeight === exercise.id}
                        >
                          {savingWeight === exercise.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {logExercise && user && (
        <DailyLogDialog
          open={!!logExercise}
          onClose={() => { setLogExercise(null); fetchExercises(); }}
          exercise={logExercise}
          studentId={user.id}
          trainerId={logExercise.trainer_id}
        />
      )}
    </div>
  );
}
