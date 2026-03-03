import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Dumbbell, Flame, Loader2, ClipboardEdit } from "lucide-react";
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
}

export default function TodayRoutinePage() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [logExercise, setLogExercise] = useState<Exercise | null>(null);
  const today = getTodayDay();

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("exercises")
      .select("id, name, sets, reps, weight, day, completed, trainer_id")
      .eq("student_id", user.id)
      .eq("day", today);
    setExercises(data || []);
    setLoading(false);
  }, [user, today]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("student-exercises")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exercises", filter: `student_id=eq.${user.id}` },
        () => { fetchExercises(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchExercises]);

  const toggleComplete = async (exerciseId: string, current: boolean) => {
    const { error } = await supabase
      .from("exercises")
      .update({ completed: !current })
      .eq("id", exerciseId);
    if (error) {
      toast.error("Error al actualizar");
    } else {
      setExercises((prev) =>
        prev.map((e) => (e.id === exerciseId ? { ...e, completed: !current } : e))
      );
    }
  };

  const completedCount = exercises.filter((e) => e.completed).length;
  const allDone = exercises.length > 0 && completedCount === exercises.length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mi Rutina Hoy</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="border-primary/40 text-primary text-xs">{today}</Badge>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{exercises.length} completados
          </span>
        </div>
      </div>

      {/* Rest Timer */}
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
        <div className="space-y-3">
          {exercises.map((exercise) => (
            <Card
              key={exercise.id}
              className={`card-glass transition-all duration-300 ${
                exercise.completed ? "neon-border opacity-70" : "hover:neon-border"
              }`}
            >
              <CardContent className="p-4 flex items-center gap-4">
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
                    {exercise.sets} series × {exercise.reps} reps — {exercise.weight > 0 ? `${exercise.weight} kg` : "Sin peso"}
                  </p>
                </div>
                <ExerciseVideoButton exerciseName={exercise.name} />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => setLogExercise(exercise)}
                  title="Registrar desempeño"
                >
                  <ClipboardEdit className="h-4 w-4" />
                </Button>
                {exercise.completed && (
                  <Badge className="bg-primary/15 text-primary border-0 text-xs">Hecho</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {logExercise && user && (
        <DailyLogDialog
          open={!!logExercise}
          onClose={() => setLogExercise(null)}
          exercise={logExercise}
          studentId={user.id}
          trainerId={logExercise.trainer_id}
        />
      )}
    </div>
  );
}
