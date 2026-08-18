import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDiagnostic, saveDiagnostic } from "@/services/diagnostic";

export function useDiagnostic(studentId?: string) {
  const queryClient = useQueryClient();

  const diagnosticQuery = useQuery({
    queryKey: ["personalDiagnostic", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return fetchDiagnostic(studentId);
    },
    enabled: !!studentId,
  });

  const saveDiagnosticMutation = useMutation({
    mutationFn: async ({ existingId, payload }: { existingId: string | null; payload: Record<string, unknown> }) => {
      if (!studentId) throw new Error("No student ID provided");
      await saveDiagnostic(studentId, existingId, payload);
      if (!existingId) {
        queryClient.setQueryData(["personalDiagnostic", studentId],
          (old: unknown) => old ?? { id: studentId, student_id: studentId, ...payload }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["personalDiagnostic", studentId] });
    },
  });

  return {
    diagnosticData: diagnosticQuery.data || null,
    isLoading: diagnosticQuery.isLoading,
    refetch: diagnosticQuery.refetch,

    saveDiagnostic: saveDiagnosticMutation.mutateAsync,
    isSaving: saveDiagnosticMutation.isPending,
  };
}
