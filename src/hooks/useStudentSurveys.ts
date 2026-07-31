import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStudentPendingSurveys,
  fetchStudentSurveyResults,
  fetchSurveyWithQuestions,
  submitSurveyAnswers,
} from "@/services/surveys";

export function useStudentSurveys(studentId?: string) {
  const queryClient = useQueryClient();

  const pendingSurveysQuery = useQuery({
    queryKey: ["studentPendingSurveys", studentId],
    queryFn: () => fetchStudentPendingSurveys(studentId!),
    enabled: !!studentId,
  });

  const surveyResultsQuery = useQuery({
    queryKey: ["studentSurveyResults", studentId],
    queryFn: () => fetchStudentSurveyResults(studentId!),
    enabled: !!studentId,
  });

  const submitAnswersMutation = useMutation({
    mutationFn: ({ assignmentId, surveyId, trainerId, answers }: { assignmentId: string; surveyId?: string; trainerId: string; answers: { question_id: string; answer_text: string }[] }) =>
      submitSurveyAnswers(assignmentId, answers, trainerId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["studentPendingSurveys", studentId] });
      queryClient.invalidateQueries({ queryKey: ["studentSurveyResults", studentId] });
      if (variables.surveyId) {
        queryClient.invalidateQueries({ queryKey: ["surveyAssignments", variables.surveyId] });
        queryClient.invalidateQueries({ queryKey: ["surveyAnswers", variables.surveyId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["surveyAssignments"] });
        queryClient.invalidateQueries({ queryKey: ["surveyAnswers"] });
      }
    },
  });

  return {
    pendingSurveys: pendingSurveysQuery.data || [],
    isLoadingPending: pendingSurveysQuery.isLoading,
    refetchPending: pendingSurveysQuery.refetch,

    surveyResults: surveyResultsQuery.data || [],
    isLoadingResults: surveyResultsQuery.isLoading,
    refetchResults: surveyResultsQuery.refetch,

    submitAnswers: submitAnswersMutation.mutateAsync,
    isSubmittingAnswers: submitAnswersMutation.isPending,
  };
}

export function useSurveyQuestions(surveyId?: string) {
  const surveyQuestionsQuery = useQuery({
    queryKey: ["surveyQuestions", surveyId],
    queryFn: () => fetchSurveyWithQuestions(surveyId!),
    enabled: !!surveyId,
  });

  return {
    survey: surveyQuestionsQuery.data || null,
    isLoading: surveyQuestionsQuery.isLoading,
    refetch: surveyQuestionsQuery.refetch,
  };
}
