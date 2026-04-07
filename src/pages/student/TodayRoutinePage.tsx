import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  onSnapshot,
  orderBy,
  limit,
  Timestamp
} from "firebase/firestore";
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
  const [groupName, setGroupName] = useState<string | null>(null);
  const today = getTodayDay();

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const todayDate = new Date().toISOString().split("T")[0];
      // Read blocked state from localStorage
      const blockedStr = localStorage.getItem(`blocked_routines_${user.uid}`);
      const blocked = blockedStr ? JSON.parse(blockedStr) : { personal: false, group: false };

      // Fetch individual exercises (Personal Routine) IF NOT BLOCKED
      let individualExercises: Exercise[] = [];
      if (!blocked.personal) {
        const qInd = query(
          collection(db, "exercises"), 
          where("student_id", "==", user.uid),
          where("day", "==", today)
        );
        const snapInd = await getDocs(qInd);
        individualExercises = snapInd.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));
      }

      // Fetch group exercises IF NOT BLOCKED
      let groupExercises: Exercise[] = [];
      if (!blocked.group) {
        const qMem = query(collection(db, "training_group_members"), where("student_id", "==", user.uid));
        const snapMem = await getDocs(qMem);
        
        if (!snapMem.empty) {
          const memberships = snapMem.docs.map(d => d.data());
          const groupIds = memberships.map(m => m.group_id);
          
          // Get first group name for display
          const groupDoc = await getDoc(doc(db, "training_groups", groupIds[0]));
          if (groupDoc.exists()) {
            setGroupName((groupDoc.data() as any).name);
          }

          const qGrpEx = query(
            collection(db, "group_exercises"),
            where("day", "==", today),
            where("group_id", "in", groupIds)
          );
          const snapGrpEx = await getDocs(qGrpEx);
          groupExercises = snapGrpEx.docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            completed: false, // Group exercises start uncompleted for the day
            trainer_id: d.data().trainer_id || "",
            isGroup: true
          } as Exercise & { isGroup: boolean }));
        }
      } else {
        setGroupName(null);
      }

      const allExercises = [...individualExercises, ...groupExercises];
      setExercises(allExercises);

      // Fetch logs for today
      let weights: Record<string, string> = {};
      const completedLogIds = new Set<string>();
      if (allExercises.length > 0) {
        const qLogs = query(
          collection(db, "exercise_logs"),
          where("student_id", "==", user.uid),
          where("log_date", "==", todayDate)
        );
        const snapLogs = await getDocs(qLogs);
        snapLogs.forEach(d => {
          const data = d.data();
          if (data.actual_weight !== null) {
            weights[data.exercise_id] = String(data.actual_weight);
          }
          if (data.completed) {
            completedLogIds.add(data.exercise_id);
          }
        });
      }

      // Mark exercises as completed if there's a log for today
      allExercises.forEach(ex => {
        if (completedLogIds.has(ex.id)) {
          ex.completed = true;
        }
      });


      // Load from localStorage if present
      const savedStateStr = localStorage.getItem(`routine_sets_${user.uid}_${todayDate}`);
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
      localStorage.setItem(`routine_sets_${user.uid}_${todayDate}`, JSON.stringify(newExerciseSets));
    } catch (err) {
      console.error("Error fetching today exercises:", err);
    } finally {
      setLoading(false);
    }
  }, [user, today]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  useEffect(() => {
    if (!user) return;
    
    // Real-time listener for exercises
    const q = query(collection(db, "exercises"), where("student_id", "==", user.uid));
    const unsubscribe = onSnapshot(q, () => {
      fetchExercises();
    });

    window.addEventListener('storage', fetchExercises);
    return () => { 
      unsubscribe();
      window.removeEventListener('storage', fetchExercises);
    };
  }, [user, fetchExercises]);

  const saveExerciseProgress = async (exerciseId: string, sets: SetData[], markCompleted: boolean) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise || !user) return;

    try {
      const maxWeight = Math.max(...sets.map(s => parseFloat(s.weight) || 0), 0);
      const currentSetsCount = sets.length;
      const todayDate = new Date().toISOString().split("T")[0];

      const isGroup = (exercise as any).isGroup;
      
      if (!isGroup) {
        await updateDoc(doc(db, "exercises", exerciseId), { completed: markCompleted });
      }
     
      setExercises((prev) => prev.map((e) => (e.id === exerciseId ? { ...e, completed: markCompleted } : e)));

      if (markCompleted) {
        const logId = `${exercise.id}_${todayDate}`;
        await setDoc(doc(db, "exercise_logs", logId), {
          exercise_id: exercise.id,
          student_id: user.uid,
          trainer_id: exercise.trainer_id,
          log_date: todayDate,
          completed: true,
          actual_weight: maxWeight > 0 ? maxWeight : null,
          actual_sets: currentSetsCount,
          actual_reps: exercise.is_to_failure ? null : exercise.reps,
          created_at: new Date().toISOString()
        }, { merge: true });

        toast.success(`${exercise.name} completado`);
      }
    } catch (err) {
      console.error("Error saving exercise progress:", err);
      toast.error("Error al actualizar la base de datos");
    }
  };

  const handleSetComplete = async (exerciseId: string, setId: string, completed: boolean) => {
    setExerciseSets((prev) => {
      const next = { ...prev };
      next[exerciseId] = next[exerciseId].map(s => s.id === setId ? { ...s, completed } : s);
      const todayDate = new Date().toISOString().split("T")[0];
      localStorage.setItem(`routine_sets_${user?.uid}_${todayDate}`, JSON.stringify(next));
      
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
      localStorage.setItem(`routine_sets_${user?.uid}_${todayDate}`, JSON.stringify(next));
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
      localStorage.setItem(`routine_sets_${user?.uid}_${todayDate}`, JSON.stringify(next));
      
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
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const allBodyParts = [...new Set(exercises.map((e) => e.body_part).filter(Boolean))];
  const dayHeader = allBodyParts.length > 0
    ? `${today.toUpperCase()} — ${allBodyParts.join(" · ").toUpperCase()}`
    : today.toUpperCase();

  const grouped: Record<string, Exercise[]> = {};
  exercises.forEach((ex) => {
    const key = ex.body_part || "General";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ex);
  });

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 pb-32 animate-in fade-in duration-750">
      {/* HEADER SECTION */}
      <div className="mb-10 text-center sm:text-left relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-3 relative z-10">
          <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter uppercase italic leading-none">
            Rutina <span className="text-primary italic-none tracking-normal">Hoy</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full w-fit mx-auto sm:mx-0">
            <Dumbbell className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{dayHeader}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-4">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/40 rounded-full border border-border/40 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              {completedCount}/{exercises.length} <span className="opacity-60">Ejercicios</span>
            </span>
          </div>
          {groupName && (
            <Badge variant="outline" className="rounded-full text-[10px] font-black uppercase tracking-widest border-accent/20 text-accent bg-accent/5 px-4 py-1.5 shadow-sm">
              Grupo: {groupName}
            </Badge>
          )}
        </div>
      </div>

      <RestTimer />

      {allDone && (
        <Card className="card-premium border-primary/20 bg-primary/5 rounded-[3rem] py-12 relative overflow-hidden shadow-2xl shadow-primary/10 mb-10">
          <div className="absolute inset-0 bg-primary/5 animate-pulse" />
          <CardContent className="p-0 text-center relative z-10 space-y-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary blur-3xl opacity-20" />
              <div className="h-20 w-20 bg-primary/20 rounded-[2.5rem] flex items-center justify-center mx-auto border-2 border-primary/30 shadow-2xl shadow-primary/20 animate-bounce">
                <Flame className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-4xl font-display font-black tracking-tight uppercase leading-none italic">¡Entrenamiento Finalizado!</h2>
              <p className="text-primary font-black text-[10px] uppercase tracking-[0.4em]">Felicidades por tu disciplina</p>
            </div>
            <p className="text-sm text-muted-foreground max-w-[300px] mx-auto font-medium leading-relaxed italic">
              Has superado todos los desafíos de hoy. Tu consistencia es la clave del éxito. ¡A seguir rompiéndola! 🔥
            </p>
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
                        "card-premium border-border/40 bg-card transition-all duration-500 rounded-[2.5rem] overflow-hidden flex flex-col hover:scale-[1.02] shadow-xl",
                        exercise.completed ? "border-primary/40 bg-primary/5 opacity-90 shadow-primary/5" : "hover:border-primary/20 hover:bg-card/90"
                      )}
                      id={`ex-${exercise.id}`}
                    >
                      <CardContent className="p-0 flex flex-col h-full">
                        {/* Header */}
                        <div className="bg-muted/40 p-5 flex items-center justify-between border-b border-border/40">
                          <div className="flex items-center gap-4 min-w-0">
                            <div className={cn(
                              "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                              exercise.completed ? "bg-primary/20 text-primary" : "bg-muted/50 text-muted-foreground"
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
                                    : "bg-muted/20 border-border/30 hover:bg-muted/40"
                                )}
                              >
                                <div className="text-xs font-black text-center text-muted-foreground/80">{idx + 1}</div>
                                <div>
                                  <Input 
                                    type="number" step="0.5" 
                                    className="input-premium h-10 w-full text-center text-sm font-bold border-none bg-transparent hover:bg-muted/40 focus:bg-muted/60" 
                                    value={set.weight} 
                                    onChange={(e) => handleSetChange(exercise.id, set.id, "weight", e.target.value)} 
                                    placeholder="-" 
                                  />
                                </div>
                                <div>
                                  <Input 
                                    type="number" 
                                    className="input-premium h-10 w-full text-center text-sm font-bold border-none bg-transparent hover:bg-muted/40 focus:bg-muted/60" 
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
          studentId={user.uid}
          trainerId={logExercise.trainer_id}
        />
      )}

    </div>
  );
}

// Helper function to get doc
async function getDoc(docRef: any) {
  const { getDoc } = await import("firebase/firestore");
  return getDoc(docRef);
}
