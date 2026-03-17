import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Loader2, Trash2, Dumbbell, Apple, Eye, Pencil, Plus, UserMinus } from "lucide-react";
import { toast } from "sonner";

interface LinkedStudent {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
  weight: number | null;
  age: number | null;
  linked_at: string;
  highestLevel: string;
  unlockedCount: number;
  planType: string;
  planEntrenamiento: string;
  planAlimentacion: string;
  linkId: string;
  paymentStatus: string;
}

interface AvailableStudent {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
}

const PLAN_LEVEL_OPTIONS = [
  { value: "inicial", label: "Inicial", color: "text-green-600 border-green-400/50 bg-green-500/10" },
  { value: "intermedio", label: "Intermedio", color: "text-orange-600 border-orange-400/50 bg-orange-500/10" },
  { value: "avanzado", label: "Avanzado", color: "text-red-600 border-red-400/50 bg-red-500/10" },
];

const getLevelColor = (level: string) => {
  const opt = PLAN_LEVEL_OPTIONS.find((o) => o.value === level);
  return opt?.color || "";
};

export default function StudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [linking, setLinking] = useState<string | null>(null);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<LinkedStudent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const fetchLinkedStudents = useCallback(async () => {
    if (!user) return;
    const { data: links } = await supabase
      .from("trainer_students")
      .select("id, student_id, created_at, plan_type, payment_status")
      .eq("trainer_id", user.id);

    if (!links || links.length === 0) {
      setLinkedStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = links.map((l) => l.student_id);

    const [profilesRes, levelsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_initials, avatar_url, weight, age").in("user_id", studentIds),
      supabase.from("plan_levels").select("student_id, level, unlocked").eq("trainer_id", user.id).in("student_id", studentIds),
    ]);

    const profiles = profilesRes.data || [];
    const levels = levelsRes.data || [];

    const getHighest = (sid: string): string => {
      const unlocked = levels.filter((l) => l.student_id === sid && l.unlocked);
      if (unlocked.find((l) => l.level === "avanzado")) return "Avanzado";
      if (unlocked.find((l) => l.level === "intermedio")) return "Intermedio";
      if (unlocked.find((l) => l.level === "principiante")) return "Principiante";
      return "Sin desbloquear";
    };

    const merged: LinkedStudent[] = profiles.map((p: any) => {
      const link = links.find((l) => l.student_id === p.user_id);
      return {
        ...p,
        linked_at: link?.created_at || "",
        highestLevel: getHighest(p.user_id),
        unlockedCount: levels.filter((l) => l.student_id === p.user_id && l.unlocked).length,
        planType: (link as any)?.plan_type || "Estándar",
        linkId: link?.id || "",
        paymentStatus: (link as any)?.payment_status || "pendiente",
      };
    });

    setLinkedStudents(merged);
    setLoading(false);
  }, [user]);

  const fetchAvailableStudents = useCallback(async () => {
    if (!user) return;
    setLoadingAvailable(true);

    const { data: links } = await supabase.from("trainer_students").select("student_id").eq("trainer_id", user.id);
    const linkedIds = (links || []).map((l) => l.student_id);
    const excludeIds = [...linkedIds, user.id];

    const { data: studentRoles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    const studentUserIds = (studentRoles || []).map((r) => r.user_id).filter((id) => !excludeIds.includes(id));

    if (studentUserIds.length === 0) {
      setAvailableStudents([]);
      setLoadingAvailable(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_initials, avatar_url")
      .in("user_id", studentUserIds);

    setAvailableStudents(profiles || []);
    setLoadingAvailable(false);
  }, [user]);

  useEffect(() => {
    fetchLinkedStudents();
    fetchAvailableStudents();
  }, [fetchLinkedStudents, fetchAvailableStudents]);

  const linkStudent = async (studentId: string) => {
    if (!user) return;
    setLinking(studentId);
    const { error } = await supabase.from("trainer_students").insert({ trainer_id: user.id, student_id: studentId });
    if (error) toast.error("Error al vincular alumno");
    else {
      toast.success("Alumno vinculado correctamente");
      await Promise.all([fetchLinkedStudents(), fetchAvailableStudents()]);
    }
    setLinking(null);
  };

  const unlinkStudent = async (student: LinkedStudent) => {
    if (!user) return;
    setUnlinking(student.user_id);
    const { error } = await supabase.from("trainer_students").delete().eq("trainer_id", user.id).eq("student_id", student.user_id);
    if (error) toast.error("Error al remover alumno");
    else {
      toast.success("Alumno removido correctamente");
      if (selectedStudentId === student.user_id) setSelectedStudentId(null);
      await Promise.all([fetchLinkedStudents(), fetchAvailableStudents()]);
    }
    setUnlinking(null);
  };

  const updatePlanType = async (linkId: string, planType: string) => {
    const { error } = await supabase.from("trainer_students").update({ plan_type: planType } as any).eq("id", linkId);
    if (error) toast.error("Error al actualizar tipo de plan");
    else {
      setLinkedStudents((prev) => prev.map((s) => s.linkId === linkId ? { ...s, planType } : s));
      toast.success("Tipo de plan actualizado");
    }
  };

  const handlePaymentToggle = async (student: LinkedStudent, checked: boolean) => {
    const newStatus = checked ? "pagado" : "pendiente";
    setLinkedStudents((prev) => prev.map((s) => s.user_id === student.user_id ? { ...s, paymentStatus: newStatus } : s));
    const { error } = await supabase
      .from("trainer_students")
      .update({ payment_status: newStatus })
      .eq("id", student.linkId);
    if (error) {
      toast.error("Error al actualizar pago");
      setLinkedStudents((prev) => prev.map((s) => s.user_id === student.user_id ? { ...s, paymentStatus: checked ? "pendiente" : "pagado" } : s));
    }
  };

  const confirmDeleteStudent = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    const sid = deleteTarget.user_id;
    await Promise.all([
      supabase.from("exercise_logs").delete().eq("student_id", sid).eq("trainer_id", user.id),
      supabase.from("exercises").delete().eq("student_id", sid).eq("trainer_id", user.id),
      supabase.from("plan_levels").delete().eq("student_id", sid).eq("trainer_id", user.id),
      supabase.from("trainer_changes").delete().eq("student_id", sid).eq("trainer_id", user.id),
    ]);
    const { error } = await supabase.from("trainer_students").delete().eq("trainer_id", user.id).eq("student_id", sid);
    if (error) toast.error("Error al eliminar alumno");
    else {
      toast.success("Alumno eliminado permanentemente");
      if (selectedStudentId === sid) setSelectedStudentId(null);
      await Promise.all([fetchLinkedStudents(), fetchAvailableStudents()]);
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const selectedStudent = linkedStudents.find((s) => s.user_id === selectedStudentId) || null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Panel del Entrenador</h1>
        <p className="text-muted-foreground text-sm mt-1">Gestiona y supervisa a tus alumnos</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 min-h-[60vh]">
        {/* LEFT COLUMN – Student Lists */}
        <div className="space-y-4">
          {/* Linked students card (orange accent) */}
          <Card className="card-glass overflow-hidden border-accent/30">
            <CardHeader className="p-4 pb-2 bg-accent/10">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <CardTitle className="text-sm text-accent">Alumnos vinculados ({linkedStudents.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 overflow-y-auto max-h-[35vh]">
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
              ) : linkedStudents.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Sin alumnos vinculados</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {linkedStudents.map((student) => (
                    <div
                      key={student.user_id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        selectedStudentId === student.user_id
                          ? "bg-accent/10 border border-accent/30"
                          : "hover:bg-muted/50 border border-transparent"
                      }`}
                    >
                      <button
                        onClick={() => setSelectedStudentId(student.user_id)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <Avatar className="h-9 w-9 border border-accent/20 flex-shrink-0">
                          <AvatarImage src={student.avatar_url || undefined} />
                          <AvatarFallback className="bg-accent/10 text-accent font-bold text-xs">
                            {student.avatar_initials || student.display_name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{student.display_name}</p>
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-green-400/50 text-green-600 mt-0.5">
                            ● Activo
                          </Badge>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => unlinkStudent(student)}
                        disabled={unlinking === student.user_id}
                        title="Remover alumno"
                      >
                        {unlinking === student.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserMinus className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available students card (blue accent) */}
          <Card className="card-glass overflow-hidden border-blue-400/30">
            <CardHeader className="p-4 pb-2 bg-blue-500/10">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-sm text-blue-500">Alumnos disponibles ({availableStudents.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 overflow-y-auto max-h-[30vh]">
              {loadingAvailable ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-blue-500" /></div>
              ) : availableStudents.length === 0 ? (
                <div className="text-center py-6">
                  <Users className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">No hay alumnos disponibles</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableStudents.map((student) => (
                    <div key={student.user_id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 border border-transparent">
                      <Avatar className="h-9 w-9 border border-blue-400/20 flex-shrink-0">
                        <AvatarImage src={student.avatar_url || undefined} />
                        <AvatarFallback className="bg-blue-500/10 text-blue-500 font-bold text-xs">
                          {student.avatar_initials || student.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium truncate flex-1 min-w-0">{student.display_name}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-blue-400/30 text-blue-500 hover:bg-blue-500/10 flex-shrink-0 h-8 px-3"
                        disabled={linking === student.user_id}
                        onClick={() => linkStudent(student.user_id)}
                      >
                        {linking === student.user_id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Agregar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN – Student Detail */}
        <Card className="card-glass overflow-hidden">
          {!selectedStudent ? (
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">Seleccioná un alumno de la lista para ver su información</p>
            </CardContent>
          ) : (
            <CardContent className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Profile header */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-accent/30">
                  <AvatarImage src={selectedStudent.avatar_url || undefined} />
                  <AvatarFallback className="bg-accent/10 text-accent font-bold text-2xl">
                    {selectedStudent.avatar_initials || selectedStudent.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-display font-bold neon-text">{selectedStudent.display_name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Edad: {selectedStudent.age || "—"}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={`text-xs ${selectedStudent.paymentStatus === "pagado" ? "border-green-400/50 text-green-600" : "border-orange-400/50 text-orange-600"}`}>
                      {selectedStudent.paymentStatus === "pagado" ? "✓ Pagado" : "⏳ No pagado"}
                    </Badge>
                    <Switch
                      checked={selectedStudent.paymentStatus === "pagado"}
                      onCheckedChange={(c) => handlePaymentToggle(selectedStudent, c)}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive self-start"
                  onClick={() => setDeleteTarget(selectedStudent)}
                  title="Eliminar alumno"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Plan type selector */}
              <div className="flex items-center gap-3">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Tipo de plan:</Label>
                <Select value={selectedStudent.planType} onValueChange={(v) => updatePlanType(selectedStudent.linkId, v)}>
                  <SelectTrigger className="h-8 text-xs w-40 bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rutina section */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-sm">Rutina de entrenamiento</h3>
                </div>
                <p className="text-xs text-muted-foreground">Días restantes para editar la rutina: <span className="font-bold text-foreground">7</span></p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => navigate(`/trainer/students/${selectedStudent.user_id}`)}>
                    <Eye className="h-3.5 w-3.5" /> Ver rutina
                  </Button>
                  <Button size="sm" className="gap-1.5 flex-1" onClick={() => navigate(`/trainer/routines/${selectedStudent.user_id}`)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar rutina
                  </Button>
                </div>
              </div>

              {/* Alimentación section */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Apple className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-sm">Alimentación</h3>
                </div>
                <p className="text-xs text-muted-foreground">Días restantes para cambiar el plan de alimentación: <span className="font-bold text-foreground">5</span></p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => navigate(`/trainer/students/${selectedStudent.user_id}`)}>
                    <Eye className="h-3.5 w-3.5" /> Ver comidas
                  </Button>
                  <Button size="sm" className="gap-1.5 flex-1" onClick={() => navigate(`/trainer/students/${selectedStudent.user_id}`)}>
                    <Pencil className="h-3.5 w-3.5" /> Editar comidas
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-secondary/30 text-center">
                  <p className="text-2xl font-bold text-accent">{selectedStudent.unlockedCount}/12</p>
                  <p className="text-[10px] text-muted-foreground">Niveles</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30 text-center">
                  <p className="text-2xl font-bold">{selectedStudent.age || "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Edad</p>
                </div>
                <div className="p-3 rounded-xl bg-secondary/30 text-center">
                  <p className="text-2xl font-bold">{selectedStudent.weight ? `${selectedStudent.weight}kg` : "—"}</p>
                  <p className="text-[10px] text-muted-foreground">Peso</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar alumno permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{deleteTarget?.display_name}</strong> de forma permanente?
              Esta acción eliminará todos los ejercicios, planes, registros y seguimiento asociados.
              <span className="block mt-2 font-semibold text-destructive">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStudent}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sí, eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
