import { useState } from "react";
import { useStudentsManager } from "@/hooks/useStudentsManager";
import { toast } from "sonner";
import { Users, Plus, FileText, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { CreateStudentDialog } from "@/components/trainer/students/CreateStudentDialog";

export default function StudentsPage() {
  const {
    createStudentProfile,
    isCreatingProfile
  } = useStudentsManager();

  const navigate = useNavigate();

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

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newStudentData, setNewStudentData] = useState({ name: "", weight: "", age: "" });

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
