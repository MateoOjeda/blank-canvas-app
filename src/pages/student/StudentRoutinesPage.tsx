import { useState, useEffect, useCallback, useMemo } from "react";
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
} from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStudentDashboard } from "@/hooks/useStudentDashboard";
import { useStudentRoutines } from "@/hooks/useStudentRoutines";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dumbbell, CheckCircle, Users, Loader2, ClipboardEdit, Plus, Flame, CalendarCheck
} from "lucide-react";
import { toast } from "sonner";
import DailyLogDialog from "@/components/student/DailyLogDialog";
import RestTimer from "@/components/student/RestTimer";
import ExerciseVideoButton from "@/components/student/ExerciseVideoButton";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  completed: boolean;
  trainer_id: string;
  body_part?: string;
  is_to_failure?: boolean;
  isGroup?: boolean;
}

interface SetData {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

function getTodayDay(): string {
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  return days[new Date().getDay()];
}

export default function StudentRoutinesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const today = getTodayDay();
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [activeTab, setActiveTab] = useState<string>("personal");
  
  const [exerciseSets, setExerciseSets] = useState<Record<string, SetData[]>>({});
  const [logExercise, setLogExercise] = useState<Exercise | null>(null);

  // Fetch student dashboard data to retrieve trainer_id
  const { studentData } = useStudentDashboard(user?.uid);
  const trainerId = studentData?.trainer_id;

  // Fetch personal exercises via useStudentRoutines hook
  const {
    exercises: personalExercises,
    isLoading: isLoadingPersonal,
  } = useStudentRoutines(trainerId, user?.uid);

  // Fetch group membership
  const groupMembershipQuery = useQuery({
    queryKey: ["groupMembership", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const qMem = query(collection(db, "training_group_members"), where("student_id", "==", user.uid));
      const snapMem = await getDocs(qMem);
      if (snapMem.empty) return null;
      return snapMem.docs[0].data();
    },
    enabled: !!user?.uid,
  });

  const groupId = groupMembershipQuery.data?.group_id;
  const hasGroupRoutine = !!groupId;

  // Sync activeTab based on group membership (group routine takes priority)
  useEffect(() => {
    if (hasGroupRoutine) {
      setActiveTab("group");
    } else {
      setActiveTab("personal");
    }
  }, [hasGroupRoutine]);

