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
  getDoc 
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dumbbell, CheckCircle, Lock, LockOpen, Users, Loader2 
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

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

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [groupExercises, setGroupExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGroupRoutine, setHasGroupRoutine] = useState(false);
  
  const [selectedDay, setSelectedDay] = useState<string>(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [expandedSection, setExpandedSection] = useState<string | undefined>("personal");
  const [blockedRoutines, setBlockedRoutines] = useState<{ personal: boolean; group: boolean }>({
    personal: false,
    group: false
  });

  // Load blocked state from localStorage
  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`blocked_routines_${user.uid}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setBlockedRoutines(parsed);
          
          if (!parsed.personal) {
            setExpandedSection("personal");
          } else if (!parsed.group && hasGroupRoutine) {
            setExpandedSection("group");
          } else {
            setExpandedSection(undefined);
          }
        } catch (e) {
          console.error("Error loading blocked state:", e);
        }
      } else {
        setExpandedSection("personal");
      }
    }
  }, [user, hasGroupRoutine]);

  useEffect(() => {
    if (expandedSection === "personal" && blockedRoutines.personal) {
      setExpandedSection(undefined);
    } else if (expandedSection === "group" && blockedRoutines.group) {
      setExpandedSection(undefined);
    }
  }, [expandedSection, blockedRoutines]);

  const toggleBlock = (type: 'personal' | 'group') => {
    const isNowBlocked = !blockedRoutines[type];
    let newState = { ...blockedRoutines, [type]: isNowBlocked };
    
    if (!isNowBlocked) {
      const otherType = type === 'personal' ? 'group' : 'personal';
      newState[otherType] = true;
    }
    
    setBlockedRoutines(newState);
    if (user) {
      localStorage.setItem(`blocked_routines_${user.uid}`, JSON.stringify(newState));
      window.dispatchEvent(new Event('storage'));
    }
    toast.success(isNowBlocked ? "Rutina bloqueada" : "Rutina activada (la otra se ha bloqueado)");
    
    if (isNowBlocked && expandedSection === type) {
      setExpandedSection(undefined);
    } else if (!isNowBlocked) {
      setExpandedSection(type);
    }
  };

  const fetchExercises = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch Personal Exercises
      const qEx = query(collection(db, "exercises"), where("student_id", "==", user.uid));
      const snapEx = await getDocs(qEx);
      setExercises(snapEx.docs.map(d => ({ id: d.id, ...d.data() } as Exercise)));

      // Fetch Group Memberships
      const qMem = query(collection(db, "training_group_members"), where("student_id", "==", user.uid));
      const snapMem = await getDocs(qMem);
      
      if (!snapMem.empty) {
        const groupId = snapMem.docs[0].data().group_id;
        const qGrpEx = query(collection(db, "group_exercises"), where("group_id", "==", groupId));
        const snapGrpEx = await getDocs(qGrpEx);
        
        if (!snapGrpEx.empty) {
          setGroupExercises(snapGrpEx.docs.map(d => ({ id: d.id, ...d.data() })));
          setHasGroupRoutine(true);
        } else {
          setGroupExercises([]);
          setHasGroupRoutine(false);
        }
      } else {
        setGroupExercises([]);
        setHasGroupRoutine(false);
      }
    } catch (err) {
      console.error("Error fetching exercises:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
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
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 pb-32 animate-in fade-in duration-750">
      <div className="mb-10 text-center sm:text-left relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-3 relative z-10">
          <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter uppercase italic leading-none">
            Mis <span className="text-primary italic-none tracking-normal">Rutinas</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full w-fit mx-auto sm:mx-0">
            <Dumbbell className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Entrenamiento</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto sm:mx-0 font-medium leading-relaxed">
          Tu plan de entrenamiento personalizado diseñado para maximizar tus resultados y potenciar tu rendimiento.
        </p>
      </div>

      <div className="space-y-10">
        <Accordion 
          type="single" 
          collapsible
          value={expandedSection} 
          onValueChange={(v) => setExpandedSection(v)} 
          className="w-full space-y-6 border-none"
        >
            <AccordionItem value="personal" className="border-none">
              <div className={cn(
                "group relative overflow-hidden rounded-[2.5rem] bg-white/[0.03] border border-white/10 transition-all duration-500",
                expandedSection === "personal" ? "bg-white/[0.05] border-primary/30 shadow-2xl shadow-primary/5 scale-[1.01]" : "hover:bg-white/[0.06] hover:border-white/20"
              )}>
                <div className="p-6 sm:p-8 flex items-center gap-4 sm:gap-6">
                  <div className={cn(
                    "h-14 w-14 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 shadow-xl",
                    blockedRoutines.personal 
                      ? "bg-white/5 border-white/10 text-muted-foreground/40" 
                      : "bg-primary/20 border-primary/30 text-primary shadow-primary/20 group-hover:rotate-6"
                  )}>
                    <Dumbbell className="h-7 w-7" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className={cn(
                        "text-2xl sm:text-3xl font-display font-black tracking-tight uppercase transition-all duration-500 leading-none",
                        blockedRoutines.personal ? "opacity-30 italic" : "opacity-100"
                      )}>Rutina Personal</h2>
                      {blockedRoutines.personal && (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-white/10 opacity-30 px-2 py-0.5">Bloqueada</Badge>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">Personalizado para ti</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBlock('personal');
                      }}
                      className={cn(
                        "p-3 rounded-2xl transition-all duration-300 active:scale-90 shadow-lg",
                        blockedRoutines.personal 
                          ? "bg-primary text-white shadow-primary/20" 
                          : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-primary border border-white/10"
                      )}
                    >
                      {blockedRoutines.personal ? <Lock className="h-5 w-5" /> : <LockOpen className="h-5 w-5" />}
                    </button>
                    {!blockedRoutines.personal && (
                      <AccordionTrigger 
                        className={cn(
                          "w-12 h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:no-underline transition-all duration-300 flex items-center justify-center p-0",
                          "[&>svg]:h-6 [&>svg]:w-6 [&>svg]:transition-transform [&>svg]:duration-500"
                        )} 
                      />
                    )}
                  </div>
                </div>

                {!blockedRoutines.personal && (
                  <AccordionContent className="p-0 border-t border-white/5 animate-in slide-in-from-top-4 duration-500">
                    <div className="p-4 sm:p-8 space-y-8">
                      <div className="grid grid-cols-7 gap-2 w-full px-1">
                        {DAYS.map((day, i) => {
                          const count = exercisesByDay[day]?.length || 0;
                          const isSelected = selectedDay === day;
                          return (
                            <button
                              key={day}
                              onClick={() => setSelectedDay(day)}
                              className={cn(
                                "flex flex-col items-center justify-center h-20 rounded-2xl text-sm font-black border transition-all duration-300 group active:scale-95",
                                isSelected
                                  ? "bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-105 z-10"
                                  : count > 0 
                                    ? "bg-primary/10 border-primary/40 text-primary shadow-lg shadow-primary/5 hover:bg-primary/20" 
                                    : "bg-white/5 border-white/5 text-muted-foreground opacity-30 hover:opacity-50"
                              )}
                            >
                              <span className={cn(
                                "text-[10px] uppercase tracking-tighter mb-1.5 font-bold transition-colors",
                                isSelected ? "text-white" : "text-muted-foreground/80"
                              )}>{DAY_SHORT[i]}</span>
                              {count > 0 && (
                                <div className={cn(
                                  "flex items-center justify-center h-6 w-6 rounded-xl text-[10px] font-black shadow-md transition-colors",
                                  isSelected ? "bg-white text-primary" : "bg-primary text-white"
                                )}>
                                  {count}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div key={`personal-${selectedDay}`} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                        {!exercisesByDay[selectedDay] || exercisesByDay[selectedDay].length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-white/10 rounded-3xl opacity-50">
                            <Dumbbell className="h-12 w-12 text-muted-foreground/20 mb-4" />
                            <p className="text-sm font-medium text-muted-foreground">No tienes ejercicios asignados para el {selectedDay.toLowerCase()}</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] whitespace-nowrap">{selectedDay}</span>
                              <div className="h-[1px] w-full bg-gradient-to-r from-primary/30 to-transparent" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {exercisesByDay[selectedDay].map((ex) => (
                                <div key={ex.id} className={cn(
                                  "flex items-center gap-4 p-5 rounded-[2rem] bg-white/[0.03] border border-white/10 transition-all duration-300 hover:bg-white/[0.07] hover:border-white/20 hover:scale-[1.02] shadow-xl group active:scale-[0.98]",
                                  ex.completed && "border-primary/30 bg-primary/[0.03] opacity-90 shadow-primary/5"
                                )}>
                                  <div className={cn(
                                    "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border-2 transition-all duration-300 group-hover:rotate-6",
                                    ex.completed 
                                      ? "bg-primary/20 border-primary/30 text-primary shadow-lg shadow-primary/20" 
                                      : "bg-white/5 border-white/10 text-muted-foreground group-hover:border-white/30"
                                  )}>
                                    {ex.completed ? <CheckCircle className="h-6 w-6" /> : <Dumbbell className="h-6 w-6" />}
                                  </div>
                                  <div className="flex-1 min-w-0 py-0.5">
                                    <p className="text-base font-black truncate leading-none uppercase tracking-tight mb-1.5">{ex.name}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-black text-muted-foreground bg-white/5 px-2.5 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                                        {ex.sets} SETS × {ex.reps} REPS
                                      </span>
                                      {ex.weight > 0 && (
                                        <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-full border border-primary/20">
                                          {ex.weight}KG
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {ex.completed ? (
                                      <Badge className="badge-status-pagado text-[9px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full border-none shadow-lg">✓ HECHO</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/60 border-white/10 px-3 py-1 rounded-full bg-white/5">0%</Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionContent>
                )}
              </div>
            </AccordionItem>

            {hasGroupRoutine && (
              <AccordionItem value="group" className="border-none">
                <div className={cn(
                  "group relative overflow-hidden rounded-[2.5rem] bg-white/[0.03] border border-white/10 transition-all duration-500",
                  expandedSection === "group" ? "bg-white/[0.05] border-accent/30 shadow-2xl shadow-accent/5 scale-[1.01]" : "hover:bg-accent/[0.02] hover:border-accent/20"
                )}>
                  <div className="p-6 sm:p-8 flex items-center gap-4 sm:gap-6">
                    <div className={cn(
                      "h-14 w-14 rounded-3xl flex items-center justify-center border-2 transition-all duration-500 shadow-xl",
                      blockedRoutines.group 
                        ? "bg-white/5 border-white/10 text-muted-foreground/40" 
                        : "bg-accent/20 border-accent/30 text-accent shadow-accent/20 group-hover:rotate-[-6deg]"
                    )}>
                      <Users className="h-7 w-7" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className={cn(
                          "text-2xl sm:text-3xl font-display font-black tracking-tight uppercase transition-all duration-500 leading-none",
                          blockedRoutines.group ? "opacity-30 italic" : "opacity-100"
                        )}>Rutina de Grupo</h2>
                        {blockedRoutines.group && (
                          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest border-white/10 opacity-30 px-2 py-0.5">Bloqueada</Badge>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-60">Entrenamiento con tu equipo</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBlock('group');
                        }}
                        className={cn(
                          "p-3 rounded-2xl transition-all duration-300 active:scale-90 shadow-lg",
                          blockedRoutines.group 
                            ? "bg-accent text-white shadow-accent/20" 
                            : "bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-accent border border-white/10"
                        )}
                      >
                        {blockedRoutines.group ? <Lock className="h-5 w-5" /> : <LockOpen className="h-5 w-5" />}
                      </button>
                      {!blockedRoutines.group && (
                        <AccordionTrigger 
                          className={cn(
                            "w-12 h-12 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:no-underline transition-all duration-300 flex items-center justify-center p-0",
                            "[&>svg]:h-6 [&>svg]:w-6 [&>svg]:transition-transform [&>svg]:duration-500"
                          )} 
                        />
                      )}
                    </div>
                  </div>

                  {!blockedRoutines.group && (
                    <AccordionContent className="p-0 border-t border-white/5 animate-in slide-in-from-top-4 duration-500">
                      <div className="p-4 sm:p-8 space-y-8">
                        <div className="grid grid-cols-7 gap-2 w-full px-1">
                          {DAYS.map((day, i) => {
                            const count = groupExercisesByDay[day]?.length || 0;
                            const isSelected = selectedDay === day;
                            return (
                              <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={cn(
                                  "flex flex-col items-center justify-center h-20 rounded-2xl text-sm font-black border transition-all duration-300 group active:scale-95",
                                  isSelected
                                    ? "bg-accent border-accent text-white shadow-xl shadow-accent/20 scale-105 z-10"
                                    : count > 0 
                                      ? "bg-accent/10 border-accent/40 text-accent shadow-lg shadow-accent/5 hover:bg-accent/20" 
                                      : "bg-white/5 border-white/5 text-muted-foreground opacity-30 hover:opacity-50"
                                )}
                              >
                                <span className={cn(
                                  "text-[10px] uppercase tracking-tighter mb-1.5 font-bold transition-colors",
                                  isSelected ? "text-white" : "text-muted-foreground/80"
                                )}>{DAY_SHORT[i]}</span>
                                {count > 0 && (
                                  <div className={cn(
                                    "flex items-center justify-center h-6 w-6 rounded-xl text-[10px] font-black shadow-md transition-colors",
                                    isSelected ? "bg-white text-accent" : "bg-accent text-white"
                                  )}>
                                    {count}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div key={`group-${selectedDay}`} className="animate-in fade-in slide-in-from-bottom-3 duration-500">
                          {!groupExercisesByDay[selectedDay] || groupExercisesByDay[selectedDay].length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-6 text-center border-2 border-dashed border-white/10 rounded-3xl opacity-50">
                              <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
                              <p className="text-sm font-medium text-muted-foreground">No hay ejercicios grupales para el {selectedDay.toLowerCase()}</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em] whitespace-nowrap">{selectedDay}</span>
                                <div className="h-[1px] w-full bg-gradient-to-r from-accent/30 to-transparent" />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {groupExercisesByDay[selectedDay].map((ex) => (
                                  <div key={ex.id} className="flex items-center gap-4 p-5 rounded-[2rem] bg-white/[0.03] border border-white/10 transition-all duration-300 hover:bg-white/[0.07] hover:border-white/20 hover:scale-[1.02] shadow-xl group active:scale-[0.98]">
                                    <div className="h-12 w-12 rounded-2xl bg-accent/20 border-2 border-accent/30 flex items-center justify-center shrink-0 text-accent group-hover:rotate-6 transition-all duration-300 shadow-lg shadow-accent/20">
                                      <Dumbbell className="h-6 w-6" />
                                    </div>
                                    <div className="flex-1 min-w-0 py-0.5">
                                      <p className="text-base font-black truncate leading-none uppercase tracking-tight mb-1.5">{ex.name}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-muted-foreground bg-white/5 px-2.5 py-1 rounded-full border border-white/10 uppercase tracking-widest">
                                          {ex.sets} SETS × {ex.reps} REPS
                                        </span>
                                        {ex.weight > 0 && (
                                          <span className="text-xs font-black text-accent bg-accent/10 px-2 py-1 rounded-full border border-accent/20">
                                            {ex.weight}KG
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex-shrink-0">
                                      <Badge variant="outline" className="badge-accent-tag text-[9px] font-black uppercase tracking-[0.1em] px-3 py-1 rounded-full border-none shadow-lg">GRUPAL</Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </AccordionContent>
                  )}
                </div>
              </AccordionItem>
            )}
        </Accordion>
      </div>
    </div>
  );
}
