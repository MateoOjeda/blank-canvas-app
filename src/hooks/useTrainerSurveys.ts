import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchTrainerSurveys,
  createSurvey,
  deleteSurvey,
  fetchSurveyAssignments,
  assignSurveyToStudents,
  removeSurveyAssignment,
  fetchSurveyAnswers,
  type CustomSurvey,
} from "@/services/surveys";

export function useTrainerSurveys(trainerId?: string) {
  const queryClient = useQueryClient();

  const surveysQuery = useQuery({
    queryKey: ["trainerSurveys", trainerId],
    queryFn: () => fetchTrainerSurveys(trainerId!),
    enabled: !!trainerId,
  });

  const createSurveyMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      questions: any[];
      isGlobal?: boolean;
    }) => createSurvey(trainerId!, data.title, data.description, data.questions, data.isGlobal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainerSurveys", trainerId] });
    },
  });

  const deleteSurveyMutation = useMutation({
    mutationFn: (surveyId: string) => {
      return deleteSurvey(surveyId);
    },
    onSuccess: (_, surveyId) => {
      queryClient.invalidateQueries({ queryKey: ["trainerSurveys", trainerId] });
    },
    onError: (err: any, surveyId) => {
      console.error("Error deleting survey:", surveyId, err);
    },
  });

  const assignSurveyMutation = useMutation({
    mutationFn: ({ surveyId, studentIds }: { surveyId: string; studentIds: string[] }) =>
      assignSurveyToStudents(surveyId, studentIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["surveyAssignments", variables.surveyId] });
      queryClient.invalidateQueries({ queryKey: ["studentPendingSurveys"] });
    },
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: ({ surveyId, studentId }: { surveyId: string; studentId: string }) =>
      removeSurveyAssignment(surveyId, studentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["surveyAssignments", variables.surveyId] });
      queryClient.invalidateQueries({ queryKey: ["studentPendingSurveys", variables.studentId] });
    },
  });

  return {
    surveys: surveysQuery.data || [],
    isLoading: surveysQuery.isLoading,
    refetchSurveys: surveysQuery.refetch,

    createSurvey: createSurveyMutation.mutateAsync,
    isCreating: createSurveyMutation.isPending,

    deleteSurvey: deleteSurveyMutation.mutateAsync,
    isDeleting: deleteSurveyMutation.isPending,

    assignSurvey: assignSurveyMutation.mutateAsync,
    isAssigning: assignSurveyMutation.isPending,

    removeAssignment: removeAssignmentMutation.mutateAsync,
    isRemovingAssignment: removeAssignmentMutation.isPending,
  };
}

export function useSurveyDetails(surveyId?: string) {
  const assignmentsQuery = useQuery({
    queryKey: ["surveyAssignments", surveyId],
    queryFn: () => fetchSurveyAssignments(surveyId!),
    enabled: !!surveyId,
  });

  const answersQuery = useQuery({
    queryKey: ["surveyAnswers", surveyId],
    queryFn: () => fetchSurveyAnswers(surveyId!),
    enabled: !!surveyId,
  });

  return {
    assignments: assignmentsQuery.data || [],
    isLoadingAssignments: assignmentsQuery.isLoading,
    refetchAssignments: assignmentsQuery.refetch,

    answers: answersQuery.data || [],
    isLoadingAnswers: answersQuery.isLoading,
    refetchAnswers: answersQuery.refetch,
  };
}
