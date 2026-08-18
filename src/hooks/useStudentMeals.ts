import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchStudentMeals,
  fetchNutritionLevel,
  addStudentMeal,
  deleteStudentMeal,
  type Meal,
} from "@/services/studentMeals";

export type { Meal };

export function useStudentMeals(studentId?: string, trainerId?: string) {
  const queryClient = useQueryClient();

  const mealsQuery = useQuery<Meal[]>({
    queryKey: ["studentMeals", studentId, trainerId],
    queryFn: async () => {
      if (!studentId) return [];
      return fetchStudentMeals(studentId, trainerId);
    },
    enabled: !!studentId,
  });

  const nutritionLevelQuery = useQuery<string>({
    queryKey: ["nutritionLevel", studentId],
    queryFn: async () => {
      if (!studentId) return "principiante";
      return fetchNutritionLevel(studentId);
    },
    enabled: !!studentId,
  });

  const addMealMutation = useMutation({
    mutationFn: async (data: { title: string; ingredients: string; options: Array<{ name: string; description: string }> }) => {
      if (!trainerId || !studentId) throw new Error("Missing trainer or student ID");
      return addStudentMeal(trainerId, studentId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentMeals", studentId, trainerId] });
    },
  });

  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: string) => {
      return deleteStudentMeal(mealId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studentMeals", studentId, trainerId] });
    },
  });

  return {
    meals: mealsQuery.data || [],
    isLoadingMeals: mealsQuery.isLoading,
    refetchMeals: mealsQuery.refetch,

    nutritionLevel: nutritionLevelQuery.data || "principiante",
    isLoadingNutritionLevel: nutritionLevelQuery.isLoading,
    refetchNutritionLevel: nutritionLevelQuery.refetch,

    addMeal: addMealMutation.mutateAsync,
    isAddingMeal: addMealMutation.isPending,

    deleteMeal: deleteMealMutation.mutateAsync,
    isDeletingMeal: deleteMealMutation.isPending,
  };
}
