import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { fetchStudentProfile, type StudentProfile } from "@/services/alumnos";
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
import { useDiagnostic } from "@/hooks/useDiagnostic";
import { useStudentSurveys } from "@/hooks/useStudentSurveys";
import { useStudentRoutines } from "@/hooks/useStudentRoutines";
import { fetchRoutineExercises, setRoutineCycleDates } from "@/services/routines";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/ui/premium-card";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { TimelineCard } from "@/components/ui/timeline-card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dumbbell, CheckCircle, Apple, Loader2, Sparkles, Pencil, Archive, Users, ClipboardList, ChevronRight, AlertCircle, Clock, Mail, Phone, Target, TrendingUp, Heart, Info, Calendar } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import PersonalDiagnosticTab from "@/components/trainer/PersonalDiagnosticTab";

import WeightProgressChart from "@/components/trainer/WeightProgressChart";
import ExerciseHistoryTab from "@/components/trainer/ExerciseHistoryTab";
import MealsTab from "@/components/trainer/MealsTab";
import { toast } from "sonner";
import { addDays, differenceInDays } from "date-fns";
import { StudentHeader } from "@/components/trainer/student-detail/StudentHeader";
import { StudentSidebar } from "@/components/trainer/student-detail/StudentSidebar";
import { StudentSummaryTab } from "@/components/trainer/student-detail/StudentSummaryTab";
import { PlanAssignmentCard } from "@/components/trainer/student-detail/PlanAssignmentCard";
import { StudentRoutinesTab } from "@/components/trainer/student-detail/StudentRoutinesTab";
import { StudentSurveysTab } from "@/components/trainer/student-detail/StudentSurveysTab";
import { StudentMeasurementsTab } from "@/components/trainer/student-detail/StudentMeasurementsTab";
import { StudentHistoryTab } from "@/components/trainer/student-detail/StudentHistoryTab";



