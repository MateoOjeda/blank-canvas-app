import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
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
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { ChunkedBatch } from "@/lib/chunking";
import {
  fetchRoutineData,
  saveDayConfig as saveDayConfigService,
  addExercise as addExerciseService,
  removeExercise as removeExerciseService,
  bulkRemoveExercises,
  logTrainerChange,
  addBiSerieChild,
  removeBiSerieChild,
  autoUpdateRoutineCycle,
  getOrCreateActiveRoutine,
  type Exercise,
  type DayConfig,
  type ExerciseType,
} from "@/services/routines";
import { EXERCISES_BY_BODY_PART, type BodyPart } from "@/lib/exercisesByBodyPart";
import { toast } from "sonner";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/**
 * Central hook for the RoutinesPage.
 * Encapsulates all state, data-fetching, mutations and derived values.
 */
export function useRoutines() {
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
  const [routineAssignmentDate, setRoutineAssignmentDate] = useState<string | null>(null);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", sets: "", reps: "",
    isToFailure: false, isDropset: false, isPiramide: false, pyramidReps: "",
    exerciseType: "NORMAL" as ExerciseType,
  });
  const [biSerieEnabled, setBiSerieEnabled] = useState(false);
  const [biForm, setBiForm] = useState({
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
      setLoadingExercises(true);
      try {
        const qEx = query(collection(db, "group_exercises"), where("group_id", "==", urlGroupId));
        const qDay = query(collection(db, "routine_day_config"), where("student_id", "==", urlGroupId));

        const [exSnap, daySnap] = await Promise.all([
          getDocs(qEx),
          getDocs(qDay)
        ]);

        const groupExercises = exSnap.docs.map((d: any) => ({
          id: d.id,
          ...d.data(),
          student_id: urlGroupId,
          completed: false,
          parent_exercise_id: d.data().parent_exercise_id || null,
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
      setRoutineAssignmentDate(data.routineAssignmentDate);
      setActiveRoutineId(data.routineId || null);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Error fetching routine data:", err);
    } finally {
      setLoadingExercises(false);
    }
  }, [user, selectedStudent, isGroupMode, urlGroupId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Derived values
  const currentDayConfig = dayConfigs[selectedDay] || { day: selectedDay, body_part_1: "", body_part_2: "" };
  const bodyPart1 = currentDayConfig.body_part_1 as BodyPart;
  const bodyPart2 = currentDayConfig.body_part_2 as BodyPart;
  const availableExercises = [
    ...(bodyPart1 ? EXERCISES_BY_BODY_PART[bodyPart1] || [] : []),
    ...(bodyPart2 && bodyPart2 !== bodyPart1 ? EXERCISES_BY_BODY_PART[bodyPart2] || [] : []),
  ];
  const combinedBodyPart = [currentDayConfig.body_part_1, currentDayConfig.body_part_2].filter(Boolean).join(" y ");

  const parentExercises = exercises.filter((e) => e.day === selectedDay && !e.parent_exercise_id);
  const childExercises = exercises.filter((e) => e.day === selectedDay && e.parent_exercise_id);
  const childByParent = new Map<string, Exercise>();
  childExercises.forEach((c) => { if (c.parent_exercise_id) childByParent.set(c.parent_exercise_id, c); });

  // Handlers
  const handleSaveDayConfig = async (field: "body_part_1" | "body_part_2", value: string) => {
    if (!user) return;
    const targetId = isGroupMode ? urlGroupId! : selectedStudent;
    if (!targetId) return;
    const updated = { ...currentDayConfig, [field]: value === "none" ? "" : value };
    setDayConfigs((prev) => ({ ...prev, [selectedDay]: updated }));
    await saveDayConfigService(user.uid, targetId, selectedDay, updated.body_part_1, updated.body_part_2);
    if (!isGroupMode) {
      await autoUpdateRoutineCycle(user.uid, selectedStudent);
      fetchData();
    }
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
    if (biSerieEnabled) {
      if (!biForm.name) {
        toast.error("Selecciona el ejercicio para la Bi Serie");
        return;
      }
      if (!biForm.isToFailure && !biForm.reps) {
        toast.error("Completa las repeticiones de Bi Serie o activa 'Al Fallo'");
        return;
      }
    }

    const repsDisplay = form.isPiramide ? form.pyramidReps : (form.isToFailure ? "Al Fallo" : form.reps);

    try {
      if (isGroupMode) {
        const exerciseType = form.isToFailure ? "AL_FALLO" : form.isDropset ? "DROP_SET" : form.isPiramide ? "PIRAMIDE" : "NORMAL";
        const parentDocRef = await addDoc(collection(db, "group_exercises"), {
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

        if (biSerieEnabled) {
          await addDoc(collection(db, "group_exercises"), {
            group_id: urlGroupId!,
            trainer_id: user.uid,
            name: biForm.name,
            sets: parseInt(form.sets),
            reps: biForm.isToFailure ? 0 : parseInt(biForm.reps),
            weight: 0,
            day: selectedDay,
            body_part: combinedBodyPart || currentDayConfig.body_part_1,
            is_to_failure: biForm.isToFailure,
            is_dropset: biForm.isDropset,
            is_piramide: false,
            pyramid_reps: null,
            exercise_type: "BI_SERIE",
            parent_exercise_id: parentDocRef.id,
            created_at: new Date().toISOString()
          });
        }
      } else {
        const routine = await getOrCreateActiveRoutine(user.uid, "ALUMNO", selectedStudent);
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
          routine_id: routine.id,
        });

        try {
          // Ya no necesitamos actualizar el routine_id porque se lo pasamos al crear
        } catch (err) {
          console.error("Error linking to routine:", err);
        }

        await logTrainerChange(user.uid, selectedStudent, "exercise_added",
          `Nuevo ejercicio: ${form.name} (${form.sets}×${repsDisplay} - ${selectedDay} - ${combinedBodyPart})`,
          newId || undefined
        );

        if (biSerieEnabled && newId) {
          await addExerciseService({
            trainer_id: user.uid,
            student_id: selectedStudent,
            name: biForm.name,
            sets: parseInt(form.sets),
            reps: biForm.isToFailure ? 0 : parseInt(biForm.reps),
            weight: 0,
            day: selectedDay,
            body_part: combinedBodyPart || currentDayConfig.body_part_1,
            is_to_failure: biForm.isToFailure,
            is_dropset: biForm.isDropset,
            is_piramide: false,
            pyramid_reps: null,
            exercise_type: "BI_SERIE",
            parent_exercise_id: newId,
            routine_id: routine.id,
          });
        }
      }

      if (!isGroupMode) {
        await autoUpdateRoutineCycle(user.uid, selectedStudent);
      }

      toast.success(biSerieEnabled ? "Ejercicio + Bi Serie agregados" : "Ejercicio agregado");
      setForm({ name: "", sets: "", reps: "", isToFailure: false, isDropset: false, isPiramide: false, pyramidReps: "", exerciseType: "NORMAL" });
      setBiForm({ name: "", reps: "", isToFailure: false, isDropset: false });
      setBiSerieEnabled(false);
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
        await autoUpdateRoutineCycle(user.uid, selectedStudent);
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
        const batch = new ChunkedBatch(db);
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
        await autoUpdateRoutineCycle(user.uid, selectedStudent);
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

  const handleToggleBiSerie = async (ex: Exercise) => {
    if (!user) return;
    const targetId = isGroupMode ? urlGroupId : selectedStudent;
    if (!targetId) return;
    const hasChild = childByParent.has(ex.id);
    try {
      if (hasChild) {
        if (isGroupMode) {
          const childEx = childByParent.get(ex.id);
          if (childEx) await deleteDoc(doc(db, "group_exercises", childEx.id));
        } else {
          await removeBiSerieChild(ex.id);
        }
        toast.success("Bi Serie eliminada");
      } else {
        if (isGroupMode) {
          await addDoc(collection(db, "group_exercises"), {
            group_id: urlGroupId!,
            trainer_id: user.uid,
            name: "Bi Serie",
            sets: ex.sets,
            reps: ex.reps,
            weight: 0,
            day: ex.day,
            body_part: ex.body_part,
            is_to_failure: false,
            is_dropset: false,
            is_piramide: false,
            pyramid_reps: null,
            exercise_type: "BI_SERIE",
            parent_exercise_id: ex.id,
            created_at: new Date().toISOString()
          });
        } else {
          await addBiSerieChild(ex, user.uid, selectedStudent);
        }
        toast.success("Bi Serie agregada");
      }

      if (!isGroupMode) {
        await autoUpdateRoutineCycle(user.uid, selectedStudent);
      }

      fetchData();
    } catch { toast.error("Error al modificar Bi Serie"); }
  };

  const handleBackToList = () => {
    setSelectedStudent("");
    navigate("/trainer/groups");
  };

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  const student = students.find((s) => s.user_id === selectedStudent);

  return {
    // Auth & routing
    user,
    navigate,
    isGroupMode,
    urlStudentId,
    urlGroupId,
    activeTab,
    setActiveTab,
    // Students
    students,
    loadingStudents,
    student,
    selectedStudent,
    setSelectedStudent,
    // Group
    groupName,
    // Exercises
    exercises,
    loadingExercises,
    // Day
    selectedDay,
    setSelectedDay,
    dayConfigs,
    currentDayConfig,
    combinedBodyPart,
    availableExercises,
    routineNextChange,
    routineAssignmentDate,
    activeRoutineId,
    // Form
    form,
    setForm,
    biSerieEnabled,
    setBiSerieEnabled,
    biForm,
    setBiForm,
    // Selection
    selectedIds,
    setSelectedIds,
    showDeleteConfirm,
    setShowDeleteConfirm,
    deleting,
    // Nutrition
    nutritionLevel,
    // Derived
    parentExercises,
    childByParent,
    // Handlers
    handleSaveDayConfig,
    handleAdd,
    handleRemove,
    handleBulkDelete,
    toggleSelect,
    handleToggleBiSerie,
    handleBackToList,
  };
}
