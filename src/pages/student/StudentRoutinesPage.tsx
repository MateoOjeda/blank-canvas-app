import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
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
    <div className="container-responsive space-y-8 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">Mis Rutinas</h1>
        <p className="text-sm text-muted-foreground font-medium max-w-md">
          Tu centro de entrenamiento y nutrición personalizado.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-8">
        <div className="flex justify-center sm:justify-start">
          <TabsList className="grid grid-cols-2 bg-white/5 border border-white/10 p-1 rounded-2xl h-12 w-full max-w-md">
            <TabsTrigger value="entrenamiento" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
              <Dumbbell className="w-4 h-4 mr-2" />
              <span className="font-bold uppercase tracking-tighter text-xs">Entrenamiento</span>
            </TabsTrigger>
            <TabsTrigger value="alimentacion" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
              <CalendarClock className="w-4 h-4 mr-2" />
              <span className="font-bold uppercase tracking-tighter text-xs">Nutrición</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="entrenamiento" className="space-y-10 mt-0">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-display font-bold tracking-tight uppercase">Rutina Personal</h2>
            </div>
            
            <Card className="card-premium border-white/5 overflow-hidden">
              <CardContent className="p-6 space-y-8">
                <div className="flex gap-4 w-full overflow-x-auto pb-4 scrollbar-hide">
                  {DAYS.map((day, i) => {
                    const count = exercisesByDay[day]?.length || 0;
                    return (
                      <div key={day} className={cn(
                        "flex flex-col items-center justify-center min-w-[50px] h-16 rounded-2xl text-xs font-black border transition-all duration-300 flex-shrink-0",
                        count > 0 
                          ? "bg-primary/10 border-primary/40 text-primary shadow-lg shadow-primary/5" 
                          : "bg-white/5 border-white/5 text-muted-foreground opacity-40"
                      )}>
                        <span className="text-[10px] uppercase tracking-tighter mb-0.5">{DAY_SHORT[i]}</span>
                        {count > 0 && (
                          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-white text-[9px] font-bold shadow-sm">
                            {count}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {exercises.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-white/10 rounded-3xl">
                    <Dumbbell className="h-12 w-12 text-muted-foreground/20 mb-4" />
                    <p className="text-sm font-medium text-muted-foreground">Aún no tienes ejercicios asignados en tu rutina personalizada</p>
                  </div>
                ) : (
                  <div className="space-y-10 mt-4">
                    {DAYS.filter((day) => exercisesByDay[day]?.length).map((day) => (
                      <div key={day} className="space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] whitespace-nowrap">{day}</span>
                          <div className="h-[1px] w-full bg-gradient-to-r from-primary/30 to-transparent" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {exercisesByDay[day].map((ex) => (
                            <div key={ex.id} className={cn(
                              "flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 transition-all hover:bg-white/10 hover:border-white/20 group",
                              ex.completed && "border-primary/20 bg-primary/5 opacity-80"
                            )}>
                              <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                                ex.completed ? "bg-primary/20 border-primary/20 text-primary" : "bg-white/5 border-white/5 text-muted-foreground group-hover:border-white/20"
                              )}>
                                {ex.completed ? <CheckCircle className="h-5 w-5" /> : <Dumbbell className="h-5 w-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate leading-tight uppercase tracking-tight">{ex.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] font-medium text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                    {ex.sets}s × {ex.reps}r
                                  </span>
                                  {ex.weight > 0 && (
                                    <span className="text-[11px] font-black text-primary">
                                      {ex.weight}kg
                                    </span>
                                  )}
                                </div>
                              </div>
                              {ex.completed ? (
                                <Badge className="badge-status-pagado text-[9px] uppercase tracking-tighter px-2">Completado</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] uppercase tracking-tighter text-muted-foreground border-white/10 px-2 opacity-50">Pendiente</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {hasGroupRoutine && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-accent/20 flex items-center justify-center border border-accent/20 shadow-lg shadow-accent/10">
                  <Users className="h-5 w-5 text-accent" />
                </div>
                <h2 className="text-xl font-display font-bold tracking-tight uppercase">Rutina de Grupo</h2>
              </div>

              <Card className="card-premium border-white/5 overflow-hidden">
                <CardContent className="p-6 space-y-8">
                  <div className="flex gap-4 w-full overflow-x-auto pb-4 scrollbar-hide">
                    {DAYS.map((day, i) => {
                      const count = groupExercisesByDay[day]?.length || 0;
                      return (
                        <div key={day} className={cn(
                          "flex flex-col items-center justify-center min-w-[50px] h-16 rounded-2xl text-xs font-black border transition-all duration-300 flex-shrink-0",
                          count > 0 
                            ? "bg-accent/10 border-accent/40 text-accent shadow-lg shadow-accent/5" 
                            : "bg-white/5 border-white/5 text-muted-foreground opacity-40"
                        )}>
                          <span className="text-[10px] uppercase tracking-tighter mb-0.5">{DAY_SHORT[i]}</span>
                          {count > 0 && (
                            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-accent text-white text-[9px] font-bold shadow-sm">
                              {count}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {groupExercises.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-white/10 rounded-3xl">
                      <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                      <p className="text-sm font-medium text-muted-foreground">Sin ejercicios asignados al grupo actualmente</p>
                    </div>
                  ) : (
                    <div className="space-y-10 mt-4">
                      {DAYS.filter((day) => groupExercisesByDay[day]?.length).map((day) => (
                        <div key={day} className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em] whitespace-nowrap">{day}</span>
                            <div className="h-[1px] w-full bg-gradient-to-r from-accent/30 to-transparent" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {groupExercisesByDay[day].map((ex) => (
                              <div key={ex.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 transition-all hover:bg-white/10 hover:border-white/20 group">
                                <div className="h-10 w-10 rounded-xl bg-accent/10 border border-accent/10 flex items-center justify-center shrink-0 text-accent group-hover:border-accent/30 transition-colors">
                                  <Dumbbell className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate leading-tight uppercase tracking-tight">{ex.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[11px] font-medium text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                      {ex.sets}s × {ex.reps}r
                                    </span>
                                    {ex.weight > 0 && (
                                      <span className="text-[11px] font-black text-accent">
                                        {ex.weight}kg
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Badge variant="outline" className="badge-accent-tag text-[9px] uppercase tracking-tighter px-2">Grupal</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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
