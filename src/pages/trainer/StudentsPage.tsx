import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchLinkedStudents as fetchLinkedStudentsService,
  fetchAvailableStudents as fetchAvailableStudentsService,
  linkStudent as linkStudentService,
  unlinkStudent as unlinkStudentService,
  deleteStudentPermanently,
  updatePaymentStatus,
  type LinkedStudent,
  type AvailableStudent,
} from "@/services/alumnos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Loader2, Trash2, Dumbbell, Apple, Eye, Pencil, Plus, UserMinus } from "lucide-react";
import { toast } from "sonner";

const PLAN_LEVEL_OPTIONS = [
  { value: "inicial", label: "Inicial", color: "text-green-600 border-green-400/50 bg-green-500/10" },
  { value: "intermedio", label: "Intermedio", color: "text-orange-600 border-orange-400/50 bg-orange-500/10" },
  { value: "avanzado", label: "Avanzado", color: "text-red-600 border-red-400/50 bg-red-500/10" },
];

const getLevelColor = (level: string) =>
  PLAN_LEVEL_OPTIONS.find((o) => o.value === level)?.color || "";

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

  const refreshAll = useCallback(async () => {
    if (!user) return;
    const [linked, available] = await Promise.all([
      fetchLinkedStudentsService(user.id),
      fetchAvailableStudentsService(user.id),
    ]);
    setLinkedStudents(linked);
    setAvailableStudents(available);
    setLoading(false);
    setLoadingAvailable(false);
  }, [user]);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  const handleLink = async (studentId: string) => {
    if (!user) return;
    setLinking(studentId);
    try {
      await linkStudentService(user.id, studentId);
      toast.success("Alumno vinculado correctamente");
      await refreshAll();
    } catch { toast.error("Error al vincular alumno"); }
    setLinking(null);
  };

  const handleUnlink = async (student: LinkedStudent) => {
    if (!user) return;
    setUnlinking(student.user_id);
    try {
      await unlinkStudentService(user.id, student.user_id);
      toast.success("Alumno removido correctamente");
      if (selectedStudentId === student.user_id) setSelectedStudentId(null);
      await refreshAll();
    } catch { toast.error("Error al remover alumno"); }
    setUnlinking(null);
  };

  const handlePaymentToggle = async (student: LinkedStudent, checked: boolean) => {
    const newStatus = checked ? "pagado" : "pendiente";
    setLinkedStudents((prev) => prev.map((s) => s.user_id === student.user_id ? { ...s, paymentStatus: newStatus } : s));
    try {
      await updatePaymentStatus(student.linkId, newStatus as "pagado" | "pendiente");
    } catch {
      toast.error("Error al actualizar pago");
      setLinkedStudents((prev) => prev.map((s) => s.user_id === student.user_id ? { ...s, paymentStatus: checked ? "pendiente" : "pagado" } : s));
    }
  };

  const confirmDeleteStudent = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudentPermanently(user.id, deleteTarget.user_id);
      toast.success("Alumno eliminado permanentemente");
      if (selectedStudentId === deleteTarget.user_id) setSelectedStudentId(null);
      await refreshAll();
    } catch { toast.error("Error al eliminar alumno"); }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const selectedStudent = linkedStudents.find((s) => s.user_id === selectedStudentId) || null;

  return (
    <div className="container-responsive space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">Panel del Entrenador</h1>
        <p className="text-muted-foreground text-sm">Gestiona y supervisa a tus alumnos de forma eficiente</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 min-h-[70vh]">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-6">
          {/* Linked students */}
          <Card className="card-premium overflow-hidden border-accent/20">
            <CardHeader className="p-5 pb-3 bg-accent/5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-accent/10 rounded-lg text-accent">
                  <Users className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-accent">Alumnos vinculados ({linkedStudents.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 overflow-y-auto max-h-[45vh] hide-scrollbar">
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
                          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                            <Badge variant="outline" className={cn(
                              "border-none shadow-sm shadow-black/20",
                              student.paymentStatus === "pagado" ? "badge-status-pagado" : "badge-status-pendiente"
                            )}>
                              {student.paymentStatus === "pagado" ? "✓ Pagado" : "⏳ Pendiente"}
                            </Badge>
                            {student.groupName && (
                              <Badge className="badge-info-tag border-none shadow-sm shadow-black/20">
                                {student.groupName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleUnlink(student)}
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

          {/* Available students */}
          <Card className="card-premium overflow-hidden border-blue-400/20">
            <CardHeader className="p-5 pb-3 bg-blue-500/5">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <Users className="h-5 w-5" />
                </div>
                <CardTitle className="text-base text-blue-500">Alumnos disponibles ({availableStudents.length})</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-3 overflow-y-auto max-h-[40vh] hide-scrollbar">
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
                        size="sm" variant="outline"
                        className="gap-1 border-blue-400/30 text-blue-500 hover:bg-blue-500/10 flex-shrink-0 h-8 px-3"
                        disabled={linking === student.user_id}
                        onClick={() => handleLink(student.user_id)}
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

        {/* RIGHT COLUMN */}
        <Card className="card-premium overflow-hidden border-primary/10">
          {!selectedStudent ? (
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
              <Users className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground text-sm">Seleccioná un alumno de la lista para ver su información</p>
            </CardContent>
          ) : (
            <CardContent className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Profile header */}
              <div className="flex items-center gap-4">
                <div 
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  onClick={() => navigate(`/trainer/students/${selectedStudent.user_id}`)}
                >
                  <Avatar className="h-20 w-20 border-2 border-accent/30">
                    <AvatarImage src={selectedStudent.avatar_url || undefined} />
                    <AvatarFallback className="bg-accent/10 text-accent font-bold text-2xl">
                      {selectedStudent.avatar_initials || selectedStudent.display_name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1">
                  <h2 
                    className="text-xl font-display font-bold neon-text cursor-pointer hover:opacity-80 transition-opacity inline-block"
                    onClick={() => navigate(`/trainer/students/${selectedStudent.user_id}`)}
                  >
                    {selectedStudent.display_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${selectedStudent.paymentStatus === "pagado" ? "border-green-400/50 text-green-600" : "border-orange-400/50 text-orange-600"}`}>
                      {selectedStudent.paymentStatus === "pagado" ? "✓ Pagado" : "⏳ No pagado"}
                    </Badge>
                    {selectedStudent.groupName && (
                      <Badge className="badge-info-tag px-3 py-1 text-[11px] border-none shadow-md shadow-primary/10">
                        Grupo: {selectedStudent.groupName}
                      </Badge>
                    )}
                    {(selectedStudent.age || selectedStudent.weight) && (
                      <div className="flex items-center gap-2 ml-1">
                        {selectedStudent.age && (
                          <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-[10px] font-bold px-2 py-0.5">
                            {selectedStudent.age} años
                          </Badge>
                        )}
                        {selectedStudent.weight && (
                          <Badge variant="secondary" className="bg-muted/50 text-muted-foreground text-[10px] font-bold px-2 py-0.5">
                            {selectedStudent.weight}kg
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive self-start"
                  onClick={() => setDeleteTarget(selectedStudent)}
                  title="Eliminar alumno"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Plan selectors */}
              {(!selectedStudent.planEntrenamiento || selectedStudent.planEntrenamiento === "none") && (!selectedStudent.planAlimentacion || selectedStudent.planAlimentacion === "none") ? (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                  <p className="text-sm font-semibold text-destructive">Este alumno no tiene planes asociados</p>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Asignación de planes</h3>
                  </div>

                  <div className="space-y-3">
                    {selectedStudent.planEntrenamiento && selectedStudent.planEntrenamiento !== "none" && (
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-accent" />
                        <Label className="text-sm font-medium">Entrenamiento</Label>
                        <Badge variant="outline" className={`text-[10px] ml-auto ${getLevelColor(selectedStudent.planEntrenamiento)}`}>
                          {PLAN_LEVEL_OPTIONS.find(o => o.value === selectedStudent.planEntrenamiento)?.label || selectedStudent.planEntrenamiento}
                        </Badge>
                      </div>
                    )}

                    {selectedStudent.planAlimentacion && selectedStudent.planAlimentacion !== "none" && (
                      <div className="flex items-center gap-2">
                        <Apple className="h-4 w-4 text-accent" />
                        <Label className="text-sm font-medium">Alimentación</Label>
                        <Badge variant="outline" className={`text-[10px] ml-auto ${getLevelColor(selectedStudent.planAlimentacion)}`}>
                          {PLAN_LEVEL_OPTIONS.find(o => o.value === selectedStudent.planAlimentacion)?.label || selectedStudent.planAlimentacion}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Routine section */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-sm">Rutina de entrenamiento</h3>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="btn-premium-outline flex-1 h-10 text-xs px-0 border-primary/20" onClick={() => navigate(`/trainer/students/${selectedStudent.user_id}`)}>
                    <Eye className="h-4 w-4 mr-2" /> Ver detalle
                  </Button>
                  <Button size="sm" className="btn-premium-primary flex-1 h-10 text-xs px-0" onClick={() => navigate(`/trainer/routines/${selectedStudent.user_id}`)}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar rutina
                  </Button>
                </div>
              </div>

              {/* Meals routine section */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3 mt-3">
                <div className="flex items-center gap-2">
                  <Apple className="h-5 w-5 text-accent" />
                  <h3 className="font-semibold text-sm">Rutina de Alimentación</h3>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" className="btn-premium-outline flex-1 h-10 text-xs px-0 border-primary/20" onClick={() => navigate(`/trainer/students/${selectedStudent.user_id}`)}>
                    <Eye className="h-4 w-4 mr-2" /> Ver detalle
                  </Button>
                  <Button size="sm" className="btn-premium-primary flex-1 h-10 text-xs px-0" onClick={() => navigate(`/trainer/students/${selectedStudent.user_id}`)}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar
                  </Button>
                </div>
              </div>

              {/* Bottom grid removed to relocate info to header */}
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
