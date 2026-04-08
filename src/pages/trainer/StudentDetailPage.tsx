import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { fetchStudentProfile, type StudentProfile } from "@/services/alumnos";
import { updatePlanAssignment } from "@/services/planes";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { fetchArchivedRoutines, fetchRoutineExercises, type Routine } from "@/services/routineManager";
import { fetchStudentSurveyResults, fetchStudentPendingSurveys } from "@/services/surveys";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, CheckCircle, Apple, Loader2, Sparkles, Pencil, Archive, Users, ClipboardList, ChevronRight, AlertCircle, Clock } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import PersonalDiagnosticTab from "@/components/trainer/PersonalDiagnosticTab";
import WeightProgressChart from "@/components/trainer/WeightProgressChart";
import ExerciseHistoryTab from "@/components/trainer/ExerciseHistoryTab";
import MealsTab from "@/components/trainer/MealsTab";
import { toast } from "sonner";

interface Exercise {
  id: string; name: string; sets: number; reps: number; weight: number; day: string; completed: boolean;
}

const LEVEL_LABELS: Record<string, string> = {
  principiante: "Inicial", intermedio: "Intermedio", avanzado: "Avanzado",
};
const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("weight");
  const [paymentPaid, setPaymentPaid] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; planType: string; level: string } | null>(null);
  const [selectedEntrenamiento, setSelectedEntrenamiento] = useState<string>("none");
  const [selectedAlimentacion, setSelectedAlimentacion] = useState<string>("none");
  const [editingPlans, setEditingPlans] = useState(false);
  const [linkId, setLinkId] = useState<string>("");
  const [archivedRoutines, setArchivedRoutines] = useState<Routine[]>([]);
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [routineExercises, setRoutineExercises] = useState<any[]>([]);
  const [hasGroupRoutine, setHasGroupRoutine] = useState(false);
  const [groupExercises, setGroupExercises] = useState<any[]>([]);
  const [selectedDayTab, setSelectedDayTab] = useState<string>(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [surveyResults, setSurveyResults] = useState<any[]>([]);
  const [pendingSurveys, setPendingSurveys] = useState<any[]>([]);
  const [diagnosticStatus, setDiagnosticStatus] = useState<{ completed: boolean, date: string | null }>({ completed: false, date: null });
  const [viewingSurvey, setViewingSurvey] = useState<{ type: 'custom' | 'diagnostic', id?: string, data?: any } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);

    try {
      const qLink = query(collection(db, "trainer_students"), where("trainer_id", "==", user.uid), where("student_id", "==", studentId));
      const qLevels = query(collection(db, "plan_levels"), where("trainer_id", "==", user.uid), where("student_id", "==", studentId));
      const qGroupMembers = query(collection(db, "training_group_members"), where("student_id", "==", studentId));
      
      const [prof, snapLink, snapLevels, snapGroupMembers] = await Promise.all([
        fetchStudentProfile(studentId),
        getDocs(qLink),
        getDocs(qLevels),
        getDocs(qGroupMembers)
      ]);

      setProfile(prof);

      // Handle Link/Payment
      if (!snapLink.empty) {
        const linkDoc = snapLink.docs[0];
        setLinkId(linkDoc.id);
        const linkData = linkDoc.data();
        setPaymentPaid(linkData.payment_status === "pagado");
      }

      // Handle Levels
      const pls = snapLevels.docs.map(d => d.data() as any);
      const activeE = pls.find((p: any) => p.plan_type === "entrenamiento" && p.unlocked);
      const activeA = pls.find((p: any) => p.plan_type === "nutricion" && p.unlocked);
      setSelectedEntrenamiento(activeE ? activeE.level : "none");
      setSelectedAlimentacion(activeA ? activeA.level : "none");

      // Handle Group
      if (!snapGroupMembers.empty) {
        const groupId = snapGroupMembers.docs[0].data().group_id;
        const qGroupExercises = query(collection(db, "group_exercises"), where("group_id", "==", groupId));
        const snapGroupEx = await getDocs(qGroupExercises);
        if (!snapGroupEx.empty) {
          setGroupExercises(snapGroupEx.docs.map(d => ({ id: d.id, ...d.data() })));
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
      console.error("Error fetching core student data:", err);
    } finally {
      setLoading(false);
      fetchBackgroundData();
    }
  }, [user, studentId]);

  const fetchBackgroundData = async () => {
    if (!user || !studentId) return;
    setLoadingHistory(true);
    try {
      const qEx = query(collection(db, "exercises"), where("trainer_id", "==", user.uid), where("student_id", "==", studentId));
      const qDiag = query(collection(db, "seguimiento_personal"), where("student_id", "==", studentId), orderBy("created_at", "desc"), limit(1));
      
      const [snapEx, archived, sResults, pSurveys, diagSnap] = await Promise.all([
        getDocs(qEx),
        fetchArchivedRoutines(user.uid, studentId),
        fetchStudentSurveyResults(studentId),
        fetchStudentPendingSurveys(studentId),
        getDocs(qDiag)
      ]);

      setExercises(snapEx.docs.map(d => ({ id: d.id, ...d.data() } as Exercise)));
      setArchivedRoutines(archived);
      setSurveyResults(sResults);
      setPendingSurveys(pSurveys);
      
      if (!diagSnap.empty) {
        setDiagnosticStatus({ 
          completed: true, 
          date: diagSnap.docs[0].data().updated_at || diagSnap.docs[0].data().created_at 
        });
      } else {
        setDiagnosticStatus({ completed: false, date: null });
      }
    } catch (err) {
      console.error("Error fetching background data:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExpandRoutine = async (routineId: string) => {
    if (expandedRoutine === routineId) {
      setExpandedRoutine(null);
      setRoutineExercises([]);
      return;
    }
    setExpandedRoutine(routineId);
    try {
      const exs = await fetchRoutineExercises(routineId);
      setRoutineExercises(exs);
    } catch (err) {
      console.error("Error fetching routine exercises:", err);
    }
  };

  const handlePaymentToggle = async (checked: boolean) => {
    if (!linkId) return;
    setPaymentPaid(checked);
    try {
      await updateDoc(doc(db, "trainer_students", linkId), { 
        payment_status: checked ? "pagado" : "pendiente",
        updated_at: new Date().toISOString()
      });
      toast.success(checked ? "Marcado como pagado" : "Marcado como pendiente");
    } catch (err) {
      toast.error("No se pudo actualizar el estado de pago.");
      setPaymentPaid(!checked);
    }
  };

  const handlePlanChangeRequest = (planType: string, level: string) => {
    setConfirmDialog({ open: true, planType, level });
  };

  const handlePlanChangeConfirm = async () => {
    if (!confirmDialog || !user || !studentId) return;
    const { planType, level } = confirmDialog;
    setConfirmDialog(null);
    try {
      await updatePlanAssignment(user.uid, studentId, planType, level);
      if (planType === "entrenamiento") setSelectedEntrenamiento(level);
      else setSelectedAlimentacion(level);
      toast.success(level === "none" ? "Plan desactivado" : `Plan actualizado to ${LEVEL_LABELS[level] || level}`);
      fetchData();
    } catch { toast.error("Error al actualizar el plan"); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/trainer/students")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
        <p className="text-muted-foreground text-center">Alumno no encontrado</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/trainer/students")}><ArrowLeft className="h-5 w-5" /></Button>
        <Avatar className="h-14 w-14 border-2 border-primary/30">
          <AvatarImage src={profile.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
            {profile.avatar_initials || (profile.display_name || "??").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">{profile.display_name}</h1>
          <Badge variant="outline" className={`mt-1 text-xs ${paymentPaid ? "border-green-400/50 text-green-500 bg-green-500/10" : "border-destructive/50 text-destructive bg-destructive/10"}`}>
            {paymentPaid ? "✓ Pagado" : "✗ No pagado"}
          </Badge>
        </div>
        <div className="flex flex-col items-end gap-1 bg-secondary/20 p-2 rounded-xl border border-border/50">
          <Switch 
            id="payment-switch-header" 
            checked={paymentPaid} 
            onCheckedChange={handlePaymentToggle}
            className="data-[state=checked]:bg-green-500" 
          />
          <Label htmlFor="payment-switch-header" className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
            {paymentPaid ? "Pagado" : "Pendiente"}
          </Label>
        </div>
      </div>



      {/* Plan Assignment with edit lock */}
      <Card className="card-glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Asignación de Planes</CardTitle>
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${editingPlans ? "text-primary" : "text-muted-foreground"}`} onClick={() => setEditingPlans(!editingPlans)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(
            [
              { type: "entrenamiento", icon: Dumbbell, label: "Entrenamiento", selected: selectedEntrenamiento },
              { type: "nutricion", icon: Apple, label: "Alimentación", selected: selectedAlimentacion },
            ]
            .filter(({ selected }) => editingPlans || selected !== "none")
            .map(({ type, icon: Icon, label, selected }) => (
              <div key={type} className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-semibold">{label}</Label>
                  <p className="text-xs mt-0.5">
                    {selected !== "none"
                      ? <Badge variant="outline" className="text-[10px] bg-green-500/15 text-green-500 border-green-500/30">{LEVEL_LABELS[selected]} — Activo</Badge>
                      : <span className="text-[10px] text-destructive">Sin plan asignado</span>}
                  </p>
                </div>
                {editingPlans && (
                  <Select value={selected} onValueChange={(val) => handlePlanChangeRequest(type, val)}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin plan</SelectItem>
                      <SelectItem value="principiante">Inicial</SelectItem>
                      <SelectItem value="intermedio">Intermedio</SelectItem>
                      <SelectItem value="avanzado">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>


      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="card-glass neon-border">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {exercises.length > 0 ? Math.round((exercises.filter((e) => e.completed).length / exercises.length) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Completitud</p>
          </CardContent>
        </Card>
        <Card className="card-glass">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{exercises.filter((e) => e.completed).length}/{exercises.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Ejercicios</p>
          </CardContent>
        </Card>
        <Card className="card-glass">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{profile.weight ? `${profile.weight}` : "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Peso actual (kg)</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {(() => {
          const tabs = [
            { value: "weight", icon: "📈", label: "Peso" },
            { value: "meals", icon: "🍽️", label: "Comidas" },
            { value: "routine", icon: "🏋️", label: "Rutina" },
            ...(hasGroupRoutine ? [{ value: "group_routine", icon: "👥", label: "Grupo" }] : []),
            { value: "surveys", icon: <ClipboardList className="h-4 w-4" />, label: "Seguimiento" },
          ];
          
          return (
            <TabsList 
              className={`grid w-full bg-secondary/30 p-1 h-auto min-h-[56px]`}
              style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
            >
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 transition-all shadow-none data-[state=active]:bg-background/50 data-[state=active]:shadow-sm min-w-0"
                >
                  <div className="text-base sm:text-lg h-5 flex items-center justify-center">{tab.icon}</div>
                  <span className={`text-[9px] sm:text-[10px] truncate w-full text-center ${activeTab === tab.value ? "font-bold text-primary" : "text-muted-foreground"}`}>
                    {tab.label}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          );
        })()}

        <TabsContent value="weight">
          {studentId && (
            <div className="space-y-4">
              <WeightProgressChart studentId={studentId} />
              <ExerciseHistoryTab studentId={studentId} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="meals">
          {studentId && <MealsTab studentId={studentId} nutritionLevel={selectedAlimentacion} readOnly={true} />}
        </TabsContent>

        <TabsContent value="routine">
          <Card className="card-glass">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  Rutina Asignada
                </div>
                {loadingHistory && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-7 gap-1">
                {DAYS.map((day, i) => {
                  const count = exercisesByDay[day]?.length || 0;
                  const isActive = selectedDayTab === day;
                  return (
                    <button 
                      key={day} 
                      onClick={() => setSelectedDayTab(day)}
                      className={`flex flex-col items-center justify-center h-12 rounded-lg text-xs font-bold border transition-all ${
                        isActive 
                          ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                          : count > 0 
                            ? "bg-primary/10 border-primary/30 text-primary" 
                            : "bg-secondary/30 border-border text-muted-foreground"
                      }`}
                    >
                      <span className="text-[11px]">{DAY_SHORT[i]}</span>
                      {count > 0 && <span className="text-[9px] mt-0.5">{count}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2">
                <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wider">{selectedDayTab}</p>
                {(!exercisesByDay[selectedDayTab] || exercisesByDay[selectedDayTab].length === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-8 bg-secondary/10 rounded-lg border border-dashed border-border">
                    Sin ejercicios para el {selectedDayTab}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {exercisesByDay[selectedDayTab].map((ex) => (
                      <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                        <CheckCircle className={`h-4 w-4 flex-shrink-0 ${ex.completed ? "text-primary" : "text-muted-foreground/30"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ex.name}</p>
                          <p className="text-[10px] text-muted-foreground">{ex.sets}×{ex.reps} · {ex.weight}kg</p>
                        </div>
                        {ex.completed && <Badge className="bg-primary/20 text-primary text-[10px] py-0 px-1 border-0">Hecho</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group_routine">
          {hasGroupRoutine && (
            <Card className="card-glass">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-accent" />Rutina de Grupo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day, i) => {
                    const count = groupExercisesByDay[day]?.length || 0;
                    const isActive = selectedDayTab === day;
                    return (
                      <button 
                        key={day} 
                        onClick={() => setSelectedDayTab(day)}
                        className={`flex flex-col items-center justify-center h-12 rounded-lg text-xs font-bold border transition-all ${
                          isActive 
                            ? "bg-accent text-accent-foreground border-accent shadow-sm" 
                            : count > 0 
                              ? "bg-accent/10 border-accent/30 text-accent" 
                              : "bg-secondary/30 border-border text-muted-foreground"
                        }`}
                      >
                        <span className="text-[11px]">{DAY_SHORT[i]}</span>
                        {count > 0 && <span className="text-[9px] mt-0.5">{count}</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <p className="text-xs font-semibold text-accent mb-3 uppercase tracking-wider">{selectedDayTab}</p>
                  {(!groupExercisesByDay[selectedDayTab] || groupExercisesByDay[selectedDayTab].length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-8 bg-secondary/10 rounded-lg border border-dashed border-border">
                      Sin ejercicios grupales para el {selectedDayTab}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {groupExercisesByDay[selectedDayTab].map((ex) => (
                        <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
                          <div className="h-4 w-4 flex-shrink-0 bg-accent/20 rounded-full flex items-center justify-center">
                            <Dumbbell className="h-2.5 w-2.5 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ex.name}</p>
                            <p className="text-[10px] text-muted-foreground">{ex.sets}×{ex.reps} {ex.weight ? `· ${ex.weight}kg` : ""}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px] flex-shrink-0 border-accent/40 text-accent">
                            Grupal
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>


        <TabsContent value="surveys">
          {loadingHistory ? (
            <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : viewingSurvey ? (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" className="gap-2 -ml-2 mb-2" onClick={() => setViewingSurvey(null)}>
                <ArrowLeft className="h-4 w-4" /> Volver a la lista
              </Button>
              
              {viewingSurvey.type === 'diagnostic' ? (
                <PersonalDiagnosticTab studentId={studentId} />
              ) : (
                <Card className="card-glass">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{viewingSurvey.data.survey?.title || "Encuesta"}</CardTitle>
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        {viewingSurvey.data.completed_at ? new Date(viewingSurvey.data.completed_at).toLocaleDateString() : "En progreso"}
                      </Badge>
                    </div>
                    {viewingSurvey.data.survey?.description && (
                      <p className="text-xs text-muted-foreground">{viewingSurvey.data.survey.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {viewingSurvey.data.survey?.questions?.length > 0 ? (
                      viewingSurvey.data.survey.questions.map((q: any, i: number) => {
                        const answer = viewingSurvey.data.answers?.find((a: any) => a.question_id === q.id);
                        return (
                          <div key={q.id} className="p-3 rounded-lg bg-secondary/20 border border-border/50 space-y-1.5">
                            <p className="text-sm font-medium">
                              <span className="text-primary font-bold mr-1.5">{i + 1}.</span>
                              {q.question_text}
                            </p>
                            <p className="text-sm text-foreground/80 pl-4">
                              {answer?.answer_text || <span className="text-muted-foreground italic">Sin respuesta</span>}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground italic text-center py-4">No hay respuestas detalladas para esta encuesta o se encuentra pendiente.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold mb-1 px-1">Seguimiento y Encuestas</h3>
              
              {/* Diagnóstico Inicial */}
              <div 
                className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors"
                onClick={() => setViewingSurvey({ type: 'diagnostic' })}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-semibold">Diagnóstico de Cambio Personal</span>
                    <span className="text-[10px] text-muted-foreground">
                      {diagnosticStatus.completed && diagnosticStatus.date ? `Completada el ${new Date(diagnosticStatus.date).toLocaleDateString()}` : "Evaluación inicial de hábitos"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={diagnosticStatus.completed ? "outline" : "secondary"} className={diagnosticStatus.completed ? "bg-green-500/10 text-green-500 border-green-500/20 text-[10px]" : "bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px]"}>
                    {diagnosticStatus.completed ? "Completada" : "Pendiente"}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Encuestas Personalizadas */}
              {[...pendingSurveys, ...surveyResults].length === 0 ? (
                <div className="py-8 text-center border rounded-xl border-dashed">
                  <ClipboardList className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground italic">No hay encuestas personalizadas asignadas.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Pending Surveys */}
                  {pendingSurveys.map((item: any) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors"
                      onClick={() => setViewingSurvey({ type: 'custom', id: item.id, data: item })}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                          <ClipboardList className="h-5 w-5 text-orange-500" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-semibold">{item.survey?.title || "Encuesta Personalizada"}</span>
                          <span className="text-[10px] text-muted-foreground">Asignada recientemente</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px]">
                          Pendiente
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}

                  {/* Completed Surveys */}
                  {surveyResults.map((item: any) => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-pointer hover:bg-secondary/40 transition-colors"
                      onClick={() => setViewingSurvey({ type: 'custom', id: item.id, data: item })}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <ClipboardList className="h-5 w-5 text-green-500" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-semibold">{item.survey?.title || "Encuesta Personalizada"}</span>
                          <span className="text-[10px] text-muted-foreground">
                            Completada el {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : "Recientemente"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                          Completada
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cambiar plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.level === "none"
                ? "Se desactivará el plan actual para este alumno."
                : `Se cambiará el nivel a "${LEVEL_LABELS[confirmDialog?.level || ""] || confirmDialog?.level}". Los cambios se aplican inmediatamente.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePlanChangeConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
