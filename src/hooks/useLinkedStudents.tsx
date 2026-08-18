import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchLinkedStudentProfiles, type LinkedStudentProfile } from "@/services/linkedStudents";

export type { LinkedStudentProfile };

export function useLinkedStudents() {
  const { user } = useAuth();

  const { data: students = [], isLoading: loading, refetch } = useQuery<LinkedStudentProfile[]>({
    queryKey: ["linkedStudentsProfiles", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      return fetchLinkedStudentProfiles(user.uid);
    },
    enabled: !!user?.uid,
  });

  return { students, loading, refetch };
}
