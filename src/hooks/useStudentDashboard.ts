import { useQuery } from "@tanstack/react-query";
import {
  fetchStudentProfile,
  fetchStudentTrainerLink,
  fetchTrainerChanges,
} from "@/services/studentDashboard";

export function useStudentDashboard(studentId?: string) {
  const profileQuery = useQuery({
    queryKey: ["studentProfile", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return fetchStudentProfile(studentId);
    },
    enabled: !!studentId,
  });

  const trainerLinkQuery = useQuery({
    queryKey: ["studentTrainerLink", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      return fetchStudentTrainerLink(studentId);
    },
    enabled: !!studentId,
  });

  const trainerChangesQuery = useQuery({
    queryKey: ["trainerChanges", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      return fetchTrainerChanges(studentId);
    },
    enabled: !!studentId,
  });

  return {
    profile: profileQuery.data || null,
    isLoadingProfile: profileQuery.isLoading,

    studentData: trainerLinkQuery.data || null,
    isLoadingStudentData: trainerLinkQuery.isLoading,

    notifications: trainerChangesQuery.data || [],
    isLoadingNotifications: trainerChangesQuery.isLoading,

    isLoading: profileQuery.isLoading || trainerLinkQuery.isLoading || trainerChangesQuery.isLoading,
    refetch: async () => {
      await Promise.all([
        profileQuery.refetch(),
        trainerLinkQuery.refetch(),
        trainerChangesQuery.refetch(),
      ]);
    }
  };
}
