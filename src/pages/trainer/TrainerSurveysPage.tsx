import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTrainerSurveys, useSurveyDetails } from "@/hooks/useTrainerSurveys";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { type CustomSurvey, removeSurveyAssignment } from "@/services/surveys";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Users, FileText, CheckCircle, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle, PremiumCardFooter } from "@/components/ui/premium-card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataToolbar } from "@/components/ui/data-toolbar";
import { SectionHeader } from "@/components/ui/section-header";
import { FileText as FileTextIcon } from "lucide-react";
import { CreateSurveyDialog } from "@/components/trainer/surveys/CreateSurveyDialog";
import { AssignSurveyDialog } from "@/components/trainer/surveys/AssignSurveyDialog";
import { SurveyResultsDialog } from "@/components/trainer/surveys/SurveyResultsDialog";

export default function TrainerSurveysPage() {
  const { user } = useAuth();
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    surveys,
    isLoading: loading,
    createSurvey: createSurveyMutation,
    deleteSurvey: deleteSurveyMutation,
    assignSurvey: assignSurveyMutation,
    removeAssignment: removeAssignmentMutation
  } = useTrainerSurveys(user?.uid);

  // States for Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [assignSurvey, setAssignSurvey] = useState<CustomSurvey | null>(null);
  const [resultsSurvey, setResultsSurvey] = useState<CustomSurvey | null>(null);
  const [deleteSurveyId, setDeleteSurveyId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch active survey details (assignments & answers) Reactively
  const activeSurveyId = assignSurvey?.id || resultsSurvey?.id;
  const { 
    assignments, 
    answers, 
    isLoadingAssignments, 
    isLoadingAnswers 
  } = useSurveyDetails(activeSurveyId);

  // Computed variables to prevent showing stale cache data (Race Condition fix)
  const currentAssignments = useMemo(() => {
    if (!assignments || assignments.length === 0) return [];
    if (assignments[0].survey_id !== activeSurveyId) return [];
    return assignments;
  }, [assignments, activeSurveyId]);

  const currentAnswers = useMemo(() => {
    if (!answers || answers.length === 0) return [];
    const hasCorrectSurveyId = assignments.length > 0 && assignments[0].survey_id === activeSurveyId;
    if (!hasCorrectSurveyId) return [];
    return answers;
  }, [answers, assignments, activeSurveyId]);

  const assignedStudentIds = useMemo(() => {
    return currentAssignments.map((a: any) => a.student_id);
  }, [currentAssignments]);

  const loadingResults = isLoadingAssignments || isLoadingAnswers;

  const handleDelete = async (id: string) => {
    setDeleteSurveyId(id);
  };

  const confirmDelete = async () => {
    if (!deleteSurveyId) return;
    try {
      await deleteSurveyMutation(deleteSurveyId);
      toast.success("Encuesta eliminada");
    } catch (err: any) {
      console.error("[Delete Flow ERROR in UI confirmDelete]", {
        error: err,
        code: err?.code,
        message: err?.message,
        stack: err?.stack,
        customData: err?.customData
      });
      toast.error(`Error al eliminar la encuesta: ${err?.message || err}`);
    } finally {
      setDeleteSurveyId(null);
    }
  };

  const openAssignModal = (survey: CustomSurvey) => {
    setAssignSurvey(survey);
  };

  // --- Results Modal Handlers ---
  const openResultsModal = (survey: CustomSurvey) => {
    setResultsSurvey(survey);
  };

  const filteredSurveys = surveys.filter(survey =>
    survey.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (survey.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <SectionHeader
        title="Encuestas de Seguimiento"
        description="Crea formularios personalizados y obtén feedback estructurado de tus alumnos."
        actions={
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 h-10 rounded-xl text-xs font-semibold shadow-sm">
            <Plus className="h-4 w-4" /> Crear Encuesta
          </Button>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <PremiumCard className="hover:border-primary/20">
          <PremiumCardContent className="p-2 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary/10 border border-primary/20 rounded-lg sm:rounded-xl flex items-center justify-center text-primary shrink-0">
              <FileTextIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] sm:text-[9px] leading-tight font-bold text-muted-foreground uppercase tracking-wider">Total Encuestas</p>
              <h3 className="text-xs sm:text-base font-bold text-foreground mt-0.5 truncate">{surveys.length} Creadas</h3>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard className="hover:border-blue-500/20">
          <PremiumCardContent className="p-2 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-500/10 border border-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-500 shrink-0">
              <StatusBadge status="global" label="Global" className="h-3.5 sm:h-4.5 scale-75 sm:scale-90" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] sm:text-[9px] leading-tight font-bold text-muted-foreground uppercase tracking-wider">Encuestas Globales</p>
              <h3 className="text-xs sm:text-base font-bold text-foreground mt-0.5 truncate">{surveys.filter(s => s.is_global).length} Disponibles</h3>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard className="hover:border-emerald-500/20">
          <PremiumCardContent className="p-2 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-4">
            <div className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 w-full">
              <p className="text-[8px] sm:text-[9px] leading-tight font-bold text-muted-foreground uppercase tracking-wider">Alumnos Totales</p>
              <h3 className="text-xs sm:text-base font-bold text-foreground mt-0.5 truncate">{students.length} Activos</h3>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      <DataToolbar
        searchPlaceholder="Buscar encuesta por título..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchClear={() => setSearchQuery("")}
        className="mb-4"
      />

      {loading ? (
        <LoadingSkeleton type="card" count={3} />
      ) : filteredSurveys.length === 0 ? (
        <EmptyState
          type={searchQuery ? "no-results" : "empty"}
          title={searchQuery ? "Sin coincidencias" : "Sin encuestas"}
          description={
            searchQuery 
              ? `No se encontraron encuestas que coincidan con "${searchQuery}".`
              : "Todavía no has creado ninguna encuesta para tus alumnos."
          }
          actionText={searchQuery ? "Limpiar Búsqueda" : "Crear mi primera encuesta"}
          onAction={searchQuery ? () => setSearchQuery("") : () => setCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSurveys.map(survey => (
            <PremiumCard key={survey.id} className="flex flex-col hover:scale-[1.01]">
              <PremiumCardHeader className="pb-2 p-4">
                <PremiumCardTitle className="text-xs font-bold text-foreground line-clamp-1" title={survey.title}>{survey.title}</PremiumCardTitle>
                <CardDescription className="text-[11px] text-muted-foreground line-clamp-2 min-h-[32px] mt-0.5 leading-relaxed">{survey.description || "Sin descripción descriptiva"}</CardDescription>
              </PremiumCardHeader>
              <PremiumCardContent className="flex-1 pb-3 px-4">
                <div className="flex gap-2 items-center">
                  <StatusBadge status="default" label={`${survey.questions?.length || 0} Preguntas`} />
                  {survey.is_global && (
                    <StatusBadge status="global" label="Global" />
                  )}
                </div>
              </PremiumCardContent>
              <PremiumCardFooter className="pt-2 pb-3.5 px-4 flex justify-between gap-2">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-8 text-[11px] font-bold rounded-lg border-border" onClick={() => openAssignModal(survey)}>
                  <Users className="h-3.5 w-3.5 text-muted-foreground" /> Asignar
                </Button>
                <Button variant="outline" size="sm" className="flex-1 gap-1.5 h-8 text-[11px] font-bold rounded-lg border-border" onClick={() => openResultsModal(survey)}>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Resultados
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors" onClick={() => handleDelete(survey.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </PremiumCardFooter>
            </PremiumCard>
          ))}
        </div>
      )}

      <CreateSurveyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        user={user}
        students={students}
        createSurveyMutation={createSurveyMutation}
        assignSurveyMutation={assignSurveyMutation}
      />

      <AssignSurveyDialog
        assignSurvey={assignSurvey}
        onOpenChange={(open) => !open && setAssignSurvey(null)}
        students={students}
        assignedStudentIds={assignedStudentIds}
        user={user}
        queryClient={queryClient}
        assignSurveyMutation={assignSurveyMutation}
        removeAssignmentMutation={removeAssignmentMutation}
      />

      <SurveyResultsDialog
        resultsSurvey={resultsSurvey}
        onOpenChange={(open) => !open && setResultsSurvey(null)}
        loadingResults={loadingResults}
        currentAssignments={currentAssignments}
        currentAnswers={currentAnswers}
      />

      {/* CONFIRM DELETE SURVEY DIALOG */}
      <AlertDialog open={!!deleteSurveyId} onOpenChange={(open) => !open && setDeleteSurveyId(null)}>
        <AlertDialogContent className="max-w-md border border-border/40 bg-card/95 shadow-xl rounded-2xl">
          <AlertDialogHeader className="pb-3 border-b border-border/40">
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Eliminar Encuesta
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground/80 mt-2 leading-relaxed">
              ¿Estás seguro de que deseas eliminar esta encuesta? Esta acción es permanente, eliminará todas las asignaciones vinculadas a los alumnos y no se podrá deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 border-t border-border/40 flex justify-end gap-2">
            <AlertDialogCancel className="h-9 px-4 rounded-xl text-xs font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 rounded-xl text-xs font-bold shadow-sm">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
