import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit, 
  setDoc, 
  updateDoc, 
  doc 
} from "firebase/firestore";

export function useDiagnostic(studentId?: string) {
  const queryClient = useQueryClient();

  const diagnosticQuery = useQuery({
    queryKey: ["personalDiagnostic", studentId],
    queryFn: async () => {
      if (!studentId) return null;
      const q = query(
        collection(db, "seguimiento_personal"),
        where("student_id", "==", studentId),
        orderBy("created_at", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const document = snap.docs[0];
      return { id: document.id, ...document.data() } as any;
    },
    enabled: !!studentId,
  });

  const saveDiagnosticMutation = useMutation({
    mutationFn: async ({ existingId, payload }: { existingId: string | null; payload: any }) => {
      if (!studentId) throw new Error("No student ID provided");
      if (existingId) {
        await updateDoc(doc(db, "seguimiento_personal", existingId), payload);
      } else {
        await setDoc(doc(db, "seguimiento_personal", studentId), {
          student_id: studentId,
          created_at: new Date().toISOString(),
          ...payload,
        });
        // Update the query cache so subsequent reads pick up the new doc
        queryClient.setQueryData(["personalDiagnostic", studentId], 
          (old: any) => old ?? { id: studentId, student_id: studentId, ...payload }
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