const LEVEL_LABELS: Record<string, string> = {
  principiante: "Inicial", intermedio: "Intermedio", avanzado: "Avanzado",
};

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(() => localStorage.getItem("trainer_active_detail_tab") || "summary");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; planType: string; level: string } | null>(null);
  const [editingPlans, setEditingPlans] = useState(false);

  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [routineExercises, setRoutineExercises] = useState<any[]>([]);
  const [selectedDayTab, setSelectedDayTab] = useState<string>(() => {
    const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    return localStorage.getItem("trainer_selected_routine_day") || DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  });

  useEffect(() => {
    localStorage.setItem("trainer_active_detail_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem("trainer_selected_routine_day", selectedDayTab);
  }, [selectedDayTab]);
  const [viewingSurvey, setViewingSurvey] = useState<{ type: 'custom' | 'diagnostic', id?: string, data?: any } | null>(null);

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
  const selectedEntrenamiento = activeE ? activeE.level : "none";
  const selectedAlimentacion = activeA ? activeA.level : "none";

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
  const groupId = groupMembershipQuery.data?.group_id;
  const hasGroupRoutine = !!groupId;

  // 5. Fetch Group Exercises
  const groupExercisesQuery = useQuery({
    queryKey: ["groupExercises", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const qGroupExercises = query(collection(db, "group_exercises"), where("group_id", "==", groupId));
      const snapGroupEx = await getDocs(qGroupExercises);
      return snapGroupEx.docs.map(d => ({ id: d.id, ...d.data() as any }));
    },
    enabled: !!groupId,
  });
  const groupExercises = groupExercisesQuery.data || [];

  // 6. Hook useStudentRoutines
  const {
    exercises,
    routineNextChange,
    routineAssignmentDate,
    archivedRoutines,
    isLoading: isLoadingRoutines,
  } = useStudentRoutines(user?.uid, studentId);

  // 7. Hook useStudentSurveys
  const {
    pendingSurveys,
    surveyResults,
    isLoadingPending: isLoadingSurveysPending,
    isLoadingResults: isLoadingSurveysResults,
  } = useStudentSurveys(studentId);

  // 8. Hook useDiagnostic
  const {
    diagnosticData,
    isLoading: isLoadingDiagnostic,
  } = useDiagnostic(studentId);

  const diagnosticStatus = useMemo(() => {
    if (diagnosticData) {
      return {
        completed: true,
        date: diagnosticData.updated_at || diagnosticData.created_at
      };
    }
    return { completed: false, date: null };
  }, [diagnosticData]);

  const loading = studentProfileQuery.isLoading || trainerStudentLinkQuery.isLoading || planLevelsQuery.isLoading;

  const handleExpandRoutine = async (routineId: string) => {
    if (expandedRoutine === routineId) {
      setExpandedRoutine(null);
      setRoutineExercises([]);
      return;
    }
    setExpandedRoutine(routineId);
    try {
      const exs = await fetchRoutineExercises(routineId);
      setRoutineExercises(exs);
    } catch (err) {
      console.error("Error fetching routine exercises:", err);
    }
  };

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

  const updateCycleMutation = useMutation({
    mutationFn: async ({ start, end }: { start: string | null; end: string | null }) => {
      await setRoutineCycleDates(user!.uid, studentId!, start, end);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["routineData", user?.uid, studentId] });
      toast.success("Ciclo de rutina actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar las fechas del ciclo");
    }
  });

  const handleUpdateCycleDates = (start: string | null, end: string | null) => {
    updateCycleMutation.mutate({ start, end });
  };


  const { exercisesByDay } = useMemo(() => {
    const exercisesByDay: Record<string, any[]> = {};
    const list = exercises || [];
    list.forEach((ex) => {
      if (!exercisesByDay[ex.day]) exercisesByDay[ex.day] = [];
      exercisesByDay[ex.day].push(ex);
    });

    return { exercisesByDay };
  }, [exercises]);

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
  const hasPlan = selectedEntrenamiento !== "none" || selectedAlimentacion !== "none";

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* StudentHeader */}
      <StudentHeader
        profile={profile}
        paymentPaid={paymentPaid}
        onPaymentToggle={handlePaymentToggle}
        selectedEntrenamiento={selectedEntrenamiento}
        selectedAlimentacion={selectedAlimentacion}
        editingPlans={editingPlans}
        setEditingPlans={setEditingPlans}
        navigate={navigate}
      />

      {/* Plan Assignment with edit lock */}
      {editingPlans && (
        <PlanAssignmentCard
          selectedEntrenamiento={selectedEntrenamiento}
          selectedAlimentacion={selectedAlimentacion}
          handlePlanChangeRequest={handlePlanChangeRequest}
        />
      )}

      {/* CRM Main Columns Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

        {/* Left Column: Fixed Sidebar metadata */}
        <StudentSidebar
          profile={profile}
          groupName={groupMembershipQuery.data?.group_id ? "Rutina Grupal" : null}
          selectedEntrenamiento={selectedEntrenamiento}
          selectedAlimentacion={selectedAlimentacion}
        />

        {/* Right Column: Dynamic Tabs and Information panels */}
        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            {(() => {
              const tabs = [
                { value: "summary", label: "Resumen" },
                { value: "routine", label: "Rutinas" },
                { value: "meals", label: "Comidas" },
                { value: "surveys", label: "Encuestas" },
                { value: "progress", label: "Progreso" },
                { value: "measurements", label: "Mediciones" },
                { value: "diagnostic", label: "Diagnóstico" },
                { value: "history", label: "Historial" }
              ];

              return (
                <TabsList className="flex flex-wrap w-full bg-muted/40 border border-border/50 p-1 h-auto rounded-xl">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="flex-1 min-w-[70px] text-[10px] py-1.5 px-2 transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg font-semibold"
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              );
            })()}

            {/* TAB: Resumen */}
            <TabsContent value="summary" className="space-y-4 outline-none">
              <StudentSummaryTab
                exercises={exercises}
                profile={profile}
                daysRemaining={daysRemaining}
                hasPlan={hasPlan}
                pendingSurveysCount={pendingSurveys.length}
              />
            </TabsContent>

            {/* TAB: Rutinas */}
            <TabsContent value="routine" className="outline-none">
              <StudentRoutinesTab
                isLoadingRoutines={isLoadingRoutines}
                exercisesByDay={exercisesByDay}
                selectedDayTab={selectedDayTab}
                setSelectedDayTab={setSelectedDayTab}
              />
            </TabsContent>

            {/* TAB: Comidas */}
            <TabsContent value="meals" className="outline-none">
              {studentId && <MealsTab studentId={studentId} nutritionLevel={selectedAlimentacion} readOnly={true} />}
            </TabsContent>

            {/* TAB: Encuestas */}
            <TabsContent value="surveys" className="outline-none">
              <StudentSurveysTab
                isLoadingSurveysPending={isLoadingSurveysPending}
                isLoadingSurveysResults={isLoadingSurveysResults}
                viewingSurvey={viewingSurvey}
                setViewingSurvey={setViewingSurvey}
                pendingSurveys={pendingSurveys}
                surveyResults={surveyResults}
              />
            </TabsContent>

            {/* TAB: Progreso */}
            <TabsContent value="progress" className="space-y-4 outline-none">
              {studentId && (
                <div className="space-y-4">
                  <WeightProgressChart studentId={studentId} />
                  <ExerciseHistoryTab studentId={studentId} />
                </div>
              )}
            </TabsContent>

            {/* TAB: Mediciones */}
            <TabsContent value="measurements" className="outline-none">
              <StudentMeasurementsTab profile={profile} />
            </TabsContent>

            {/* TAB: Diagnóstico */}
            <TabsContent value="diagnostic" className="outline-none">
              {studentId && <PersonalDiagnosticTab studentId={studentId} />}
            </TabsContent>

            {/* TAB: Historial */}
            <TabsContent value="history" className="space-y-4 outline-none">
              <StudentHistoryTab
                routineAssignmentDate={routineAssignmentDate}
                routineNextChange={routineNextChange}
                handleUpdateCycleDates={handleUpdateCycleDates}
                archivedRoutines={archivedRoutines}
                expandedRoutine={expandedRoutine}
                handleExpandRoutine={handleExpandRoutine}
                routineExercises={routineExercises}
              />
            </TabsContent>
          </Tabs>
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
