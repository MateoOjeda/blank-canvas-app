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
  updateDoc 
} from "firebase/firestore";
import { fetchArchivedRoutines, fetchRoutineExercises, type Routine } from "@/services/routineManager";
import { fetchStudentSurveyResults } from "@/services/surveys";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, CheckCircle, Apple, Loader2, Sparkles, Pencil, Archive, Users, ClipboardList } from "lucide-react";
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
      const [snapEx, archived, sResults] = await Promise.all([
        getDocs(qEx),
        fetchArchivedRoutines(user.uid, studentId),
        fetchStudentSurveyResults(studentId),
      ]);
      setExercises(snapEx.docs.map(d => ({ id: d.id, ...d.data() } as Exercise)));
      setArchivedRoutines(archived);
      setSurveyResults(sResults);
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
            {profile.avatar_initials || profile.display_name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">{profile.display_name}</h1>
          <Badge variant="outline" className={`mt-1 text-xs ${paymentPaid ? "border-green-400/50 text-green-500 bg-green-500/10" : "border-destructive/50 text-destructive bg-destructive/10"}`}>
            {paymentPaid ? "✓ Pagado" : "✗ No pagado"}
          </Badge>
        </div>
      </div>

      {/* Payment toggle */}
      <Card className="card-glass">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Estado de pago del mes</p>
            <p className="text-xs text-muted-foreground">{paymentPaid ? "Pagado ✓" : "Pendiente"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="payment-switch" className="text-xs text-muted-foreground">{paymentPaid ? "Pagado" : "Pendiente"}</Label>
            <Switch id="payment-switch" checked={paymentPaid} onCheckedChange={handlePaymentToggle} />
          </div>
        </CardContent>
      </Card>


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
          {!editingPlans && selectedEntrenamiento === "none" && selectedAlimentacion === "none" ? (
             <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
               <p className="text-sm font-semibold text-destructive">Este alumno no tiene planes asignados</p>
             </div>
          ) : (
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

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setActiveTab("diagnostic")}>
          <Sparkles className="h-4 w-4" /> Ver Encuesta
        </Button>
      </div>

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
        <TabsList className="w-full flex h-14 bg-secondary/50 overflow-x-auto hide-scrollbar p-1">
          {[
            { value: "weight", icon: "📈", label: "Peso" },
            { value: "meals", icon: "🍽️", label: "Comidas" },
            { value: "routine", icon: "🏋️", label: "Rutina" },
            ...(hasGroupRoutine ? [{ value: "group_routine", icon: "👥", label: "Grupo" }] : []),
            { value: "surveys", icon: <ClipboardList className="h-4 w-4" />, label: "Seguimiento" },
            { value: "diagnostic", icon: <Sparkles className="h-4 w-4" />, label: "Encuesta" }
          ].map((tab) => (
            <TabsTrigger 
              key={tab.value} 
              value={tab.value} 
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 transition-all shadow-none data-[state=active]:shadow-sm ${
                activeTab === tab.value ? "min-w-[80px]" : "min-w-[48px]"
              }`}
            >
              <div className="text-lg flex items-center justify-center">{tab.icon}</div>
              {activeTab === tab.value && (
                <span className="text-[10px] truncate w-full text-center animate-in fade-in slide-in-from-bottom-1">
                  {tab.label}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

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
          ) : surveyResults.length === 0 ? (
            <Card className="card-glass border-dashed text-center p-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">Sin respuestas de encuestas</h3>
              <p className="text-sm text-muted-foreground mt-1">Este alumno aún no ha completado ninguna encuesta personalizada.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {surveyResults.map((result: any) => (
                <Card key={result.id} className="card-glass">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{result.survey?.title || "Encuesta"}</CardTitle>
                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                        {result.completed_at ? new Date(result.completed_at).toLocaleDateString() : "Completada"}
                      </Badge>
                    </div>
                    {result.survey?.description && (
                      <p className="text-xs text-muted-foreground">{result.survey.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {result.survey?.questions?.map((q: any, i: number) => {
                      const answer = result.answers?.find((a: any) => a.question_id === q.id);
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
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="diagnostic">
          {studentId && <PersonalDiagnosticTab studentId={studentId} />}
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
