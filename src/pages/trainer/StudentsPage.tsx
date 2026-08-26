import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useStudentsManager } from "@/hooks/useStudentsManager";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Users, UserPlus, CreditCard, Plus, FileText, ClipboardList } from "lucide-react";
import type { LinkedStudent } from "@/services/alumnos";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumCard, PremiumCardContent } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { StudentsList } from "@/components/trainer/students/StudentsList";
import { AvailableStudentsList } from "@/components/trainer/students/AvailableStudentsList";
import { StudentDetailPanel } from "@/components/trainer/students/StudentDetailPanel";
import { CreateStudentDialog } from "@/components/trainer/students/CreateStudentDialog";

export default function StudentsPage() {
  const {
    linkedStudents,
    isLoadingLinked,
    availableStudents,
    isLoadingAvailable,
    linkStudent,
    unlinkStudent,
    deleteStudent,
    isDeleting,
    createStudentProfile,
    isCreatingProfile
  } = useStudentsManager();

  const navigate = useNavigate();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => localStorage.getItem("trainer_selected_student_id"));

  useEffect(() => {
    if (selectedStudentId) {
      localStorage.setItem("trainer_selected_student_id", selectedStudentId);
    } else {
      localStorage.removeItem("trainer_selected_student_id");
    }
  }, [selectedStudentId]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 20) return "Buenas tardes";
    return "Buenas noches";
  };

  const formattedDate = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
  
  // States for Modals/Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ name: "", weight: "", age: "" });
  const [deleteTarget, setDeleteTarget] = useState<LinkedStudent | null>(null);
  const [unlinkingTargetId, setUnlinkingTargetId] = useState<string | null>(null);
  const [linkingTargetId, setLinkingTargetId] = useState<string | null>(null);

  // Handlers
  const handleLink = async (studentId: string) => {
    setLinkingTargetId(studentId);
    try {
      await linkStudent(studentId);
      toast.success("Alumno vinculado correctamente");
    } catch {
      toast.error("Error al vincular alumno");
    } finally {
      setLinkingTargetId(null);
    }
  };

  const handleUnlink = async (student: LinkedStudent) => {
    setUnlinkingTargetId(student.user_id);
    try {
      await unlinkStudent(student.user_id);
      toast.success("Alumno removido correctamente");
      if (selectedStudentId === student.user_id) setSelectedStudentId(null);
    } catch {
      toast.error("Error al remover alumno");
    } finally {
      setUnlinkingTargetId(null);
    }
  };

  const handleCreateStudent = async () => {
    try {
      await createStudentProfile({
        name: newStudentData.name.trim(),
        weight: newStudentData.weight ? parseFloat(newStudentData.weight) : undefined,
        age: newStudentData.age ? parseInt(newStudentData.age) : undefined,
      });
      toast.success("Alumno creado y vinculado correctamente");
      setShowCreateDialog(false);
      setNewStudentData({ name: "", weight: "", age: "" });
    } catch {
      toast.error("Error al crear alumno");
    }
  };

  const confirmDeleteStudent = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStudent(deleteTarget.user_id);
      toast.success("Alumno eliminado permanentemente");
      if (selectedStudentId === deleteTarget.user_id) setSelectedStudentId(null);
    } catch {
      toast.error("Error al eliminar alumno");
    } finally {
      setDeleteTarget(null);
    }
  };

  const selectedStudent = linkedStudents.find((s) => s.user_id === selectedStudentId) || null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const paidStudentsCount = linkedStudents.filter(s => s.paymentStatus === "pagado").length;

  return (
    <div className="max-w-7xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-base shadow-sm">
            TR
          </div>
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{getGreeting()}</p>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-0.5">Panel del Entrenador</h1>
            <p className="text-xs text-muted-foreground font-medium capitalize mt-0.5">{formattedDate}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          <Button 
            size="sm" 
            className="h-8.5 rounded-lg text-xs font-semibold px-4 shadow-sm"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Crear Alumno
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PremiumCard className="hover:border-primary/20">
          <PremiumCardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Alumnos Vinculados</p>
              <h3 className="text-base font-bold text-foreground mt-0.5">{linkedStudents.length} Activos</h3>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard className="hover:border-emerald-500/20">
          <PremiumCardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Estado de Pagos</p>
              <h3 className="text-base font-bold text-foreground mt-0.5">{paidStudentsCount} de {linkedStudents.length} al día</h3>
            </div>
          </PremiumCardContent>
        </PremiumCard>

        <PremiumCard className="hover:border-amber-500/20">
          <PremiumCardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Alumnos por Vincular</p>
              <h3 className="text-base font-bold text-foreground mt-0.5">{availableStudents.length} Disponibles</h3>
            </div>
          </PremiumCardContent>
        </PremiumCard>
      </div>

      {/* Quick Actions for Trainer */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Accesos Rápidos</span>
          <div className="h-[1px] w-full bg-border/50" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/trainer/groups")}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] transition-ds shadow-sm sm:col-span-2",
              "text-blue-500 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/15"
            )}
          >
            <Users className="h-5 w-5 mb-1.5" />
            <span className="text-xs font-bold">Gestión de Grupos y alumnos</span>
          </button>
          {[
            { label: "Administrar Encuestas", path: "/trainer/surveys", icon: ClipboardList, color: "text-amber-500 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15" },
            { label: "Gestionar Planes", path: "/trainer/plans", icon: FileText, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15" }
          ].map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => navigate(action.path)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] transition-ds shadow-sm",
                  action.color
                )}
              >
                <Icon className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-bold">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 min-h-[70vh] relative z-10">
        
        {/* LEFT COLUMN: Lists */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col gap-6">
          <StudentsList
            students={linkedStudents}
            isLoading={isLoadingLinked}
            selectedStudentId={selectedStudentId}
            onSelect={setSelectedStudentId}
            onUnlink={handleUnlink}
            unlinkingId={unlinkingTargetId}
            onCreateClick={() => setShowCreateDialog(true)}
            itemVariants={itemVariants}
          />

          <AvailableStudentsList
            students={availableStudents}
            isLoading={isLoadingAvailable}
            onLink={handleLink}
            linkingId={linkingTargetId}
            itemVariants={itemVariants}
          />
        </motion.div>

        {/* RIGHT COLUMN: Details */}
        <StudentDetailPanel 
          student={selectedStudent} 
          onDeleteClick={setDeleteTarget} 
        />

      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar alumno permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{deleteTarget?.display_name}</strong> de forma permanente?
              Esta acción eliminará todos los ejercicios, planes, registros y seguimiento asociados.
              <span className="block mt-2 font-semibold text-destructive">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStudent}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sí, eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Student Dialog */}
      <CreateStudentDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        newStudentData={newStudentData}
        setNewStudentData={setNewStudentData}
        onCreate={handleCreateStudent}
        isCreating={isCreatingProfile}
      />

    </div>
  );
}
