import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useStudentDashboard } from "@/hooks/useStudentDashboard";
import { useStudentSurveys } from "@/hooks/useStudentSurveys";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useNavigate } from "react-router-dom";
import { TakeSurveyDialog } from "@/components/student/TakeSurveyDialog";
import { toast } from "sonner";

import { DashboardProfileHeader } from "@/components/student/dashboard/DashboardProfileHeader";
import { DashboardQuickActions } from "@/components/student/dashboard/DashboardQuickActions";
import { DashboardSubscriptionCards } from "@/components/student/dashboard/DashboardSubscriptionCards";
import { DashboardPlanDetails } from "@/components/student/dashboard/DashboardPlanDetails";
import { DashboardSurveysSection } from "@/components/student/dashboard/DashboardSurveysSection";
import { DashboardNotificationsSection } from "@/components/student/dashboard/DashboardNotificationsSection";
import type { TrainerChange } from "@/services/studentDashboard";
import type { PendingSurvey } from "@/services/surveys";

export default function StudentDashboardPage() {
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    profile: queryProfile,
    studentData,
    notifications: rawNotifications,
    isLoading: isLoadingDashboard,
    refetch: refetchDashboard,
  } = useStudentDashboard(user?.uid);

  const {
    pendingSurveys,
    isLoadingPending,
    refetchPending,
  } = useStudentSurveys(user?.uid);

  const [notifications, setNotifications] = useState<TrainerChange[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<PendingSurvey | null>(null);

  useEffect(() => {
    if (rawNotifications && user) {
      const readIdsStr = localStorage.getItem(`read_notifications_${user.uid}`);
      let readIds: string[] = [];
      try {
        readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
        if (!Array.isArray(readIds)) readIds = [];
      } catch (e) {
        readIds = [];
      }
      const activeNotifications = rawNotifications.filter((n) => !readIds.includes(n.id));
      setNotifications(activeNotifications);
    }
  }, [rawNotifications, user]);

  const refetchAll = async () => {
    await Promise.all([refetchDashboard(), refetchPending()]);
  };

  const loading = isLoadingDashboard || isLoadingPending;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <LoadingSkeleton type="details" />
      </div>
    );
  }

  const hasPlan = studentData?.plan_type || studentData?.plan_entrenamiento || studentData?.plan_alimentacion;
  const isPaid = studentData?.payment_status === "pagado";

  const handleClearAllNotifications = async () => {
    const readIdsStr = localStorage.getItem(`read_notifications_${user?.uid}`);
    const readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
    const newReadIds = [...new Set([...readIds, ...notifications.map(n => n.id)])];
    localStorage.setItem(`read_notifications_${user?.uid}`, JSON.stringify(newReadIds));
    setNotifications([]);
    toast.success("Notificaciones marcadas como leídas");
  };

  const handleDeleteNotification = async (change: TrainerChange) => {
    try {
      await deleteDoc(doc(db, "trainer_changes", change.id));
      const readIdsStr = localStorage.getItem(`read_notifications_${user?.uid}`);
      const readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
      localStorage.setItem(`read_notifications_${user?.uid}`, JSON.stringify([...new Set([...readIds, change.id])]));
      setNotifications((prev) => prev.filter((n) => n.id !== change.id));
      toast.success("Notificación eliminada");
    } catch (err) {
      toast.error("Error al eliminar la notificación");
    }
  };

  const handleNavigateFromNotification = (change: TrainerChange) => {
    if (change.change_type.startsWith("exercise")) {
      navigate("/student/routines");
    } else if (change.change_type.startsWith("level") || change.change_type === "content_updated") {
      navigate("/student/plans");
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* PROFILE HEADER SECTION */}
      <DashboardProfileHeader
        displayName={displayName || ""}
        avatarUrl={queryProfile?.avatar_url}
        isPaid={isPaid}
        hasPlan={!!hasPlan}
        pendingSurveysCount={pendingSurveys.length}
        onAvatarUploaded={() => {
          queryClient.invalidateQueries({ queryKey: ["studentProfile", user?.uid] });
        }}
        onScrollToSurveys={() => document.getElementById('encuestas-section')?.scrollIntoView({ behavior: 'smooth' })}
      />

      {/* QUICK ACTIONS SECTION */}
      <DashboardQuickActions onNavigate={navigate} />

      {/* PLAN & PAYMENT SECTION */}
      <DashboardSubscriptionCards
        studentData={studentData}
        onNavigateToPlans={() => navigate("/student/plans")}
      />

      {/* PLAN DETAILS LIST */}
      <DashboardPlanDetails studentData={studentData} />

      {/* ENCUESTAS SECTION */}
      <DashboardSurveysSection
        pendingSurveys={pendingSurveys}
        onSelectSurvey={setActiveSurvey}
      />

      {/* NOTIFICATIONS SECTION */}
      <DashboardNotificationsSection
        notifications={notifications}
        onClearAll={handleClearAllNotifications}
        onDelete={handleDeleteNotification}
        onNavigate={handleNavigateFromNotification}
      />

      {activeSurvey && (
        <TakeSurveyDialog
          open={!!activeSurvey}
          onOpenChange={(v) => !v && setActiveSurvey(null)}
          surveyId={activeSurvey.survey_id}
          assignmentId={activeSurvey.id}
          trainerId={activeSurvey.trainer_id}
          onCompleted={() => {
            setActiveSurvey(null);
            refetchAll();
          }}
        />
      )}
    </div>
  );
}
