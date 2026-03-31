import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, CalendarClock, CheckCircle, Loader2, Users } from "lucide-react";
import MealsTab from "@/components/trainer/MealsTab";

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  completed: boolean;
}

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

export default function StudentRoutinesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "entrenamiento";

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groupExercises, setGroupExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGroupRoutine, setHasGroupRoutine] = useState(false);

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [exRes, groupMemberships] = await Promise.all([
      supabase.from("exercises").select("id, name, sets, reps, weight, day, completed").eq("student_id", user.id),
      supabase.from("training_group_members").select("group_id").eq("student_id", user.id),
    ]);

    setExercises(exRes.data as Exercise[] || []);

    if (groupMemberships.data && groupMemberships.data.length > 0) {
      const groupId = groupMemberships.data[0].group_id;
      const { data: grpExercises } = await supabase.from("group_exercises").select("*").eq("group_id", groupId);
      if (grpExercises && grpExercises.length > 0) {
        setGroupExercises(grpExercises);
        setHasGroupRoutine(true);
      } else {
        setGroupExercises([]);
        setHasGroupRoutine(false);
      }
    } else {
      setGroupExercises([]);
      setHasGroupRoutine(false);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const exercisesByDay: Record<string, Exercise[]> = {};
  exercises.forEach((ex) => {
    if (!exercisesByDay[ex.day]) exercisesByDay[ex.day] = [];
    exercisesByDay[ex.day].push(ex);
  });

  const groupExercisesByDay: Record<string, any[]> = {};
  groupExercises.forEach((ex) => {
    if (!groupExercisesByDay[ex.day]) groupExercisesByDay[ex.day] = [];
    groupExercisesByDay[ex.day].push(ex);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Rutinas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualiza tus rutinas semanales y planes de nutrición.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-6">
        <TabsList className="grid grid-cols-2 bg-secondary/50 max-w-md w-full">
          <TabsTrigger value="entrenamiento" className="text-xs sm:text-sm">
            <Dumbbell className="w-3.5 h-3.5 mr-2" />
            Entrenamiento
          </TabsTrigger>
          <TabsTrigger value="alimentacion" className="text-xs sm:text-sm">
            <CalendarClock className="w-3.5 h-3.5 mr-2" />
            Alimentación
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entrenamiento" className="space-y-6 mt-0">
          <Card className="card-glass shadow-none md:shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Rutina Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
                {DAYS.map((day, i) => {
                  const count = exercisesByDay[day]?.length || 0;
                  return (
                    <div key={day} className={`flex flex-col items-center justify-center w-10 min-w-10 h-12 rounded-lg text-xs font-bold border flex-shrink-0 transition-colors ${count > 0 ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/30 border-border text-muted-foreground"}`}>
                      <span className="text-[11px]">{DAY_SHORT[i]}</span>
                      {count > 0 && <span className="text-[9px] mt-0.5">{count}</span>}
                    </div>
                  );
                })}
              </div>

              {exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg border-border">Aún no tienes ejercicios asignados en tu rutina</p>
              ) : (
                <div className="space-y-6 mt-4">
                  {DAYS.filter((day) => exercisesByDay[day]?.length).map((day) => (
                    <div key={day} className="space-y-2">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">{day}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {exercisesByDay[day].map((ex) => (
                          <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-transparent hover:border-border/50 transition-colors">
                            <CheckCircle className={`h-4 w-4 flex-shrink-0 ${ex.completed ? "text-primary" : "text-muted-foreground/30"}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate leading-tight">{ex.name}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {ex.sets} series x {ex.reps} reps {ex.weight > 0 ? `· ${ex.weight}kg` : ""}
                              </p>
                            </div>
                            <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${ex.completed ? "border-primary/40 text-primary bg-primary/5" : "border-border"}`}>
                              {ex.completed ? "Completado" : "Pendiente"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {hasGroupRoutine && (
            <Card className="card-glass border-accent/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-accent">
                  <Users className="h-5 w-5" />Rutina de Grupo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 w-full overflow-x-auto pb-2 scrollbar-hide">
                  {DAYS.map((day, i) => {
                    const count = groupExercisesByDay[day]?.length || 0;
                    return (
                      <div key={day} className={`flex flex-col items-center justify-center w-10 min-w-10 h-12 rounded-lg text-xs font-bold border flex-shrink-0 ${count > 0 ? "bg-accent/10 border-accent/30 text-accent" : "bg-secondary/30 border-border text-muted-foreground"}`}>
                        <span className="text-[11px]">{DAY_SHORT[i]}</span>
                        {count > 0 && <span className="text-[9px] mt-0.5">{count}</span>}
                      </div>
                    );
                  })}
                </div>
                {groupExercises.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin ejercicios asignados al grupo</p>
                ) : (
                  <div className="space-y-6 mt-4">
                    {DAYS.filter((day) => groupExercisesByDay[day]?.length).map((day) => (
                      <div key={day} className="space-y-2">
                        <p className="text-xs font-bold text-accent uppercase tracking-wider">{day}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupExercisesByDay[day].map((ex) => (
                            <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                              <div className="h-5 w-5 flex-shrink-0 bg-accent/20 rounded-full flex items-center justify-center">
                                <Dumbbell className="h-3 w-3 text-accent" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate leading-tight">{ex.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {ex.sets} series x {ex.reps} reps {ex.weight > 0 ? `· ${ex.weight}kg` : ""}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-[10px] flex-shrink-0 border-accent/40 text-accent bg-accent/5">
                                Grupal
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="alimentacion" className="mt-0">
          {user ? (
             <MealsTab studentId={user.id} readOnly={true} />
          ) : (
            null
          )}
        </TabsContent>

      </Tabs>
    </div>
  );
}
