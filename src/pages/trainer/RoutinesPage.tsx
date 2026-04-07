import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  setDoc,
  writeBatch
} from "firebase/firestore";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MealsTab from "@/components/trainer/MealsTab";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Dumbbell, Loader2, CalendarClock, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { StudentCard } from "@/components/trainer/StudentCard";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "entrenamiento";
  
  const isGroupMode = !!urlGroupId;
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [groupName, setGroupName] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [selectedDay, setSelectedDay] = useState("Lunes");
  const [dayConfigs, setDayConfigs] = useState<Record<string, DayConfig>>({});
  const [routineNextChange, setRoutineNextChange] = useState<string | null>(null);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", sets: "", reps: "",
    isToFailure: false, isDropset: false, isPiramide: false, pyramidReps: "",
    exerciseType: "NORMAL" as ExerciseType,
  });
  const [viSerieEnabled, setViSerieEnabled] = useState(false);
  const [viForm, setViForm] = useState({
    name: "", reps: "",
    isToFailure: false, isDropset: false,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [nutritionLevel, setNutritionLevel] = useState<string>("none");

  // In group mode, fetch group name
  useEffect(() => {
    if (isGroupMode && urlGroupId && user) {
      getDoc(doc(db, "training_groups", urlGroupId))
        .then((snap) => { if (snap.exists()) setGroupName(snap.data().name); });
    }
  }, [isGroupMode, urlGroupId, user]);

  useEffect(() => {
    if (isGroupMode) return;
    if (students.length > 0 && !selectedStudent) {
      if (urlStudentId && students.some(s => s.user_id === urlStudentId)) {
        setSelectedStudent(urlStudentId);
      }
    }
  }, [students, selectedStudent, urlStudentId, isGroupMode]);

  const fetchData = useCallback(async () => {
    if (!user) return;

    if (isGroupMode && urlGroupId) {
      // Group mode: fetch group_exercises
      setLoadingExercises(true);
      try {
        const qEx = query(collection(db, "group_exercises"), where("group_id", "==", urlGroupId), where("trainer_id", "==", user.uid));
        const qDay = query(collection(db, "routine_day_config"), where("trainer_id", "==", user.uid), where("student_id", "==", urlGroupId));
        
        const [exSnap, daySnap] = await Promise.all([
          getDocs(qEx),
          getDocs(qDay)
        ]);

        const groupExercises = exSnap.docs.map((d: any) => ({
          id: d.id,
          ...d.data(),
          student_id: urlGroupId,
          completed: false,
          parent_exercise_id: null,
          exercise_type: d.data().exercise_type || "NORMAL",
        })) as Exercise[];
        setExercises(groupExercises);

        const dc: Record<string, DayConfig> = {};
        daySnap.docs.forEach((d) => {
          const data = d.data();
          dc[data.day] = { day: data.day, body_part_1: data.body_part_1 || "", body_part_2: data.body_part_2 || "" };
        });
        setDayConfigs(dc);
        setRoutineNextChange(null);
        setSelectedIds(new Set());
      } catch (err) {
        console.error("Error fetching group data:", err);
      } finally {
        setLoadingExercises(false);
      }
      return;
    }

    if (!selectedStudent) return;
    setLoadingExercises(true);
    try {
      const data = await fetchRoutineData(user.uid, selectedStudent);
      
      const qLink = query(collection(db, "trainer_students"), where("trainer_id", "==", user.uid), where("student_id", "==", selectedStudent));
      const linkSnap = await getDocs(qLink);
      
      if (!linkSnap.empty) {
        setNutritionLevel(linkSnap.docs[0].data().plan_alimentacion || "none");
      } else {
        setNutritionLevel("none");
      }

      setExercises(data.exercises);
      setDayConfigs(data.dayConfigs);
      setRoutineNextChange(data.routineNextChange);
      setActiveRoutineId(data.routineId || null);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error fetching routine data:", err);
    } finally {
      setLoadingExercises(false);
    }
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
    await saveDayConfigService(user.uid, targetId, selectedDay, updated.body_part_1, updated.body_part_2);
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
      if (!viForm.name) {
        toast.error("Selecciona el ejercicio para la VI Serie");
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
        const exerciseType = form.isToFailure ? "AL_FALLO" : form.isDropset ? "DROP_SET" : form.isPiramide ? "PIRAMIDE" : "NORMAL";
        await addDoc(collection(db, "group_exercises"), {
          group_id: urlGroupId!,
          trainer_id: user.uid,
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
          exercise_type: exerciseType,
          created_at: new Date().toISOString()
        });
      } else {
        // Student mode
        const exerciseType = form.isToFailure ? "AL_FALLO" : form.isDropset ? "DROP_SET" : form.isPiramide ? "PIRAMIDE" : "NORMAL";
        const newId = await addExerciseService({
          trainer_id: user.uid,
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
          exercise_type: exerciseType,
          routine_id: activeRoutineId || "default",
        });

        // Ensure routine exists and link
        try {
          const routine = await getOrCreateActiveRoutine(user.uid, "ALUMNO", selectedStudent);
          if (newId) {
            await updateDoc(doc(db, "exercises", newId), { routine_id: routine.id });
          }
        } catch (err) {
          console.error("Error linking to routine:", err);
        }

        await logTrainerChange(user.uid, selectedStudent, "exercise_added",
          `Nuevo ejercicio: ${form.name} (${form.sets}×${repsDisplay} - ${selectedDay} - ${combinedBodyPart})`,
          newId || undefined
        );

        if (viSerieEnabled && newId) {
          await addExerciseService({
            trainer_id: user.uid,
            student_id: selectedStudent,
            name: viForm.name,
            sets: parseInt(form.sets),
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
            routine_id: activeRoutineId || "default",
          });
        }
      }

      toast.success(viSerieEnabled ? "Ejercicio + VI Serie agregados" : "Ejercicio agregado");
      setForm({ name: "", sets: "", reps: "", isToFailure: false, isDropset: false, isPiramide: false, pyramidReps: "", exerciseType: "NORMAL" });
      setViForm({ name: "", reps: "", isToFailure: false, isDropset: false });
      setViSerieEnabled(false);
      fetchData();
    } catch (err: any) { 
      console.error("DEBUG ERROR ADDING EXERCISE:", err);
      toast.error("Error: " + (err.message || "al agregar ejercicio")); 
    }
  };

  const handleRemove = async (exerciseId: string) => {
    if (!user) return;
    const exercise = exercises.find((e) => e.id === exerciseId);
    try {
      if (isGroupMode) {
        await deleteDoc(doc(db, "group_exercises", exerciseId));
      } else {
        await removeExerciseService(exerciseId);
        if (exercise) {
          await logTrainerChange(user.uid, selectedStudent, "exercise_removed",
            `Ejercicio eliminado: ${exercise.name} (${exercise.day})`, exerciseId
          );
        }
      }
      fetchData();
    } catch (err) { 
      toast.error("Error al eliminar"); 
    }
  };

  const handleBulkDelete = async () => {
    if (!user || selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      if (isGroupMode) {
        const batch = writeBatch(db);
        ids.forEach(id => batch.delete(doc(db, "group_exercises", id)));
        await batch.commit();
      } else {
        await bulkRemoveExercises(ids);
        for (const id of ids) {
          const ex = exercises.find((e) => e.id === id);
          await logTrainerChange(user.uid, selectedStudent, "exercise_removed",
            `Ejercicio eliminado: ${ex?.name || "?"} (${ex?.day || "?"})`, id
          );
        }
      }
      toast.success(`${ids.length} ejercicio(s) eliminado(s)`);
      fetchData();
    } catch (err) { 
      toast.error("Error al eliminar ejercicios"); 
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

  const daysUntilChange = (() => {
    if (!routineNextChange) return null;
    const diff = Math.ceil((new Date(routineNextChange).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  })();

  const handleSetNextChange = async (days: number) => {
    if (!user || !selectedStudent) return;
    try {
      const dateStr = await setRoutineNextChangeDate(user.uid, selectedStudent, days);
      setRoutineNextChange(dateStr);
      toast.success(`Cambio de rutina programado en ${days} días`);
    } catch (err) {
      toast.error("Error al programar cambio de rutina");
    }
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
        await addViSerieChild(ex, user.uid, selectedStudent);
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
          <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">Creador de Rutinas</h1>
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

  const handleBackToList = () => {
    setSelectedStudent("");
    if (urlStudentId) {
      navigate("/trainer/routines", { replace: true });
    }
  };

  return (
    <div className="container-responsive space-y-6">
      {/* Header section with back button */}
      <div className="flex items-center gap-4">
        {(selectedStudent || isGroupMode) && (
          <Button 
            variant="ghost" size="icon" 
            onClick={handleBackToList}
            className="rounded-full hover:bg-accent/10 text-accent transition-all duration-300 hover:scale-110"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
        )}
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight neon-text uppercase leading-none truncate">
            {isGroupMode ? `Rutina de Grupo: ${groupName}` : "Crear Rutina"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isGroupMode ? "Gestión de ejercicios colectivos" : "Configuración personalizada de entrenamiento"}
          </p>
        </div>
      </div>

      {!isGroupMode && !selectedStudent ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => (
            <StudentCard
              key={s.user_id}
              name={s.display_name}
              avatarUrl={s.avatar_url}
              avatarInitials={s.avatar_initials}
              size="lg"
              onClick={() => setSelectedStudent(s.user_id)}
              subtitle={<span className="text-[10px] text-muted-foreground uppercase tracking-tight">Gestionar rutina</span>}
              className="border-border/40 hover:border-primary/30"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[70vh]">
          {/* Main Content Area */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="card-premium overflow-hidden border-accent/20">
              <CardHeader className="p-6 pb-2 border-b border-white/5 bg-accent/5">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-accent/10 rounded-lg text-accent">
                      <Dumbbell className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">Configuración de Rutina</CardTitle>
                  </div>
                  {!isGroupMode && selectedStudent && (
                    <Badge variant="outline" className="badge-accent-tag">
                      Alumno: {students.find(s => s.user_id === selectedStudent)?.display_name || "Cargando..."}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v })} className="space-y-6">
                  <TabsList className="grid grid-cols-2 bg-secondary/50 max-w-md w-full rounded-xl p-1">
                    <TabsTrigger value="entrenamiento" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Dumbbell className="w-4 h-4 mr-2" />Entrenamiento
                    </TabsTrigger>
                    <TabsTrigger value="alimentacion" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <CalendarClock className="w-4 h-4 mr-2" />Alimentación
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="entrenamiento" className="space-y-8 mt-0">
                    {/* Day selector */}
                    <div className="grid grid-cols-7 gap-2">
                      {DAYS.map((day, i) => {
                        const count = exercises.filter((e) => e.day === day).length;
                        const dc = dayConfigs[day];
                        const isActive = selectedDay === day;
                        return (
                          <button
                            key={day}
                            onClick={() => { setSelectedDay(day); setSelectedIds(new Set()); }}
                            className={cn(
                              "relative flex flex-col items-center justify-center w-full h-16 rounded-2xl text-xs font-bold transition-all border-2",
                              isActive
                                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105 z-10"
                                : "bg-card/40 text-muted-foreground border-border/50 hover:border-primary/40 hover:bg-card/60"
                            )}
                          >
                            <span className="text-[11px] sm:text-xs">{DAY_SHORT[i]}</span>
                            {count > 0 && <span className={cn("text-[10px] mt-0.5", isActive ? "text-primary-foreground" : "text-primary")}>{count}</span>}
                            {dc?.body_part_1 && (
                              <span className={cn(
                                "text-[8px] mt-0.5 truncate max-w-[45px] uppercase tracking-tighter opacity-70",
                                isActive ? "text-primary-foreground" : "text-muted-foreground"
                              )}>
                                {dc.body_part_1.slice(0, 5)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: MUSCULAR CONFIG & FORM */}
                      <div className="space-y-6">
                        <Card className="card-premium border-primary/20 bg-primary/5">
                          <CardContent className="p-4 space-y-4">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              Músculos {selectedDay}
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Principal</Label>
                                <Select value={currentDayConfig.body_part_1 || "none"} onValueChange={(v) => handleSaveDayConfig("body_part_1", v)}>
                                  <SelectTrigger className="input-premium py-1.5 h-10 border-border/40"><SelectValue placeholder="Primario" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">— Ninguno —</SelectItem>
                                    {BODY_PARTS.map((bp) => <SelectItem key={bp} value={bp}>{bp}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Secundario</Label>
                                <Select value={currentDayConfig.body_part_2 || "none"} onValueChange={(v) => handleSaveDayConfig("body_part_2", v)}>
                                  <SelectTrigger className="input-premium py-1.5 h-10 border-border/40"><SelectValue placeholder="Secundario" /></SelectTrigger>
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

                        <Card className="card-premium border-primary/20">
                          <CardHeader className="p-5 pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Users className="h-6 w-6 text-primary" />
                              Nuevo Ejercicio
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-5 pt-0 space-y-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Ejercicio</Label>
                              {availableExercises.length > 0 ? (
                                <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
                                  <SelectTrigger className="input-premium h-11 border-border/40"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                                  <SelectContent>
                                    {availableExercises.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  placeholder={currentDayConfig.body_part_1 ? "Escribir nombre..." : "Configura grupo muscular"}
                                  value={form.name}
                                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                                  className="input-premium h-11 border-border/40"
                                  disabled={!currentDayConfig.body_part_1}
                                />
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Series</Label>
                                <Input type="number" placeholder="4" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} className="input-premium h-11 border-border/40" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1">Repeticiones</Label>
                                <Input
                                  type={form.isToFailure ? "text" : "number"}
                                  placeholder={form.isToFailure ? "Al Fallo" : "12"}
                                  value={form.isToFailure || form.isPiramide ? "" : form.reps}
                                  onChange={(e) => setForm({ ...form, reps: e.target.value })}
                                  className="input-premium h-11 border-border/40"
                                  disabled={form.isToFailure || form.isPiramide}
                                />
                              </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-secondary/20 border border-border/40 space-y-4">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de serie</Label>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold">Al Fallo</span>
                                    <span className="text-[10px] text-muted-foreground">Esfuerzo máximo</span>
                                  </div>
                                  <Switch 
                                    checked={form.isToFailure} 
                                    onCheckedChange={(checked) => setForm({ 
                                      ...form, 
                                      isToFailure: checked, 
                                      reps: checked ? "" : form.reps,
                                      isDropset: checked ? false : form.isDropset,
                                      isPiramide: checked ? false : form.isPiramide
                                    })} 
                                  />
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold">Drop Set</span>
                                    <span className="text-[10px] text-muted-foreground">Descenso de peso</span>
                                  </div>
                                  <Switch 
                                    checked={form.isDropset} 
                                    onCheckedChange={(checked) => setForm({ 
                                      ...form, 
                                      isDropset: checked,
                                      isToFailure: checked ? false : form.isToFailure,
                                      isPiramide: checked ? false : form.isPiramide
                                    })} 
                                  />
                                </div>
                                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold">Pirámide</span>
                                    <span className="text-[10px] text-muted-foreground">Carga progresiva</span>
                                  </div>
                                  <Switch 
                                    checked={form.isPiramide} 
                                    onCheckedChange={(checked) => setForm({ 
                                      ...form, 
                                      isPiramide: checked, 
                                      pyramidReps: checked ? form.pyramidReps : "",
                                      isToFailure: checked ? false : form.isToFailure,
                                      isDropset: checked ? false : form.isDropset
                                    })} 
                                  />
                                </div>
                              </div>
                              {form.isPiramide && (
                                <div className="pt-2 animate-in slide-in-from-top-2">
                                  <Input
                                    placeholder="Reps: 12-10-8-10-12"
                                    value={form.pyramidReps}
                                    onChange={(e) => setForm({ ...form, pyramidReps: e.target.value })}
                                    className="input-premium text-xs h-9"
                                  />
                                </div>
                              )}
                            </div>

                            {/* VI SERIE Section */}
                            {!isGroupMode && (
                              <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 space-y-4">
                                <div className="flex items-center justify-between p-2">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-accent tracking-tight">VI SERIE</span>
                                    <span className="text-[10px] text-muted-foreground">Bi-serie vinculada</span>
                                  </div>
                                  <Switch checked={viSerieEnabled} onCheckedChange={(checked) => {
                                    setViSerieEnabled(checked);
                                    if (!checked) setViForm({ name: "", reps: "", isToFailure: false, isDropset: false });
                                  }} />
                                </div>

                                {viSerieEnabled && (
                                  <div className="space-y-4 pl-3 border-l-2 border-accent/30 animate-in slide-in-from-left-2">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] uppercase text-muted-foreground">Ejercicio Complementario</Label>
                                      {availableExercises.length > 0 ? (
                                        <Select value={viForm.name} onValueChange={(v) => setViForm({ ...viForm, name: v })}>
                                          <SelectTrigger className="input-premium h-10 border-accent/20"><SelectValue placeholder="Ejercicio..." /></SelectTrigger>
                                          <SelectContent>
                                            {availableExercises.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                                          </SelectContent>
                                        </Select>
                                      ) : (
                                        <Input placeholder="Escribir..." value={viForm.name} onChange={(e) => setViForm({ ...viForm, name: e.target.value })} className="input-premium h-10 border-accent/20" />
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground">Reps</Label>
                                        <Input type="number" value={viForm.reps} onChange={(e) => setViForm({ ...viForm, reps: e.target.value })} className="input-premium h-10 border-accent/20" disabled={viForm.isToFailure} />
                                      </div>
                                      <div className="flex flex-col gap-1.5 justify-end pb-1 px-1">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-medium">Al Fallo</span>
                                          <Switch checked={viForm.isToFailure} onCheckedChange={(checked) => setViForm({ ...viForm, isToFailure: checked, reps: checked ? "" : viForm.reps })} className="scale-75 origin-right" />
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11px] font-medium">Drop Set</span>
                                          <Switch checked={viForm.isDropset} onCheckedChange={(checked) => setViForm({ ...viForm, isDropset: checked })} className="scale-75 origin-right" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            <Button onClick={handleAdd} className="btn-premium-primary w-full h-12 shadow-xl" disabled={!currentDayConfig.body_part_1}>
                              <Plus className="h-5 w-5 mr-2" /> Agregar Ejercicio
                            </Button>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Right: EXERCISE LIST */}
                      <div className="space-y-6">
                        <Card className="card-premium overflow-hidden border-primary/20">
                          <CardHeader className="p-5 pb-3 border-b border-white/5 bg-primary/5">
                            <div className="flex items-center justify-between gap-4">
                              <CardTitle className="text-base flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded-md">
                                  <Dumbbell className="h-4 w-4 text-primary" />
                                </div>
                                {selectedDay}
                                {combinedBodyPart && <Badge variant="outline" className="ml-1 border-primary/30 text-[9px] uppercase">{combinedBodyPart}</Badge>}
                              </CardTitle>
                              {selectedIds.size > 0 && (
                                <Button 
                                  variant="destructive" size="sm" 
                                  className="h-8 px-3 rounded-lg text-xs" 
                                  onClick={() => setShowDeleteConfirm(true)} 
                                  disabled={deleting}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Borrar ({selectedIds.size})
                                </Button>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 overflow-y-auto max-h-[700px] hide-scrollbar">
                            {loadingExercises ? (
                              <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
                                <p className="text-xs text-muted-foreground font-medium animate-pulse">Sincronizando sesión...</p>
                              </div>
                            ) : parentExercises.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 opacity-40">
                                <Dumbbell className="h-12 w-12" />
                                <p className="text-sm font-medium">No hay ejercicios cargados</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3">
                                {parentExercises.map((ex) => {
                                  const child = childByParent.get(ex.id);
                                  const isSelected = selectedIds.has(ex.id);
                                  return (
                                    <div key={ex.id} className="group/item">
                                      <div className={cn(
                                        "flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 border",
                                        isSelected 
                                          ? "bg-primary/10 border-primary/40 shadow-inner" 
                                          : "bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10"
                                      )}>
                                        <Checkbox 
                                          checked={isSelected} 
                                          onCheckedChange={() => toggleSelect(ex.id)} 
                                          className="h-5 w-5 rounded-md border-white/20 data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="font-bold text-sm tracking-tight truncate">{ex.name}</p>
                                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-muted-foreground font-medium">
                                            <span className="text-primary/90">{ex.sets} SERIES</span>
                                            <span className="opacity-40">·</span>
                                            <span className={cn(ex.is_to_failure || ex.is_piramide ? "text-destructive" : "text-white/80")}>
                                              {ex.is_piramide && ex.pyramid_reps ? ex.pyramid_reps : ex.is_to_failure ? "AL FALLO" : `${ex.reps} REPS`}
                                            </span>
                                            {ex.is_dropset && (
                                              <>
                                                <span className="opacity-40">·</span>
                                                <Badge className="badge-accent-tag py-0 h-4 text-[8px]">DROP SET</Badge>
                                              </>
                                            )}
                                            {ex.is_piramide && (
                                              <>
                                                <span className="opacity-40">·</span>
                                                <Badge className="badge-info-tag py-0 h-4 text-[8px]">PIRÁMIDE</Badge>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                        <Button 
                                          variant="ghost" size="icon" 
                                          className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                          onClick={() => handleRemove(ex.id)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                      
                                      {child && (
                                        <div className="ml-6 mt-1 flex items-center gap-3 p-3 rounded-2xl bg-accent/5 border border-accent/10 shadow-sm animate-in slide-in-from-left-2">
                                          <div className="w-1.5 h-8 bg-accent/40 rounded-full flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="font-bold text-xs text-accent uppercase tracking-wide truncate">{child.name}</p>
                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-bold">
                                              <span className="text-accent/80">{child.sets} SETS</span>
                                              <span className="text-muted-foreground/40">·</span>
                                              <span className={child.is_to_failure ? "text-destructive" : "text-muted-foreground"}>
                                                {child.is_to_failure ? "AL FALLO" : `${child.reps} REPS`}
                                              </span>
                                              {child.is_dropset && <Badge className="bg-accent/20 text-accent border-0 h-3 text-[7px] px-1 ml-1">DS</Badge>}
                                            </div>
                                          </div>
                                          <Button 
                                            variant="ghost" size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-40 hover:opacity-100 transition-opacity" 
                                            onClick={() => handleRemove(child.id)}
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
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
                    </div>
                  </TabsContent>

                  <TabsContent value="alimentacion" className="mt-0">
                    {(selectedStudent || isGroupMode) ? (
                      <MealsTab studentId={isGroupMode ? urlGroupId! : selectedStudent} nutritionLevel={nutritionLevel} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                        <Users className="h-16 w-16" />
                        <p className="text-lg font-medium">Selecciona un alumno o grupo primero</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidemenu - Actions */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="card-premium border-primary/20 bg-primary/5">
              <CardHeader className="p-6 pb-2 border-b border-primary/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base uppercase tracking-tighter">Control de Ciclo</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {!isGroupMode && (
                  <div className="space-y-4">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                       Próxima Actualización
                    </p>
                    {daysUntilChange !== null ? (
                      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center">
                        <p className="text-3xl font-display font-bold text-primary">{daysUntilChange}</p>
                        <p className="text-[10px] uppercase font-bold text-primary/70 mt-1">Días Restantes</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-2">
                        {[7, 14, 21, 30].map((d) => (
                          <Button 
                            key={d} size="sm" variant="outline" 
                            className="h-10 rounded-lg text-xs font-bold border-primary/20 hover:bg-primary hover:text-white transition-all" 
                            onClick={() => handleSetNextChange(d)}
                          >
                            {d}D
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-3">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Log de Cambios</Label>
                  <div className="p-4 rounded-2xl bg-black/20 border border-white/5 max-h-[150px] overflow-y-auto text-[10px] font-mono leading-relaxed hide-scrollbar">
                    <p className="opacity-40 italic">Iniciando seguimiento de cambios...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* AlertDialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="card-premium border-destructive/20 max-w-sm rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">¿Confirmar Eliminación?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Se eliminarán <span className="font-bold text-destructive">{selectedIds.size}</span> registros permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl border-none hover:bg-white/5">Cerrar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete} 
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/80 text-white rounded-xl shadow-lg shadow-destructive/20"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
