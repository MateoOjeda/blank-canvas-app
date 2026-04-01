import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarCheck, Dumbbell, Flame, Loader2, ClipboardEdit, Save, Plus } from "lucide-react";
import { toast } from "sonner";
import DailyLogDialog from "@/components/student/DailyLogDialog";
import RestTimer from "@/components/student/RestTimer";
import ExerciseVideoButton from "@/components/student/ExerciseVideoButton";
import { TakeSurveyDialog } from "@/components/student/TakeSurveyDialog";
import { fetchStudentPendingSurveys } from "@/services/surveys";
import { ClipboardList } from "lucide-react";

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

interface SetData {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

export default function TodayRoutinePage() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [logExercise, setLogExercise] = useState<Exercise | null>(null);
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});
  const [pendingSurveys, setPendingSurveys] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);
  const [groupName, setGroupName] = useState<string | null>(null);
  const today = getTodayDay();

  const fetchSurveys = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchStudentPendingSurveys(user.id);
      setPendingSurveys(data);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const sb = supabase;

    // Fetch individual exercises
    const { data: individualData } = await supabase
      .from("exercises")
      .select("id, name, sets, reps, weight, day, completed, trainer_id, body_part, is_to_failure")
      .eq("student_id", user.id)
      .eq("day", today);
    let allExercises = (individualData || []) as Exercise[];

    // Fetch group exercises: find groups this student belongs to
    const { data: memberships } = await sb
      .from("training_group_members")
      .select("group_id, training_groups(name)")
      .eq("student_id", user.id);

    if (memberships && memberships.length > 0) {
      const firstMembership = memberships[0] as any;
      if (firstMembership.training_groups?.name) {
        setGroupName(firstMembership.training_groups.name);
      }
      
      const groupIds = memberships.map((m: any) => m.group_id);
      const { data: groupExData } = await sb
        .from("group_exercises")
        .select("id, name, sets, reps, weight, day, body_part, is_to_failure, trainer_id")
        .in("group_id", groupIds)
        .eq("day", today);

      if (groupExData && groupExData.length > 0) {
        const groupExercises: Exercise[] = groupExData.map((ge: any) => ({
          ...ge,
          completed: false,
          trainer_id: ge.trainer_id || "",
        }));
        // Avoid duplicates by name+day
        const existingNames = new Set(allExercises.map((e) => `${e.name}-${e.day}`));
        const newGroupExs = groupExercises.filter((ge) => !existingNames.has(`${ge.name}-${ge.day}`));
        allExercises = [...allExercises, ...newGroupExs];
      }
    }

    setExercises(allExercises);
    
    const todayDate = new Date().toISOString().split("T")[0];
    const exerciseIds = allExercises.map((e: Exercise) => e.id);
    let weights: Record<string, string> = {};
    if (exerciseIds.length > 0) {
      const { data: logs } = await supabase
        .from("exercise_logs")
        .select("exercise_id, actual_weight")
        .eq("student_id", user.id)
        .eq("log_date", todayDate)
        .in("exercise_id", exerciseIds);
      
      logs?.forEach((log) => {
        if (log.actual_weight !== null) {
          weights[log.exercise_id] = String(log.actual_weight);
        }
      });
    }

    // Load from localStorage if present
    const savedStateStr = localStorage.getItem(`routine_sets_${user.id}_${todayDate}`);
    let savedState: Record<string, SetData[]> = {};
    if (savedStateStr) {
      try {
        savedState = JSON.parse(savedStateStr);
      } catch (e) {}
    }

    const newExerciseSets: Record<string, SetData[]> = {};
    allExercises.forEach((ex) => {
      if (savedState[ex.id]) {
         if (ex.completed && !savedState[ex.id].every(s => s.completed)) {
           newExerciseSets[ex.id] = savedState[ex.id].map(s => ({ ...s, completed: true }));
         } else {
           newExerciseSets[ex.id] = savedState[ex.id];
         }
      } else {
         const setsCount = ex.sets || 1;
         const defaultWeight = weights[ex.id] || ex.weight?.toString() || "";
         const sets: SetData[] = [];
         for (let i = 0; i < setsCount; i++) {
           sets.push({
             id: `${ex.id}-set-${i}`,
             weight: defaultWeight,
             reps: ex.reps?.toString() || "",
             completed: ex.completed,
           });
         }
         newExerciseSets[ex.id] = sets;
      }
    });

    setExerciseSets(newExerciseSets);
    localStorage.setItem(`routine_sets_${user.id}_${todayDate}`, JSON.stringify(newExerciseSets));

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

  const saveExerciseProgress = async (exerciseId: string, sets: SetData[], markCompleted: boolean) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise || !user) return;

    const maxWeight = Math.max(...sets.map(s => parseFloat(s.weight) || 0), 0);
    const currentSetsCount = sets.length;
    const todayDate = new Date().toISOString().split("T")[0];

    const { error: exError } = await supabase.from("exercises").update({ completed: markCompleted }).eq("id", exerciseId);
    if (exError) {
      toast.error("Error al actualizar la base de datos");
      return;
    }
   
    setExercises((prev) => prev.map((e) => (e.id === exerciseId ? { ...e, completed: markCompleted } : e)));

    if (markCompleted) {
      const { error: logError } = await supabase.from("exercise_logs").upsert({
        exercise_id: exercise.id,
        student_id: user.id,
        trainer_id: exercise.trainer_id,
        log_date: todayDate,
        completed: true,
        actual_weight: maxWeight > 0 ? maxWeight : null,
        actual_sets: currentSetsCount,
        actual_reps: exercise.is_to_failure ? null : exercise.reps,
      }, { onConflict: "exercise_id,log_date" });

      if (!logError) {
        toast.success(`${exercise.name} completado`);
      }
    }
  };

  const handleSetComplete = async (exerciseId: string, setId: string, completed: boolean) => {
    setExerciseSets((prev) => {
      const next = { ...prev };
      next[exerciseId] = next[exerciseId].map(s => s.id === setId ? { ...s, completed } : s);
      const todayDate = new Date().toISOString().split("T")[0];
      localStorage.setItem(`routine_sets_${user?.id}_${todayDate}`, JSON.stringify(next));
      
      const allCompleted = next[exerciseId].every(s => s.completed);
      const exercise = exercises.find(e => e.id === exerciseId);
      if (exercise && allCompleted && !exercise.completed) {
        saveExerciseProgress(exerciseId, next[exerciseId], true).catch(console.error);
      } else if (exercise && !allCompleted && exercise.completed) {
        saveExerciseProgress(exerciseId, next[exerciseId], false).catch(console.error);
      }
      return next;
    });
  };

  const handleSetChange = (exerciseId: string, setId: string, field: "weight"|"reps", value: string) => {
    setExerciseSets((prev) => {
      const next = { ...prev };
      next[exerciseId] = next[exerciseId].map(s => s.id === setId ? { ...s, [field]: value } : s);
      const todayDate = new Date().toISOString().split("T")[0];
      localStorage.setItem(`routine_sets_${user?.id}_${todayDate}`, JSON.stringify(next));
      return next;
    });
  };

  const handleAddSet = (exerciseId: string) => {
    setExerciseSets((prev) => {
      const next = { ...prev };
      const currentSets = next[exerciseId] || [];
      const lastSet = currentSets[currentSets.length - 1];
      next[exerciseId] = [...currentSets, {
        id: `${exerciseId}-set-${currentSets.length}-${Date.now()}`,
        weight: lastSet ? lastSet.weight : "",
        reps: lastSet ? lastSet.reps : "",
        completed: false
      }];
      const todayDate = new Date().toISOString().split("T")[0];
      localStorage.setItem(`routine_sets_${user?.id}_${todayDate}`, JSON.stringify(next));
      
      // Since we added a new (incomplete) set, if exercise was complete, uncomplete it
      const exercise = exercises.find(e => e.id === exerciseId);
      if (exercise && exercise.completed) {
        saveExerciseProgress(exerciseId, next[exerciseId], false).catch(console.error);
      }
      
      return next;
    });
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
    <div className="container-responsive space-y-8 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-display font-bold tracking-tight neon-text">Mi Rutina Hoy</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="outline" className="badge-info-tag text-[10px] font-bold py-1 px-3">
            {dayHeader}
          </Badge>
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {completedCount}/{exercises.length} <span className="opacity-60">Ejercicios</span>
            </span>
          </div>
          {groupName && (
            <Badge variant="outline" className="badge-accent-tag text-[10px]">
              Grupo: {groupName}
            </Badge>
          )}
        </div>
      </div>

      {pendingSurveys.length > 0 && (
        <div className="space-y-4">
          {pendingSurveys.map(asst => (
            <Card key={asst.id} className="card-premium border-primary/30 bg-primary/5 hover:border-primary/60 cursor-pointer overflow-hidden group" onClick={() => setActiveSurvey(asst)}>
              <CardContent className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-110 transition-transform">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight uppercase tracking-tight">{asst.survey?.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Encuesta pendiente de tu entrenador</p>
                  </div>
                </div>
                <Button className="btn-premium-primary h-10 px-6 shadow-primary/20" onClick={(e) => { e.stopPropagation(); setActiveSurvey(asst); }}>
                  Responder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RestTimer />

      {allDone && (
        <Card className="card-premium border-primary/40 bg-primary/10 neon-glow py-8">
          <CardContent className="p-0 text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary blur-2xl opacity-20 animate-pulse" />
              <Flame className="h-16 w-16 text-primary mx-auto relative animate-bounce" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-display font-bold neon-text uppercase tracking-tighter">¡Entrenamiento Finalizado!</h2>
              <p className="text-sm text-primary/80 font-medium">Has superado todos los desafíos de hoy. ¡A seguir así! 🔥</p>
            </div>
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
            <div key={bodyPart} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                <Badge variant="outline" className="badge-info-tag uppercase tracking-widest text-[9px] px-4 py-1">
                  {bodyPart}
                </Badge>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {exs.map((exercise) => (
                    <Card
                      key={exercise.id}
                      className={cn(
                        "card-premium transition-all duration-300 overflow-hidden flex flex-col",
                        exercise.completed ? "border-primary/40 opacity-80" : "hover:border-primary/30"
                      )}
                      id={`ex-${exercise.id}`}
                    >
                      <CardContent className="p-0 flex flex-col h-full">
                        {/* Header */}
                        <div className="bg-white/5 p-5 flex items-center justify-between border-b border-white/5">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                              exercise.completed ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"
                            )}>
                              <Dumbbell className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <h3 className={cn(
                                "font-bold text-base leading-tight truncate cursor-pointer hover:text-primary transition-colors",
                                exercise.completed && "text-primary/80"
                              )} onClick={() => setLogExercise(exercise)}>
                                {exercise.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                {exercise.is_to_failure && (
                                  <span className="text-[9px] font-black bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded uppercase tracking-tighter">
                                    Al fallo 🔥
                                  </span>
                                )}
                                {exercise.completed && (
                                  <span className="text-[9px] font-black bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded uppercase tracking-tighter">
                                    Listo
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ExerciseVideoButton exerciseName={exercise.name} />
                            <Button 
                              size="icon" variant="ghost" 
                              className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all" 
                              onClick={() => setLogExercise(exercise)}
                            >
                              <ClipboardEdit className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>

                        {/* Sets Table */}
                        <div className="p-5 flex-1">
                          <div className="grid grid-cols-[40px_1fr_1fr_50px] gap-3 px-2 mb-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-50">
                            <div className="text-center">SET</div>
                            <div className="text-center">KG</div>
                            <div className="text-center">REPS</div>
                            <div className="text-center">OK</div>
                          </div>

                          <div className="space-y-3">
                            {exerciseSets[exercise.id]?.map((set, idx) => (
                              <div 
                                key={set.id} 
                                className={cn(
                                  "grid grid-cols-[40px_1fr_1fr_50px] items-center gap-3 p-1.5 rounded-2xl transition-all duration-300 border",
                                  set.completed 
                                    ? "bg-primary/5 border-primary/30" 
                                    : "bg-white/5 border-white/5 hover:bg-white/10"
                                )}
                              >
                                <div className="text-xs font-black text-center text-muted-foreground/60">{idx + 1}</div>
                                <div>
                                  <Input 
                                    type="number" step="0.5" 
                                    className="input-premium h-10 w-full text-center text-sm font-bold border-none bg-transparent hover:bg-white/5 focus:bg-white/10" 
                                    value={set.weight} 
                                    onChange={(e) => handleSetChange(exercise.id, set.id, "weight", e.target.value)} 
                                    placeholder="-" 
                                  />
                                </div>
                                <div>
                                  <Input 
                                    type="number" 
                                    className="input-premium h-10 w-full text-center text-sm font-bold border-none bg-transparent hover:bg-white/5 focus:bg-white/10" 
                                    value={set.reps} 
                                    onChange={(e) => handleSetChange(exercise.id, set.id, "reps", e.target.value)} 
                                    placeholder="-" 
                                  />
                                </div>
                                <div className="flex justify-center">
                                  <Checkbox 
                                    checked={set.completed} 
                                    onCheckedChange={(c) => handleSetComplete(exercise.id, set.id, !!c)} 
                                    className="h-7 w-7 rounded-lg data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-transform active:scale-90" 
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 flex justify-center">
                            <Button 
                              variant="ghost" size="sm" 
                              className="btn-premium-outline h-10 px-6 rounded-full text-xs gap-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:text-primary hover:border-primary hover:border-solid transition-all" 
                              onClick={() => handleAddSet(exercise.id)}
                            >
                              <Plus className="h-4 w-4" /> Añadir serie
                            </Button>
                          </div>
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

      {activeSurvey && (
        <TakeSurveyDialog
          open={!!activeSurvey}
          onOpenChange={(v) => !v && setActiveSurvey(null)}
          surveyId={activeSurvey.survey_id}
          assignmentId={activeSurvey.id}
          onCompleted={() => {
            setActiveSurvey(null);
            fetchSurveys();
          }}
        />
      )}
    </div>
  );
}
