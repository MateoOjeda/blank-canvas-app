import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchRoutineData,
  saveDayConfig as saveDayConfigService,
  addExercise as addExerciseService,
  removeExercise as removeExerciseService,
  bulkRemoveExercises,
  logTrainerChange,
  setRoutineNextChangeDate,
  addViSerieChild,
  removeViSerieChild,
  EXERCISE_TYPES,
  type Exercise,
  type DayConfig,
  type ExerciseType,
} from "@/services/rutinas";
import { getOrCreateActiveRoutine, linkExercisesToRoutine } from "@/services/routineManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Dumbbell, Loader2, CalendarClock, Users2 } from "lucide-react";
import { toast } from "sonner";
import { BODY_PARTS, EXERCISES_BY_BODY_PART, type BodyPart } from "@/lib/exercisesByBodyPart";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

export default function RoutinesPage() {
  const { user } = useAuth();
  const { studentId: urlStudentId, groupId: urlGroupId } = useParams<{ studentId?: string; groupId?: string }>();
  const isGroupMode = !!urlGroupId;
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [groupName, setGroupName] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Lunes");
  const [dayConfigs, setDayConfigs] = useState<Record<string, DayConfig>>({});
  const [routineNextChange, setRoutineNextChange] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", sets: "", reps: "",
    isToFailure: false, isDropset: false, isPiramide: false, pyramidReps: "",
    exerciseType: "NORMAL" as ExerciseType,
  });
  const [viSerieEnabled, setViSerieEnabled] = useState(false);
  const [viForm, setViForm] = useState({
    name: "", sets: "", reps: "",
    isToFailure: false, isDropset: false,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // In group mode, fetch group name
  useEffect(() => {
    if (isGroupMode && urlGroupId && user) {
      supabase.from("training_groups").select("name").eq("id", urlGroupId).single()
        .then(({ data }) => { if (data) setGroupName(data.name); });
    }
  }, [isGroupMode, urlGroupId, user]);

  useEffect(() => {
    if (isGroupMode) return; // Skip student selection in group mode
    if (students.length > 0 && !selectedStudent) {
      if (urlStudentId && students.some(s => s.user_id === urlStudentId)) {
        setSelectedStudent(urlStudentId);
      } else {
        setSelectedStudent(students[0].user_id);
      }
    }
  }, [students, selectedStudent, urlStudentId, isGroupMode]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    if (isGroupMode && urlGroupId) {
      // Group mode: fetch group_exercises
      setLoadingExercises(true);
      const [exRes, dayRes] = await Promise.all([
        supabase.from("group_exercises").select("*").eq("group_id", urlGroupId).eq("trainer_id", user.id),
        supabase.from("routine_day_config").select("day, body_part_1, body_part_2").eq("trainer_id", user.id).eq("student_id", urlGroupId),
      ]);
      const groupExercises = (exRes.data || []).map((e: any) => ({
        ...e,
        student_id: urlGroupId,
        completed: false,
        parent_exercise_id: null,
        exercise_type: e.exercise_type || "NORMAL",
      })) as Exercise[];
      setExercises(groupExercises);
      const dc: Record<string, DayConfig> = {};
      (dayRes.data || []).forEach((d: any) => {
        dc[d.day] = { day: d.day, body_part_1: d.body_part_1 || "", body_part_2: d.body_part_2 || "" };
      });
      setDayConfigs(dc);
      setRoutineNextChange(null);
      setSelectedIds(new Set());
      setLoadingExercises(false);
      return;
    }

    if (!selectedStudent) return;
    setLoadingExercises(true);
    const data = await fetchRoutineData(user.id, selectedStudent);
    setExercises(data.exercises);
    setDayConfigs(data.dayConfigs);
    setRoutineNextChange(data.routineNextChange);
    setSelectedIds(new Set());
    setLoadingExercises(false);
  }, [user, selectedStudent, isGroupMode, urlGroupId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentDayConfig = dayConfigs[selectedDay] || { day: selectedDay, body_part_1: "", body_part_2: "" };
  const bodyPart1 = currentDayConfig.body_part_1 as BodyPart;
  const bodyPart2 = currentDayConfig.body_part_2 as BodyPart;
  const availableExercises = [
    ...(bodyPart1 ? EXERCISES_BY_BODY_PART[bodyPart1] || [] : []),
    ...(bodyPart2 && bodyPart2 !== bodyPart1 ? EXERCISES_BY_BODY_PART[bodyPart2] || [] : []),
  ];
  const combinedBodyPart = [currentDayConfig.body_part_1, currentDayConfig.body_part_2].filter(Boolean).join(" y ");

  const handleSaveDayConfig = async (field: "body_part_1" | "body_part_2", value: string) => {
    if (!user) return;
    const targetId = isGroupMode ? urlGroupId! : selectedStudent;
    if (!targetId) return;
    const updated = { ...currentDayConfig, [field]: value === "none" ? "" : value };
    setDayConfigs((prev) => ({ ...prev, [selectedDay]: updated }));
    await saveDayConfigService(user.id, targetId, selectedDay, updated.body_part_1, updated.body_part_2);
  };

  const validatePyramidReps = (value: string): boolean => {
    if (!value.trim()) return false;
    return /^\d+(-\d+)*$/.test(value.trim());
  };

  const handleAdd = async () => {
    if (!user) return;
    const targetId = isGroupMode ? urlGroupId! : selectedStudent;
    if (!targetId) return;
    if (!form.name || !form.sets || !currentDayConfig.body_part_1) {
      toast.error("Selecciona el grupo muscular del día y completa los campos");
      return;
    }
    if (form.isPiramide) {
      if (!validatePyramidReps(form.pyramidReps)) {
        toast.error("Formato de pirámide inválido. Usa números separados por guiones (ej: 12-10-8-10-12)");
        return;
      }
    } else if (!form.isToFailure && !form.reps) {
      toast.error("Completa las repeticiones o activa 'Al Fallo'");
      return;
    }
    if (viSerieEnabled) {
      if (!viForm.name || !viForm.sets) {
        toast.error("Completa los campos del ejercicio VI Serie");
        return;
      }
      if (!viForm.isToFailure && !viForm.reps) {
        toast.error("Completa las repeticiones de VI Serie o activa 'Al Fallo'");
        return;
      }
    }

    const repsDisplay = form.isPiramide ? form.pyramidReps : (form.isToFailure ? "Al Fallo" : form.reps);

    try {
      if (isGroupMode) {
        // Group mode: insert into group_exercises
        const { data, error } = await supabase.from("group_exercises").insert({
          group_id: urlGroupId!,
          trainer_id: user.id,
          name: form.name,
          sets: parseInt(form.sets),
          reps: form.isToFailure || form.isPiramide ? 0 : parseInt(form.reps),
          weight: 0,
          day: selectedDay,
          body_part: combinedBodyPart || currentDayConfig.body_part_1,
          is_to_failure: form.isToFailure,
          is_dropset: form.isDropset,
          is_piramide: form.isPiramide,
          pyramid_reps: form.isPiramide ? form.pyramidReps.trim() : null,
          exercise_type: form.exerciseType,
        }).select("id").single();
        if (error) throw error;
      } else {
        // Student mode
        const newId = await addExerciseService({
          trainer_id: user.id,
          student_id: selectedStudent,
          name: form.name,
          sets: parseInt(form.sets),
          reps: form.isToFailure || form.isPiramide ? 0 : parseInt(form.reps),
          weight: 0,
          day: selectedDay,
          body_part: combinedBodyPart || currentDayConfig.body_part_1,
          is_to_failure: form.isToFailure,
          is_dropset: form.isDropset,
          is_piramide: form.isPiramide,
          pyramid_reps: form.isPiramide ? form.pyramidReps.trim() : null,
          exercise_type: form.exerciseType,
        });

        // Ensure routine exists and link
        try {
          const routine = await getOrCreateActiveRoutine(user.id, "ALUMNO", selectedStudent);
          if (newId) {
            await supabase.from("exercises").update({ routine_id: routine.id } as any).eq("id", newId);
          }
        } catch {}

        await logTrainerChange(user.id, selectedStudent, "exercise_added",
          `Nuevo ejercicio: ${form.name} (${form.sets}×${repsDisplay} - ${selectedDay} - ${combinedBodyPart})`,
          newId || undefined
        );

        if (viSerieEnabled && newId) {
          await addExerciseService({
            trainer_id: user.id,
            student_id: selectedStudent,
            name: viForm.name,
            sets: parseInt(viForm.sets),
            reps: viForm.isToFailure ? 0 : parseInt(viForm.reps),
            weight: 0,
            day: selectedDay,
            body_part: combinedBodyPart || currentDayConfig.body_part_1,
            is_to_failure: viForm.isToFailure,
            is_dropset: viForm.isDropset,
            is_piramide: false,
            pyramid_reps: null,
            exercise_type: "VI_SERIE",
            parent_exercise_id: newId,
          });
        }
      }

      toast.success(viSerieEnabled ? "Ejercicio + VI Serie agregados" : "Ejercicio agregado");
      setForm({ name: "", sets: "", reps: "", isToFailure: false, isDropset: false, isPiramide: false, pyramidReps: "", exerciseType: "NORMAL" });
      setViForm({ name: "", sets: "", reps: "", isToFailure: false, isDropset: false });
      setViSerieEnabled(false);
      fetchData();
    } catch { toast.error("Error al agregar ejercicio"); }
  };

  const handleRemove = async (exerciseId: string) => {
    if (!user) return;
    const exercise = exercises.find((e) => e.id === exerciseId);
    try {
      if (isGroupMode) {
        await supabase.from("group_exercises").delete().eq("id", exerciseId);
      } else {
        await removeExerciseService(exerciseId);
        if (exercise) {
          await logTrainerChange(user.id, selectedStudent, "exercise_removed",
            `Ejercicio eliminado: ${exercise.name} (${exercise.day})`, exerciseId
          );
        }
      }
      fetchData();
    } catch { toast.error("Error al eliminar"); }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      if (isGroupMode) {
        for (const id of ids) {
          await supabase.from("group_exercises").delete().eq("id", id);
        }
      } else {
        await bulkRemoveExercises(ids);
        const changes = ids.map((id) => {
          const ex = exercises.find((e) => e.id === id);
          return logTrainerChange(user.id, selectedStudent, "exercise_removed",
            `Ejercicio eliminado: ${ex?.name || "?"} (${ex?.day || "?"})`, id
          );
        });
        await Promise.all(changes);
      }
      toast.success(`${ids.length} ejercicio(s) eliminado(s)`);
      fetchData();
    } catch { toast.error("Error al eliminar ejercicios"); }
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

  const daysUntilChange = (() => {
    if (!routineNextChange) return null;
    const diff = Math.ceil((new Date(routineNextChange).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();

  const handleSetNextChange = async (days: number) => {
    if (!user || !selectedStudent) return;
    const dateStr = await setRoutineNextChangeDate(user.id, selectedStudent, days);
    setRoutineNextChange(dateStr);
    toast.success(`Cambio de rutina programado en ${days} días`);
  };

  const student = students.find((s) => s.user_id === selectedStudent);
  const parentExercises = exercises.filter((e) => e.day === selectedDay && !e.parent_exercise_id);
  const childExercises = exercises.filter((e) => e.day === selectedDay && e.parent_exercise_id);
  const childByParent = new Map<string, Exercise>();
  childExercises.forEach((c) => { if (c.parent_exercise_id) childByParent.set(c.parent_exercise_id, c); });

  const handleToggleViSerie = async (ex: Exercise) => {
    if (!user || isGroupMode) return;
    if (!selectedStudent) return;
    const hasChild = childByParent.has(ex.id);
    try {
      if (hasChild) {
        await removeViSerieChild(ex.id);
        toast.success("VI Serie eliminada");
      } else {
        await addViSerieChild(ex, user.id, selectedStudent);
        toast.success("VI Serie agregada");
      }
      fetchData();
    } catch { toast.error("Error al modificar VI Serie"); }
  };

  if (loadingStudents && !isGroupMode) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!isGroupMode && students.length === 0) {
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
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">
          {isGroupMode ? `Rutina del Grupo: ${groupName || "..."}` : "Creador de Rutinas"}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isGroupMode ? "Edita la rutina compartida del grupo" : "Prescribe series y repeticiones — el alumno registra el peso"}
        </p>
      </div>

      {isGroupMode ? (
        <Badge variant="outline" className="border-primary/30 text-primary text-xs">
          <Users2 className="h-3 w-3 mr-1" /> Modo Grupo
        </Badge>
      ) : (
        <div className="flex items-end gap-4 flex-wrap">
          <div className="max-w-xs flex-1">
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

          <Card className="card-glass p-3 flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-primary flex-shrink-0" />
            {daysUntilChange !== null ? (
              <p className="text-sm font-semibold">Días restantes para actualizar rutina: <span className="text-primary">{daysUntilChange}</span></p>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Programar cambio en:</p>
                {[7, 14, 21, 30].map((d) => (
                  <Button key={d} size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => handleSetNextChange(d)}>{d}d</Button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Day selector */}
      <div className="flex gap-2 flex-wrap">
        {DAYS.map((day, i) => {
          const count = exercises.filter((e) => e.day === day).length;
          const dc = dayConfigs[day];
          const isActive = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => { setSelectedDay(day); setSelectedIds(new Set()); }}
              className={`relative flex flex-col items-center justify-center w-12 h-14 sm:w-14 sm:h-16 rounded-xl text-xs font-bold transition-all border
                ${isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                  : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/40 hover:bg-secondary"
                }`}
            >
              <span className="text-[11px] sm:text-xs">{DAY_SHORT[i]}</span>
              {count > 0 && <span className={`text-[9px] mt-0.5 ${isActive ? "text-primary-foreground/80" : "text-primary"}`}>{count}</span>}
              {dc?.body_part_1 && <span className={`text-[7px] mt-0.5 truncate max-w-[40px] ${isActive ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>{dc.body_part_1.slice(0, 4)}</span>}
            </button>
          );
        })}
      </div>

      {/* Day body part config */}
      <Card className="card-glass border-primary/20">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 font-semibold">Grupo muscular del {selectedDay}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Principal</Label>
              <Select value={currentDayConfig.body_part_1 || "none"} onValueChange={(v) => handleSaveDayConfig("body_part_1", v)}>
                <SelectTrigger className="bg-secondary/50 border-border"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Ninguno —</SelectItem>
                  {BODY_PARTS.map((bp) => <SelectItem key={bp} value={bp}>{bp}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Secundario <span className="text-muted-foreground/60">(opcional)</span></Label>
              <Select value={currentDayConfig.body_part_2 || "none"} onValueChange={(v) => handleSaveDayConfig("body_part_2", v)}>
                <SelectTrigger className="bg-secondary/50 border-border"><SelectValue placeholder="Secundario" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Ninguno —</SelectItem>
                  {BODY_PARTS.filter((bp) => bp !== currentDayConfig.body_part_1).map((bp) => (
                    <SelectItem key={bp} value={bp}>{bp}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="card-glass neon-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nuevo Ejercicio — {selectedDay}
              {combinedBodyPart && <Badge className="ml-2 bg-primary/20 text-primary border-0 text-xs">{combinedBodyPart}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ejercicio</Label>
              {availableExercises.length > 0 ? (
                <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
                  <SelectTrigger className="bg-secondary/50 border-border"><SelectValue placeholder="Seleccionar ejercicio" /></SelectTrigger>
                  <SelectContent>
                    {availableExercises.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder={currentDayConfig.body_part_1 ? "Escribir ejercicio manualmente" : "Primero configura el grupo muscular del día"}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-secondary/50 border-border"
                  disabled={!currentDayConfig.body_part_1}
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
                  value={form.isToFailure || form.isPiramide ? "" : form.reps}
                  onChange={(e) => setForm({ ...form, reps: e.target.value })}
                  className="bg-secondary/50 border-border"
                  disabled={form.isToFailure || form.isPiramide}
                />
              </div>
            </div>
             <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Tipo de ejercicio</Label>
              <Select value={form.exerciseType} onValueChange={(v) => {
                const newType = v as ExerciseType;
                const updates: Partial<typeof form> = { exerciseType: newType };
                if (newType === "AL_FALLO") {
                  updates.isToFailure = true; updates.isDropset = false; updates.isPiramide = false; updates.pyramidReps = ""; updates.reps = "";
                } else if (newType === "DROP_SET") {
                  updates.isDropset = true; updates.isToFailure = false; updates.isPiramide = false; updates.pyramidReps = "";
                } else if (newType === "PIRAMIDE") {
                  updates.isPiramide = true; updates.isToFailure = false; updates.isDropset = false;
                } else {
                  updates.isToFailure = false; updates.isDropset = false; updates.isPiramide = false; updates.pyramidReps = "";
                }
                setForm((prev) => ({ ...prev, ...updates }));
              }}>
                <SelectTrigger className="bg-secondary/50 border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXERCISE_TYPES.filter(t => t.value !== "VI_SERIE").map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Tipo de serie</Label>
              <div className="flex items-center gap-3">
                <Switch checked={form.isToFailure} onCheckedChange={(checked) => setForm({ ...form, isToFailure: checked, reps: checked ? "" : form.reps })} />
                <div>
                  <Label className="text-sm font-medium cursor-pointer">Al Fallo</Label>
                  <p className="text-xs text-muted-foreground">El alumno hará repeticiones hasta el fallo muscular</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.isDropset} onCheckedChange={(checked) => setForm({ ...form, isDropset: checked })} />
                <div>
                  <Label className="text-sm font-medium cursor-pointer">Drop Set</Label>
                  <p className="text-xs text-muted-foreground">Reducir peso después de la serie y continuar</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.isPiramide} onCheckedChange={(checked) => setForm({ ...form, isPiramide: checked, pyramidReps: checked ? form.pyramidReps : "" })} />
                <div>
                  <Label className="text-sm font-medium cursor-pointer">Pirámide</Label>
                  <p className="text-xs text-muted-foreground">Aumentar peso y bajar repeticiones progresivamente</p>
                </div>
              </div>
              {form.isPiramide && (
                <div className="ml-11 mt-1">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Repeticiones por serie (pirámide)</Label>
                  <Input
                    placeholder="Ej: 12-10-8-10-12"
                    value={form.pyramidReps}
                    onChange={(e) => setForm({ ...form, pyramidReps: e.target.value })}
                    className="bg-secondary/50 border-border mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Números separados por guiones. Ej: 10-8-6-8-10</p>
                </div>
              )}
            </div>

            {/* VI SERIE toggle */}
            <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={viSerieEnabled} onCheckedChange={(checked) => {
                  setViSerieEnabled(checked);
                  if (!checked) setViForm({ name: "", sets: "", reps: "", isToFailure: false, isDropset: false });
                }} />
                <div>
                  <Label className="text-sm font-semibold cursor-pointer text-accent">VI SERIE</Label>
                  <p className="text-xs text-muted-foreground">Agregar un ejercicio complementario vinculado</p>
                </div>
              </div>

              {viSerieEnabled && (
                <div className="space-y-3 pl-2 border-l-2 border-accent/40 ml-2">
                  <p className="text-xs font-semibold text-accent uppercase tracking-wide">Ejercicio VI Serie</p>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ejercicio</Label>
                    {availableExercises.length > 0 ? (
                      <Select value={viForm.name} onValueChange={(v) => setViForm({ ...viForm, name: v })}>
                        <SelectTrigger className="bg-secondary/50 border-border"><SelectValue placeholder="Seleccionar ejercicio" /></SelectTrigger>
                        <SelectContent>
                          {availableExercises.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input placeholder="Escribir ejercicio" value={viForm.name} onChange={(e) => setViForm({ ...viForm, name: e.target.value })} className="bg-secondary/50 border-border" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Series</Label>
                      <Input type="number" placeholder="4" value={viForm.sets} onChange={(e) => setViForm({ ...viForm, sets: e.target.value })} className="bg-secondary/50 border-border" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reps</Label>
                      <Input type="number" placeholder={viForm.isToFailure ? "Al Fallo" : "10"} value={viForm.isToFailure ? "" : viForm.reps} onChange={(e) => setViForm({ ...viForm, reps: e.target.value })} className="bg-secondary/50 border-border" disabled={viForm.isToFailure} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={viForm.isToFailure} onCheckedChange={(checked) => setViForm({ ...viForm, isToFailure: checked, reps: checked ? "" : viForm.reps })} />
                    <Label className="text-sm cursor-pointer">Al Fallo</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={viForm.isDropset} onCheckedChange={(checked) => setViForm({ ...viForm, isDropset: checked })} />
                    <Label className="text-sm cursor-pointer">Drop Set</Label>
                  </div>
                </div>
              )}
            </div>

            <Button onClick={handleAdd} className="w-full" disabled={!currentDayConfig.body_part_1}>
              <Plus className="h-4 w-4 mr-2" /> Agregar a {selectedDay}
            </Button>
          </CardContent>
        </Card>

        {/* Exercise List */}
        <Card className="card-glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                {selectedDay} — {isGroupMode ? (groupName || "Grupo") : (student?.display_name || "—")}
                {combinedBodyPart && <Badge className="ml-2 bg-primary/15 text-primary border-0 text-[10px]">{combinedBodyPart}</Badge>}
              </CardTitle>
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-1" /> Eliminar ({selectedIds.size})
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingExercises ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : parentExercises.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No hay ejercicios para este día</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {parentExercises.map((ex) => {
                  const child = childByParent.get(ex.id);
                  return (
                    <div key={ex.id}>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30">
                        <Checkbox checked={selectedIds.has(ex.id)} onCheckedChange={() => toggleSelect(ex.id)} className="h-4 w-4" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{ex.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {ex.sets}×{ex.is_piramide && ex.pyramid_reps
                              ? <span className="font-semibold text-accent">{ex.pyramid_reps}</span>
                              : ex.is_to_failure
                                ? <span className="font-semibold text-destructive">Al Fallo</span>
                                : ex.reps}
                            {ex.is_dropset && <span className="ml-1 font-semibold text-accent"> · Drop Set</span>}
                            {ex.is_piramide && <span className="ml-1 font-semibold text-primary"> · Pirámide</span>}
                            {(ex.exercise_type && ex.exercise_type !== "NORMAL") && (
                              <Badge className="ml-2 bg-primary/10 text-primary border-0 text-[9px] py-0">{EXERCISE_TYPES.find(t => t.value === ex.exercise_type)?.label || ex.exercise_type}</Badge>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5" title="VI Serie">
                            <Switch checked={!!child} onCheckedChange={() => handleToggleViSerie(ex)} className="scale-75" />
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">VI</span>
                          </div>
                          {ex.completed && <Badge className="bg-primary/20 text-primary text-[10px]">✓</Badge>}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(ex.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {child && (
                        <div className="ml-6 mt-1 flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                          <div className="w-1 h-8 bg-accent rounded-full flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-accent">{child.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {child.sets}×{child.is_to_failure
                                ? <span className="font-semibold text-destructive">Al Fallo</span>
                                : child.reps}
                              {child.is_dropset && <span className="ml-1 font-semibold text-accent"> · Drop Set</span>}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(child.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
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
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
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