  // Fetch group exercises
  const groupExercisesQuery = useQuery({
    queryKey: ["groupExercises", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const qGrpEx = query(collection(db, "group_exercises"), where("group_id", "==", groupId));
      const snapGrpEx = await getDocs(qGrpEx);
      return snapGrpEx.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        completed: false,
        trainer_id: d.data().trainer_id || "",
        isGroup: true 
      } as Exercise));
    },
    enabled: !!groupId,
  });

  const todayDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Fetch today's logs to mark completions
  const exerciseLogsQuery = useQuery({
    queryKey: ["exerciseLogs", user?.uid, todayDate],
    queryFn: async () => {
      if (!user) return [];
      const qLogs = query(
        collection(db, "exercise_logs"),
        where("student_id", "==", user.uid),
        where("log_date", "==", todayDate)
      );
      const snapLogs = await getDocs(qLogs);
      return snapLogs.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!user?.uid,
  });

  // Derived state: personal exercises with completed flag
  const exercises = useMemo(() => {
    const rawExercises = personalExercises || [];
    const logs = exerciseLogsQuery.data || [];
    const completedLogIds = new Set(logs.filter((l: any) => l.completed).map((l: any) => l.exercise_id));
    return rawExercises.map((ex: any) => {
      if (ex.day === today && completedLogIds.has(ex.id)) {
        return { ...ex, completed: true };
      }
      return ex;
    });
  }, [personalExercises, exerciseLogsQuery.data, today]);

  // Derived state: group exercises with completed flag
  const groupExercises = useMemo(() => {
    const rawGroupExercises = groupExercisesQuery.data || [];
    const logs = exerciseLogsQuery.data || [];
    const completedLogIds = new Set(logs.filter((l: any) => l.completed).map((l: any) => l.exercise_id));
    return rawGroupExercises.map((ex: any) => {
      if (ex.day === today && completedLogIds.has(ex.id)) {
        return { ...ex, completed: true };
      }
      return ex;
    });
  }, [groupExercisesQuery.data, exerciseLogsQuery.data, today]);

  // Sync set states (initialized from logs + localstorage cache)
  useEffect(() => {
    if (exerciseLogsQuery.isSuccess && (personalExercises.length > 0 || groupExercisesQuery.isSuccess)) {
      const allExs = [...(personalExercises || []), ...(groupExercisesQuery.data || [])];
      if (allExs.length === 0) return;
      
      const savedStateStr = localStorage.getItem(`routine_sets_${user?.uid}_${todayDate}`);
      let savedState: Record<string, SetData[]> = {};
      if (savedStateStr) {
        try {
          savedState = JSON.parse(savedStateStr);
        } catch (e) {}
      }

      const logs = exerciseLogsQuery.data || [];
      const weights: Record<string, string> = {};
      const completedLogIds = new Set<string>();
      logs.forEach((log: any) => {
        if (log.actual_weight !== null) {
          weights[log.exercise_id] = String(log.actual_weight);
        }
        if (log.completed) {
          completedLogIds.add(log.exercise_id);
        }
      });

      const newExerciseSets: Record<string, SetData[]> = {};
      allExs.forEach((ex) => {
        const isCompleted = ex.day === today && completedLogIds.has(ex.id);
        if (savedState[ex.id]) {
          if (isCompleted && !savedState[ex.id].every(s => s.completed)) {
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
              completed: isCompleted,
            });
          }
          newExerciseSets[ex.id] = sets;
        }
      });

      setExerciseSets(newExerciseSets);
    }
  }, [exerciseLogsQuery.isSuccess, exerciseLogsQuery.data, personalExercises, groupExercisesQuery.data, groupExercisesQuery.isSuccess, user?.uid, today, todayDate]);

  // Listen to window storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = () => {
      exerciseLogsQuery.refetch();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => { 
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [exerciseLogsQuery]);

  const updateExerciseMutation = useMutation({
    mutationFn: async ({ exerciseId, completed }: { exerciseId: string; completed: boolean }) => {
      await updateDoc(doc(db, "exercises", exerciseId), { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, user?.uid] });
    }
  });

  const saveLogMutation = useMutation({
    mutationFn: async ({ logId, logPayload }: { logId: string; logPayload: any }) => {
      await setDoc(doc(doc(db, "exercise_logs", logId).parent, logId), logPayload, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exerciseLogs", user?.uid, todayDate] });
    }
  });

  const saveExerciseProgress = async (exerciseId: string, sets: SetData[], markCompleted: boolean) => {
    const isGroup = groupExercises.some(e => e.id === exerciseId);
    const exercise = isGroup ? groupExercises.find(e => e.id === exerciseId) : exercises.find(e => e.id === exerciseId);
    
    if (!exercise || !user) return;

    try {
      const maxWeight = Math.max(...sets.map(s => parseFloat(s.weight) || 0), 0);
      const currentSetsCount = sets.length;
      
      if (!isGroup) {
        await updateExerciseMutation.mutateAsync({ exerciseId, completed: markCompleted });
      } else {
        queryClient.invalidateQueries({ queryKey: ["groupExercises", groupId] });
      }

      const logId = `${exercise.id}_${todayDate}`;
      if (markCompleted) {
        await saveLogMutation.mutateAsync({
          logId,
          logPayload: {
            exercise_id: exercise.id,
            student_id: user.uid,
            trainer_id: exercise.trainer_id || "",
            log_date: todayDate,
            completed: true,
            actual_weight: maxWeight > 0 ? maxWeight : null,
            actual_sets: currentSetsCount,
            actual_reps: exercise.is_to_failure ? null : exercise.reps,
            created_at: new Date().toISOString()
          }
        });

        toast.success(`${exercise.name} completado`);
      } else {
        await saveLogMutation.mutateAsync({
          logId,
          logPayload: {
            completed: false
          }
        });
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
      
      const isGroup = groupExercises.some(e => e.id === exerciseId);
      const exercise = isGroup ? groupExercises.find(e => e.id === exerciseId) : exercises.find(e => e.id === exerciseId);
      
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
      
      const isGroup = groupExercises.some(e => e.id === exerciseId);
      const exercise = isGroup ? groupExercises.find(e => e.id === exerciseId) : exercises.find(e => e.id === exerciseId);
      
      if (exercise && exercise.completed) {
        saveExerciseProgress(exerciseId, next[exerciseId], false).catch(console.error);
      }
      
      return next;
    });
  };

  const loading = isLoadingPersonal || groupMembershipQuery.isLoading || groupExercisesQuery.isLoading || exerciseLogsQuery.isLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const currentPersonalExs = exercises.filter(e => e.day === selectedDay);
  const currentGroupExs = groupExercises.filter(e => e.day === selectedDay);
  
  const allPersonalCompleted = currentPersonalExs.length > 0 && currentPersonalExs.every(e => e.completed);
  const allGroupCompleted = currentGroupExs.length > 0 && currentGroupExs.every(e => e.completed);

  const renderExercises = (exs: Exercise[], isGroup: boolean) => {
    if (exs.length === 0) {
      return (
        <Card className="border border-border/40 bg-card/60 shadow-sm">
          <CardContent className="p-8 text-center flex flex-col items-center">
            <CalendarCheck className="h-10 w-10 text-muted-foreground/30 mb-2.5" />
            <h3 className="text-sm font-semibold text-foreground">Día de descanso</h3>
            <p className="text-xs text-muted-foreground mt-1">No tienes ejercicios programados para el {selectedDay.toLowerCase()}</p>
          </CardContent>
        </Card>
      );
    }

    // Group by body part
    const grouped: Record<string, Exercise[]> = {};
    exs.forEach((ex) => {
      const key = ex.body_part || "General";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ex);
    });

    return (
      <div className="space-y-6">
        {Object.entries(grouped).map(([bodyPart, partExs]) => (
          <div key={bodyPart} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{bodyPart}</span>
              <div className="h-[1px] flex-1 bg-border/50" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partExs.map((exercise) => {
                return (
                  <Card
                    key={exercise.id}
                    className={cn(
                      "border bg-card transition-all duration-200 rounded-xl overflow-hidden flex flex-col shadow-sm",
                      exercise.completed 
                        ? (isGroup ? "border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-500/10" : "border-primary/25 bg-primary/5 dark:bg-primary/10") 
                        : "border-border/50 hover:border-border/80 hover:shadow-md"
                    )}
                  >
                    <CardContent className="p-0 flex flex-col h-full">
                      {/* Header */}
                      <div className="bg-muted/40 p-4 flex items-center justify-between border-b border-border/40">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            exercise.completed 
                              ? (isGroup ? "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" : "bg-primary/20 text-primary") 
                              : "bg-muted text-muted-foreground"
                          )}>
                            <Dumbbell className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className={cn(
                              "font-semibold text-sm leading-tight truncate cursor-pointer transition-colors text-foreground",
                              exercise.completed && (isGroup ? "text-indigo-600/90 dark:text-indigo-400/90" : "text-primary/90"),
                              isGroup ? "hover:text-indigo-500" : "hover:text-primary"
                            )} onClick={() => setLogExercise(exercise)}>
                              {exercise.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              {exercise.is_to_failure && (
                                <span className="text-[8px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  Al fallo 🔥
                                </span>
                              )}
                              {exercise.completed && (
                                <span className={cn(
                                  "text-[8px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider",
                                  isGroup ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20" : "bg-primary/10 text-primary border-primary/20"
                                )}>
                                  Listo
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ExerciseVideoButton exerciseName={exercise.name} />
                          <Button 
                            size="icon" variant="ghost" 
                            className={cn(
                              "h-8 w-8 rounded-lg text-muted-foreground transition-all hover:bg-muted/80",
                              isGroup ? "hover:text-indigo-500" : "hover:text-primary"
                            )}
                            onClick={() => setLogExercise(exercise)}
                          >
                            <ClipboardEdit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Sets Table */}
                      <div className="p-4 flex-1">
                        <div className="grid grid-cols-[30px_1fr_1fr_40px] gap-2 px-1 mb-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider opacity-60">
                          <div className="text-center">SET</div>
                          <div className="text-center">KG</div>
                          <div className="text-center">REPS</div>
                          <div className="text-center">OK</div>
                        </div>

                        <div className="space-y-2">
                          {exerciseSets[exercise.id]?.map((set, idx) => (
                            <div 
                              key={set.id} 
                              className={cn(
                                "grid grid-cols-[30px_1fr_1fr_40px] items-center gap-2 p-1 rounded-lg transition-all border",
                                set.completed 
                                  ? (isGroup ? "bg-indigo-500/5 border-indigo-500/20" : "bg-primary/5 border-primary/20") 
                                  : "bg-muted/10 border-border/20 hover:bg-muted/20"
                              )}
                            >
                              <div className="text-[11px] font-bold text-center text-muted-foreground/80">{idx + 1}</div>
                              <div>
                                <Input 
                                  type="number" step="0.5" 
                                  className="h-8 w-full text-center text-xs font-bold border-none bg-transparent hover:bg-muted/30 focus:bg-muted/50 rounded-md focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                                  value={set.weight} 
                                  onChange={(e) => handleSetChange(exercise.id, set.id, "weight", e.target.value)} 
                                  placeholder="-" 
                                />
                              </div>
                              <div>
                                <Input 
                                  type="number" 
                                  className="h-8 w-full text-center text-xs font-bold border-none bg-transparent hover:bg-muted/30 focus:bg-muted/50 rounded-md focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                                  value={set.reps} 
                                  onChange={(e) => handleSetChange(exercise.id, set.id, "reps", e.target.value)} 
                                  placeholder="-" 
                                />
                              </div>
                              <div className="flex justify-center">
                                <Checkbox 
                                  checked={set.completed} 
                                  onCheckedChange={(c) => handleSetComplete(exercise.id, set.id, !!c)} 
                                  className={cn(
                                    "h-5 w-5 rounded transition-transform active:scale-90",
                                    isGroup 
                                      ? "data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500" 
                                      : "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                  )} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex justify-center">
                          <Button 
                            variant="outline" size="sm" 
                            className={cn(
                              "h-8 px-4 rounded-lg text-xs gap-1.5 border-dashed border-border text-muted-foreground transition-all hover:bg-muted/50",
                              isGroup 
                                ? "hover:text-indigo-600 hover:border-indigo-500/40" 
                                : "hover:text-primary hover:border-primary/40"
                            )}
                            onClick={() => handleAddSet(exercise.id)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Serie
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Entrenamiento</h1>
          <p className="text-sm text-muted-foreground mt-1">Sigue tu rutina diaria y registra tus series y repeticiones</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-full w-fit">
          <Dumbbell className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Entrenamiento</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Week Day Selector */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {DAYS.map((day, i) => {
            const isSelected = selectedDay === day;
            const isToday = day === today;
            const totalCount = hasGroupRoutine
              ? groupExercises.filter(e => e.day === day).length
              : exercises.filter(e => e.day === day).length;
            
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "relative flex flex-col items-center justify-center h-14 sm:h-16 rounded-xl text-sm font-semibold border transition-all active:scale-95",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-md"
                    : isToday
                      ? "bg-primary/5 border-primary/30 text-primary hover:bg-primary/10"
                      : "bg-card border-border/50 text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
              >
                <span className={cn(
                  "text-[10px] uppercase tracking-wider mb-1 transition-colors",
                  isSelected ? "text-primary-foreground/90" : isToday ? "text-primary" : "text-muted-foreground/80"
                )}>
                  {DAY_SHORT[i]}
                </span>
                
                {totalCount > 0 ? (
                  <div className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-md text-[9px] font-bold shadow-sm transition-colors",
                    isSelected ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                  )}>
                    {totalCount}
                  </div>
                ) : (
                  <div className="h-1 w-1 rounded-full bg-muted-foreground/30 mt-1" />
                )}
                {isToday && !isSelected && (
                  <div className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Rest Timer */}
        <RestTimer />

        <TabsContent value="personal" className="focus-visible:outline-none animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold tracking-tight text-foreground">Rutina Personal</h2>
            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/40">
              {currentPersonalExs.filter(e => e.completed).length}/{currentPersonalExs.length} Completados
            </span>
          </div>
          
          {allPersonalCompleted && currentPersonalExs.length > 0 && (
            <Card className="border border-green-500/20 bg-green-500/5 dark:bg-green-500/10 rounded-xl py-4 mb-4 shadow-sm">
              <CardContent className="p-0 text-center space-y-1.5">
                <Flame className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-1 animate-pulse" />
                <h3 className="text-sm font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">¡Rutina Personal Finalizada!</h3>
              </CardContent>
            </Card>
          )}

          {renderExercises(currentPersonalExs, false)}
        </TabsContent>

        {hasGroupRoutine && (
          <TabsContent value="group" className="focus-visible:outline-none animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold tracking-tight text-foreground">Rutina de Grupo</h2>
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-md border border-border/40">
                {currentGroupExs.filter(e => e.completed).length}/{currentGroupExs.length} Completados
              </span>
            </div>

            {allGroupCompleted && currentGroupExs.length > 0 && (
              <Card className="border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl py-4 mb-4 shadow-sm">
                <CardContent className="p-0 text-center space-y-1.5">
                  <Flame className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mx-auto mb-1 animate-pulse" />
                  <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">¡Rutina Grupal Finalizada!</h3>
                </CardContent>
              </Card>
            )}

            {renderExercises(currentGroupExs, true)}
          </TabsContent>
        )}
      </Tabs>

      {logExercise && user && (
        <DailyLogDialog
          open={!!logExercise}
          onClose={() => { setLogExercise(null); queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, user?.uid] }); }}
          exercise={logExercise}
          studentId={user.uid}
          trainerId={logExercise.trainer_id}
        />
      )}
    </div>
  );
}
