import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchRoutineData,
  saveDayConfig as saveDayConfigService,
  addExercise as addExerciseService,
  removeExercise as removeExerciseService,
  bulkRemoveExercises as bulkRemoveExercisesService,
  logTrainerChange as logTrainerChangeService,
  addBiSerieChild as addBiSerieChildService,
  removeBiSerieChild as removeBiSerieChildService,
  autoUpdateRoutineCycle as autoUpdateRoutineCycleService,
  getOrCreateActiveRoutine,
  archiveActiveRoutine,
  fetchStudentRoutines,
  fetchArchivedRoutines,
  fetchRoutineExercises,
  linkExercisesToRoutine,
  assignGroupRoutineToStudent,
  type Exercise,
  type DayConfig,
  type NewExercise,
} from "@/services/routines";

export function useStudentRoutines(trainerId?: string, studentId?: string) {
  const queryClient = useQueryClient();

  const routineDataQuery = useQuery({
    queryKey: ["routineData", trainerId, studentId],
    queryFn: () => fetchRoutineData(trainerId!, studentId!),
    enabled: !!trainerId && !!studentId,
  });

  const archivedRoutinesQuery = useQuery({
    queryKey: ["archivedRoutines", trainerId, studentId],
    queryFn: () => fetchArchivedRoutines(trainerId!, studentId!),
    enabled: !!trainerId && !!studentId,
  });

  const saveDayConfigMutation = useMutation({
    mutationFn: ({ day, body_part_1, body_part_2 }: { day: string; body_part_1: string; body_part_2: string }) =>
      saveDayConfigService(trainerId!, studentId!, day, body_part_1, body_part_2),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, studentId] });
    },
  });

  const addExerciseMutation = useMutation({
    mutationFn: async (exercise: Omit<NewExercise, "trainer_id" | "student_id" | "routine_id"> & { routine_id?: string }) => {
      let rId = exercise.routine_id;
      // Si no se provee routine_id, se obtiene o crea la rutina activa correspondiente al alumno
      if (!rId) {
        const activeRoutine = await getOrCreateActiveRoutine(trainerId!, "ALUMNO", studentId!);
        rId = activeRoutine.id;
      }
      return addExerciseService({
        ...exercise,
        trainer_id: trainerId!,
        student_id: studentId!,
        routine_id: rId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, studentId] });
    },
  });

  const removeExerciseMutation = useMutation({
    mutationFn: (exerciseId: string) => removeExerciseService(exerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, studentId] });
    },
  });

  const bulkRemoveMutation = useMutation({
    mutationFn: (exerciseIds: string[]) => bulkRemoveExercisesService(exerciseIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, studentId] });
    },
  });

  const logChangeMutation = useMutation({
    mutationFn: ({ changeType, description, entityId }: { changeType: string; description: string; entityId?: string }) =>
      logTrainerChangeService(trainerId!, studentId!, changeType, description, entityId),
  });

  const addBiSerieChildMutation = useMutation({
    mutationFn: async ({ parentId }: { parentId: string; child?: Omit<Exercise, "id"> }) => {
      const parentExercise = routineDataQuery.data?.exercises.find((e) => e.id === parentId);
      if (!parentExercise) {
        throw new Error(`Parent exercise with ID ${parentId} not found in loaded routine data.`);
      }
      return addBiSerieChildService(parentExercise, trainerId!, studentId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, studentId] });
    },
  });

  const removeBiSerieChildMutation = useMutation({
    mutationFn: (childId: string) => removeBiSerieChildService(childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, studentId] });
    },
  });

  const autoUpdateCycleMutation = useMutation({
    mutationFn: () => autoUpdateRoutineCycleService(trainerId!, studentId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, studentId] });
    },
  });

  const assignGroupRoutineMutation = useMutation({
    mutationFn: (groupId: string) => assignGroupRoutineToStudent(trainerId!, studentId!, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", trainerId, studentId] });
    },
  });

  return {
    exercises: routineDataQuery.data?.exercises || [],
    dayConfigs: routineDataQuery.data?.dayConfigs || {},
    routineNextChange: routineDataQuery.data?.routineNextChange || null,
    routineAssignmentDate: routineDataQuery.data?.routineAssignmentDate || null,
    activeRoutineId: routineDataQuery.data?.activeRoutineId || null,
    isLoading: routineDataQuery.isLoading,
    isRefetching: routineDataQuery.isFetching,
    refetchRoutineData: routineDataQuery.refetch,

    archivedRoutines: archivedRoutinesQuery.data || [],
    isLoadingArchived: archivedRoutinesQuery.isLoading,
    refetchArchived: archivedRoutinesQuery.refetch,

    saveDayConfig: saveDayConfigMutation.mutateAsync,
    isSavingDayConfig: saveDayConfigMutation.isPending,

    addExercise: addExerciseMutation.mutateAsync,
    isAddingExercise: addExerciseMutation.isPending,

    removeExercise: removeExerciseMutation.mutateAsync,
    isRemovingExercise: removeExerciseMutation.isPending,

    bulkRemoveExercises: bulkRemoveMutation.mutateAsync,
    isBulkRemoving: bulkRemoveMutation.isPending,

    logTrainerChange: logChangeMutation.mutateAsync,

    addBiSerieChild: addBiSerieChildMutation.mutateAsync,
    isAddingBiSerie: addBiSerieChildMutation.isPending,

    removeBiSerieChild: removeBiSerieChildMutation.mutateAsync,
    isRemovingBiSerie: removeBiSerieChildMutation.isPending,

    autoUpdateRoutineCycle: autoUpdateCycleMutation.mutateAsync,
    isUpdatingCycle: autoUpdateCycleMutation.isPending,

    assignGroupRoutine: assignGroupRoutineMutation.mutateAsync,
    isAssigningGroupRoutine: assignGroupRoutineMutation.isPending,
  };
}

export function useRoutineExercises(routineId?: string) {
  const query = useQuery({
    queryKey: ["routineExercises", routineId],
    queryFn: () => fetchRoutineExercises(routineId!),
    enabled: !!routineId,
  });

  return {
    exercises: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
