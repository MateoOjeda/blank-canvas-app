import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchGlobalPlans, 
  saveGlobalPlan, 
  toggleGlobalPlanActive, 
  updatePlanAssignment,
  type GlobalPlan 
} from "@/services/planes";

export function useGlobalPlans(trainerId?: string) {
  const queryClient = useQueryClient();

  const globalPlansQuery = useQuery({
    queryKey: ["globalPlans", trainerId],
    queryFn: () => fetchGlobalPlans(trainerId!),
    enabled: !!trainerId,
  });

  const savePlanMutation = useMutation({
    mutationFn: (plan: GlobalPlan) => saveGlobalPlan(plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalPlans", trainerId] });
    },
  });

  const togglePlanMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleGlobalPlanActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["globalPlans", trainerId] });
    },
  });

  const assignPlanMutation = useMutation({
    mutationFn: ({ studentId, planType, level }: { studentId: string; planType: string; level: string }) =>
      updatePlanAssignment(trainerId!, studentId, planType, level),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["linkedStudents", trainerId] });
      queryClient.invalidateQueries({ queryKey: ["linkedStudentsProfiles", trainerId] });
      queryClient.invalidateQueries({ queryKey: ["planLevels", trainerId, variables.studentId] });
      queryClient.invalidateQueries({ queryKey: ["nutritionLevel", variables.studentId] });
    },
  });

  return {
    plans: globalPlansQuery.data?.plans || [],
    isLoading: globalPlansQuery.isLoading,
    refetch: globalPlansQuery.refetch,

    savePlan: savePlanMutation.mutateAsync,
    isSaving: savePlanMutation.isPending,

    togglePlan: togglePlanMutation.mutateAsync,
    isToggling: togglePlanMutation.isPending,

    assignPlan: assignPlanMutation.mutateAsync,
    isAssigning: assignPlanMutation.isPending,
  };
}
