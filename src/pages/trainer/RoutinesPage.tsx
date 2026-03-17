import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BODY_PARTS, EXERCISES_BY_BODY_PART, type BodyPart } from "@/lib/exercisesByBodyPart";
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

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  completed: boolean;
  body_part: string;
  is_to_failure: boolean;
  is_dropset: boolean;
  is_piramide: boolean;
}

export default function RoutinesPage() {
  const { user } = useAuth();
  const { studentId: urlStudentId } = useParams<{ studentId?: string }>();
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [form, setForm] = useState({ name: "", sets: "", reps: "", day: "", bodyPart: "", bodyPart2: "", isToFailure: false });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      if (urlStudentId && students.some(s => s.user_id === urlStudentId)) {
        setSelectedStudent(urlStudentId);
      } else {
        setSelectedStudent(students[0].user_id);
      }
    }
  }, [students, selectedStudent, urlStudentId]);

  const fetchExercises = useCallback(async () => {
    if (!user || !selectedStudent) return;
    setLoadingExercises(true);
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .eq("trainer_id", user.id)
      .eq("student_id", selectedStudent);
    setExercises((data as Exercise[]) || []);
    setSelectedIds(new Set());
    setLoadingExercises(false);
  }, [user, selectedStudent]);

  useEffect(() => { fetchExercises(); }, [fetchExercises]);

  // Merge exercises from both body parts
  const bodyPart1 = form.bodyPart as BodyPart;
  const bodyPart2 = form.bodyPart2 as BodyPart;
  const availableExercises = [
    ...(bodyPart1 ? EXERCISES_BY_BODY_PART[bodyPart1] || [] : []),
    ...(bodyPart2 && bodyPart2 !== bodyPart1 ? EXERCISES_BY_BODY_PART[bodyPart2] || [] : []),
  ];

  const combinedBodyPart = [form.bodyPart, form.bodyPart2].filter(Boolean).join(" y ");

  const handleAdd = async () => {
    if (!user || !selectedStudent) return;
    if (!form.name || !form.sets || !form.day || !form.bodyPart) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    if (!form.isToFailure && !form.reps) {
      toast.error("Completa las repeticiones o activa 'Al Fallo'");
      return;
    }
    const { data, error } = await supabase.from("exercises").insert({
      trainer_id: user.id,
      student_id: selectedStudent,
      name: form.name,
      sets: parseInt(form.sets),
      reps: form.isToFailure ? 0 : parseInt(form.reps),
      weight: 0,
      day: form.day,
      body_part: combinedBodyPart || form.bodyPart,
      is_to_failure: form.isToFailure,
    } as any).select("id").single();
    if (error) {
      toast.error("Error al agregar ejercicio");
    } else {
      await supabase.from("trainer_changes").insert({
        trainer_id: user.id,
        student_id: selectedStudent,
        change_type: "exercise_added",
        description: `Nuevo ejercicio: ${form.name} (${form.sets}×${form.isToFailure ? "Al Fallo" : form.reps} - ${form.day} - ${combinedBodyPart})`,
        entity_id: data?.id,
      });
      toast.success("Ejercicio agregado");
      setForm({ name: "", sets: "", reps: "", day: "", bodyPart: "", bodyPart2: "", isToFailure: false });
      fetchExercises();
    }
  };

  const handleRemove = async (exerciseId: string) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
    if (error) {
      toast.error("Error al eliminar");
    } else {
      if (exercise) {
        await supabase.from("trainer_changes").insert({
          trainer_id: user!.id,
          student_id: selectedStudent,
          change_type: "exercise_removed",
          description: `Ejercicio eliminado: ${exercise.name} (${exercise.day})`,
          entity_id: exerciseId,
        });
      }
      fetchExercises();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from("exercises").delete().in("id", ids);
    if (error) {
      toast.error("Error al eliminar ejercicios");
    } else {
      // Log changes
      const changes = ids.map((id) => {
        const ex = exercises.find((e) => e.id === id);
        return {
          trainer_id: user!.id,
          student_id: selectedStudent,
          change_type: "exercise_removed",
          description: `Ejercicio eliminado: ${ex?.name || "?"} (${ex?.day || "?"})`,
          entity_id: id,
        };
      });
      await supabase.from("trainer_changes").insert(changes);
      toast.success(`${ids.length} ejercicio(s) eliminado(s)`);
      fetchExercises();
    }
    setDeleting(false);
    setShowDeleteConfirm(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const student = students.find((s) => s.user_id === selectedStudent);

  if (loadingStudents) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Creador de Rutinas</h1>
          <p className="text-muted-foreground text-sm mt-1">Asigna ejercicios a tus alumnos</p>
        </div>
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Primero vincula alumnos en la sección "Mis Alumnos".</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Creador de Rutinas</h1>
        <p className="text-muted-foreground text-sm mt-1">Prescribe series y repeticiones — el alumno registra el peso</p>
      </div>

      <div className="max-w-xs">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Alumno</Label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue placeholder="Seleccionar alumno" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="card-glass neon-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nuevo Ejercicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Día</Label>
              <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v })}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Seleccionar día" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Grupo Muscular 1</Label>
                <Select value={form.bodyPart} onValueChange={(v) => setForm({ ...form, bodyPart: v, name: "" })}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder="Principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_PARTS.map((bp) => <SelectItem key={bp} value={bp}>{bp}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Grupo Muscular 2 <span className="text-muted-foreground/60">(opcional)</span></Label>
                <Select value={form.bodyPart2} onValueChange={(v) => setForm({ ...form, bodyPart2: v, name: "" })}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder="Secundario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Ninguno —</SelectItem>
                    {BODY_PARTS.filter((bp) => bp !== form.bodyPart).map((bp) => (
                      <SelectItem key={bp} value={bp}>{bp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ejercicio</Label>
              {availableExercises.length > 0 ? (
                <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue placeholder="Seleccionar ejercicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableExercises.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Primero selecciona el grupo muscular"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-secondary/50 border-border"
                  disabled={!form.bodyPart}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Series</Label>
                <Input type="number" placeholder="4" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} className="bg-secondary/50 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reps</Label>
                <Input
                  type="number"
                  placeholder={form.isToFailure ? "Al Fallo" : "10"}
                  value={form.isToFailure ? "" : form.reps}
                  onChange={(e) => setForm({ ...form, reps: e.target.value })}
                  className="bg-secondary/50 border-border"
                  disabled={form.isToFailure}
                />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
              <Switch
                checked={form.isToFailure}
                onCheckedChange={(checked) => setForm({ ...form, isToFailure: checked, reps: checked ? "" : form.reps })}
              />
              <div>
                <Label className="text-sm font-medium cursor-pointer">Al Fallo</Label>
                <p className="text-xs text-muted-foreground">El alumno hará repeticiones hasta el fallo muscular</p>
              </div>
            </div>
            <Button onClick={handleAdd} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Ejercicio
            </Button>
          </CardContent>
        </Card>

        {/* Exercise List */}
        <Card className="card-glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                Ejercicios de {student?.display_name || "—"}
              </CardTitle>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar ({selectedIds.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingExercises ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : exercises.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sin ejercicios asignados</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {DAYS.map((day) => {
                  const dayExercises = exercises.filter((e) => e.day === day);
                  if (dayExercises.length === 0) return null;
                  return (
                    <div key={day}>
                      <Badge variant="outline" className="mb-2 border-primary/30 text-primary text-[10px]">{day}</Badge>
                      {dayExercises.map((ex) => (
                        <div key={ex.id} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 mb-1">
                          <Checkbox
                            checked={selectedIds.has(ex.id)}
                            onCheckedChange={() => toggleSelect(ex.id)}
                            className="h-4 w-4"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{ex.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {ex.body_part && <span className="text-primary">{ex.body_part} · </span>}
                              {ex.sets}×{ex.is_to_failure ? <span className="text-amber-400 font-semibold">Al Fallo</span> : ex.reps}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ex.completed && <Badge className="bg-primary/20 text-primary text-[10px]">✓</Badge>}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(ex.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {selectedIds.size} ejercicio(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán los ejercicios seleccionados de la rutina del alumno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
