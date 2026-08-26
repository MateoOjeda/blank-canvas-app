import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { fetchStudentProfile } from "@/services/alumnos";
import { updatePlanAssignment } from "@/services/planes";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useStudentRoutines } from "@/hooks/useStudentRoutines";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addDays, differenceInDays } from "date-fns";
import { StudentHeader } from "@/components/trainer/student-detail/StudentHeader";
import { StudentSidebar } from "@/components/trainer/student-detail/StudentSidebar";
import { StudentSummaryTab } from "@/components/trainer/student-detail/StudentSummaryTab";
import { PlanAssignmentCard } from "@/components/trainer/student-detail/PlanAssignmentCard";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const LEVEL_LABELS: Record<string, string> = {
  principiante: "Inicial", intermedio: "Intermedio", avanzado: "Avanzado",
};

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; planType: string; level: string } | null>(null);
  const [editingPlans, setEditingPlans] = useState(false);

  // 1. Fetch Student Profile
  const studentProfileQuery = useQuery({
    queryKey: ["studentProfile", studentId],
    queryFn: () => fetchStudentProfile(studentId!),
    enabled: !!studentId,
  });
  const profile = studentProfileQuery.data || null;

  // 2. Fetch Trainer Student Link
  const trainerStudentLinkQuery = useQuery({
    queryKey: ["trainerStudentLink", user?.uid, studentId],
    queryFn: async () => {
      const qLink = query(collection(db, "trainer_students"), where("trainer_id", "==", user?.uid), where("student_id", "==", studentId));
      const snapLink = await getDocs(qLink);
      return snapLink.empty ? null : { id: snapLink.docs[0].id, ...snapLink.docs[0].data() as any };
    },
    enabled: !!user?.uid && !!studentId,
  });
  const linkId = trainerStudentLinkQuery.data?.id || "";
  const paymentPaid = trainerStudentLinkQuery.data?.payment_status === "pagado";

  // 3. Fetch Plan Levels
  const planLevelsQuery = useQuery({
    queryKey: ["planLevels", user?.uid, studentId],
    queryFn: async () => {
      const qLevels = query(collection(db, "plan_levels"), where("trainer_id", "==", user?.uid), where("student_id", "==", studentId));
      const snapLevels = await getDocs(qLevels);
      return snapLevels.docs.map(d => d.data() as any);
    },
    enabled: !!user?.uid && !!studentId,
  });
  const pls = planLevelsQuery.data || [];
  const activeE = pls.find((p: any) => p.plan_type === "entrenamiento" && p.unlocked);
  const activeA = pls.find((p: any) => p.plan_type === "nutricion" && p.unlocked);
  const activeCF = pls.find((p: any) => p.plan_type === "cambios_fisicos" && p.unlocked);
  const selectedEntrenamiento = activeE ? activeE.level : "none";
  const selectedAlimentacion = activeA ? activeA.level : "none";
  const selectedCambioFisico = activeCF ? activeCF.level : "none";

  // 4. Fetch Group Routine Membership
  const groupMembershipQuery = useQuery({
    queryKey: ["groupMembership", studentId],
    queryFn: async () => {
      const qGroupMembers = query(collection(db, "training_group_members"), where("student_id", "==", studentId));
      const snapGroupMembers = await getDocs(qGroupMembers);
      return snapGroupMembers.empty ? null : snapGroupMembers.docs[0].data();
    },
    enabled: !!studentId,
  });

  // 5. Hook useStudentRoutines (for summary stats)
  const {
    exercises,
    routineNextChange,
  } = useStudentRoutines(user?.uid, studentId);

  const loading = studentProfileQuery.isLoading || trainerStudentLinkQuery.isLoading || planLevelsQuery.isLoading;

  const togglePaymentMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      if (!linkId) return;
      await updateDoc(doc(db, "trainer_students", linkId), {
        payment_status: checked ? "pagado" : "pendiente",
        updated_at: new Date().toISOString()
      });
    },
    onSuccess: (_, checked) => {
      queryClient.invalidateQueries({ queryKey: ["trainerStudentLink", user?.uid, studentId] });
      toast.success(checked ? "Marcado como pagado" : "Marcado como pendiente");
    },
    onError: () => {
      toast.error("No se pudo actualizar el estado de pago.");
    }
  });

  const handlePaymentToggle = (checked: boolean) => {
    togglePaymentMutation.mutate(checked);
  };

  const updatePlanMutation = useMutation({
    mutationFn: async ({ planType, level }: { planType: string; level: string }) => {
      await updatePlanAssignment(user!.uid, studentId!, planType, level);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["planLevels", user?.uid, studentId] });
      queryClient.invalidateQueries({ queryKey: ["linkedStudents", user?.uid] });
      toast.success(variables.level === "none" ? "Plan desactivado" : `Plan actualizado a ${LEVEL_LABELS[variables.level] || variables.level}`);
    },
    onError: () => {
      toast.error("Error al actualizar el plan");
    }
  });

  const handlePlanChangeRequest = (planType: string, level: string) => {
    setConfirmDialog({ open: true, planType, level });
  };

  const handlePlanChangeConfirm = async () => {
    if (!confirmDialog) return;
    const { planType, level } = confirmDialog;
    setConfirmDialog(null);
    updatePlanMutation.mutate({ planType, level });
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate("/trainer/students")} className="gap-2"><ArrowLeft className="h-4 w-4" /> Volver</Button>
        <p className="text-muted-foreground text-center">Alumno no encontrado</p>
      </div>
    );
  }

  const nextPaymentDate = routineNextChange
    ? new Date(routineNextChange)
    : addDays(new Date(profile?.created_at || new Date()), 30);
  const daysRemaining = Math.max(0, differenceInDays(nextPaymentDate, new Date()));
  const hasPlan = selectedEntrenamiento !== "none" || selectedAlimentacion !== "none" || selectedCambioFisico !== "none";

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* StudentHeader */}
      <StudentHeader
        profile={profile}
        paymentPaid={paymentPaid}
        onPaymentToggle={handlePaymentToggle}
        selectedEntrenamiento={selectedEntrenamiento}
        selectedAlimentacion={selectedAlimentacion}
        selectedCambioFisico={selectedCambioFisico}
        editingPlans={editingPlans}
        setEditingPlans={setEditingPlans}
        navigate={navigate}
      />

      {/* Plan Assignment with edit lock */}
      {editingPlans && (
        <PlanAssignmentCard
          selectedEntrenamiento={selectedEntrenamiento}
          selectedAlimentacion={selectedAlimentacion}
          selectedCambioFisico={selectedCambioFisico}
          handlePlanChangeRequest={handlePlanChangeRequest}
        />
      )}

      {/* Main Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

        {/* Left Column: Fixed Sidebar metadata */}
        <StudentSidebar
          profile={profile}
          groupName={groupMembershipQuery.data?.group_id ? "Rutina Grupal" : null}
          selectedEntrenamiento={selectedEntrenamiento}
          selectedAlimentacion={selectedAlimentacion}
        />

        {/* Right Column: Summary Content */}
        <div className="space-y-4">
          <StudentSummaryTab
            exercises={exercises}
            profile={profile}
            daysRemaining={daysRemaining}
            hasPlan={hasPlan}
            pendingSurveysCount={0}
          />
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog?.open} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Confirmar cambio de plan?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.level === "none"
                ? "Se desactivará el plan actual para este alumno de forma inmediata."
                : `Se actualizará el nivel a "${LEVEL_LABELS[confirmDialog?.level || ""] || confirmDialog?.level}". Los cambios se aplican de inmediato en la cuenta del alumno.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePlanChangeConfirm}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
