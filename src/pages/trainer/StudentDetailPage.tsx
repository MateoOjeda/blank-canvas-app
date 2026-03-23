import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { fetchStudentProfile, type StudentProfile } from "@/services/alumnos";
import { updatePlanAssignment } from "@/services/planes";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, CheckCircle, Apple, Loader2, Sparkles, Pencil } from "lucide-react";
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

  const fetchData = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);
    const [prof, exRes, plRes, tsRes] = await Promise.all([
      fetchStudentProfile(studentId),
      supabase.from("exercises").select("id, name, sets, reps, weight, day, completed").eq("trainer_id", user.id).eq("student_id", studentId),
      supabase.from("plan_levels").select("plan_type, level, unlocked").eq("trainer_id", user.id).eq("student_id", studentId),
      supabase.from("trainer_students").select("id, payment_status, plan_entrenamiento, plan_alimentacion").eq("trainer_id", user.id).eq("student_id", studentId).maybeSingle(),
    ]);
    setProfile(prof);
    setExercises(exRes.data || []);

    const pls = plRes.data || [];
    const activeE = pls.find((p: any) => p.plan_type === "entrenamiento" && p.unlocked);
    const activeA = pls.find((p: any) => p.plan_type === "nutricion" && p.unlocked);
    setSelectedEntrenamiento(activeE ? activeE.level : "none");
    setSelectedAlimentacion(activeA ? activeA.level : "none");

    if (tsRes.data) {
      setLinkId(tsRes.data.id);
      setPaymentPaid(tsRes.data.payment_status === "pagado");
    }
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePaymentToggle = async (checked: boolean) => {
    if (!linkId) return;
    setPaymentPaid(checked);
    const { error } = await supabase.from("trainer_students").update({ payment_status: checked ? "pagado" : "pendiente" }).eq("id", linkId);
    if (error) { toast.error("No se pudo actualizar el estado de pago."); setPaymentPaid(!checked); }
    else toast.success(checked ? "Marcado como pagado" : "Marcado como pendiente");
  };

  const handlePlanChangeRequest = (planType: string, level: string) => {
    setConfirmDialog({ open: true, planType, level });
  };

  const handlePlanChangeConfirm = async () => {
    if (!confirmDialog || !user || !studentId) return;
    const { planType, level } = confirmDialog;
    setConfirmDialog(null);
    try {
      await updatePlanAssignment(user.id, studentId, planType, level);
      if (planType === "entrenamiento") setSelectedEntrenamiento(level);
      else setSelectedAlimentacion(level);
      toast.success(level === "none" ? "Plan desactivado" : `Plan actualizado a ${LEVEL_LABELS[level] || level}`);
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
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">{profile.display_name}</h1>
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
          {[
            { type: "entrenamiento", icon: Dumbbell, label: "Entrenamiento", selected: selectedEntrenamiento },
            { type: "nutricion", icon: Apple, label: "Alimentación", selected: selectedAlimentacion },
          ].map(({ type, icon: Icon, label, selected }) => (
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
          ))}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/trainer/routines/${studentId}`)}>
          <Dumbbell className="h-4 w-4" /> Editar Rutina
        </Button>
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
        <TabsList className="w-full grid grid-cols-4 bg-secondary/50">
          <TabsTrigger value="weight" className="text-xs">📈 Peso</TabsTrigger>
          <TabsTrigger value="meals" className="text-xs">🍽️ Comidas</TabsTrigger>
          <TabsTrigger value="routine" className="text-xs">🏋️ Rutina</TabsTrigger>
          <TabsTrigger value="diagnostic" className="text-xs"><Sparkles className="h-3 w-3 mr-1" />Encuesta</TabsTrigger>
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
          {studentId && <MealsTab studentId={studentId} />}
        </TabsContent>

        <TabsContent value="routine">
          <Card className="card-glass">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" />Rutina Asignada</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {DAYS.map((day, i) => {
                  const count = exercisesByDay[day]?.length || 0;
                  return (
                    <div key={day} className={`flex flex-col items-center justify-center w-10 h-12 rounded-lg text-xs font-bold border ${count > 0 ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary/30 border-border text-muted-foreground"}`}>
                      <span className="text-[11px]">{DAY_SHORT[i]}</span>
                      {count > 0 && <span className="text-[9px] mt-0.5">{count}</span>}
                    </div>
                  );
                })}
              </div>
              {exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin ejercicios asignados</p>
              ) : (
                DAYS.filter((day) => exercisesByDay[day]?.length).map((day) => (
                  <div key={day}>
                    <p className="text-xs font-semibold text-primary mb-2">{day}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {exercisesByDay[day].map((ex) => (
                        <div key={ex.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                          <CheckCircle className={`h-4 w-4 flex-shrink-0 ${ex.completed ? "text-primary" : "text-muted-foreground/30"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{ex.name}</p>
                            <p className="text-[10px] text-muted-foreground">{ex.sets}×{ex.reps} · {ex.weight}kg</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${ex.completed ? "border-primary/40 text-primary" : "border-border"}`}>
                            {ex.completed ? "✓" : "—"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
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
