import React, { useState } from "react";
import { AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  MoreVertical,
  Pencil,
  UserPlus,
  Trash2,
  Dumbbell,
  Edit3,
  Eye,
  Loader2,
} from "lucide-react";
import { GroupMemberRow } from "./GroupMemberRow";
import { useGroupExercises } from "@/hooks/trainer/useTrainingGroups";
import type {
  TrainingGroup,
  GroupMember,
} from "@/hooks/trainer/useTrainingGroups";
import type { LinkedStudentProfile } from "@/hooks/useLinkedStudents";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface GroupAccordionItemProps {
  group: TrainingGroup;
  members: GroupMember[];
  students: LinkedStudentProfile[];
  ungroupedStudents: LinkedStudentProfile[];
  isExpanded: boolean;
  // Actions
  onRename: (group: TrainingGroup) => void;
  onDelete: (group: TrainingGroup) => void;
  onAddStudents: (groupId: string, studentIds: string[]) => void;
  onRemoveMember: (memberId: string) => void;
  onMoveStudent: (memberId: string, studentId: string) => void;
  onNavigateToRoutine: (groupId: string) => void;
  onViewNutrition: (studentId: string) => void;
  onViewProgress: (studentId: string) => void;
}

export const GroupAccordionItem: React.FC<GroupAccordionItemProps> = ({
  group,
  members,
  students,
  ungroupedStudents,
  isExpanded,
  onRename,
  onDelete,
  onAddStudents,
  onRemoveMember,
  onMoveStudent,
  onNavigateToRoutine,
  onViewNutrition,
  onViewProgress,
}) => {
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [showInlineRoutine, setShowInlineRoutine] = useState(false);
  const [removeMemberTarget, setRemoveMemberTarget] = useState<string | null>(null);

  // Lazy-loaded exercises — only fetched when accordion is expanded
  const { exercises, isLoading: isLoadingExercises } = useGroupExercises(
    isExpanded ? group.id : undefined
  );

  // Derive routine metadata for the trigger
  const exerciseCount = exercises.length;
  const daysWithExercises = new Set(exercises.map((e) => e.day)).size;

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddStudents = () => {
    if (selectedStudentIds.size === 0) return;
    onAddStudents(group.id, Array.from(selectedStudentIds));
    setSelectedStudentIds(new Set());
    setShowAddMembers(false);
  };

  const handleConfirmRemove = () => {
    if (removeMemberTarget) {
      onRemoveMember(removeMemberTarget);
      setRemoveMemberTarget(null);
    }
  };

  return (
    <>
      <AccordionItem
        value={group.id}
        className="border border-border/40 rounded-xl bg-card/60 shadow-sm overflow-hidden"
      >
        {/* ─── ENRICHED TRIGGER ─── */}
        <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-muted/20 transition-colors [&>svg]:text-muted-foreground">
          <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground truncate">
                  {group.name}
                </span>
                <Badge
                  variant="outline"
                  className="text-[8px] font-bold px-1.5 py-0 rounded border-primary/20 bg-primary/5 text-primary shrink-0"
                >
                  {members.length} alumno{members.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {isExpanded && exerciseCount > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {exerciseCount} ejercicio{exerciseCount !== 1 ? "s" : ""} · {daysWithExercises} día{daysWithExercises !== 1 ? "s" : ""}
                  </span>
                )}
                {isExpanded && exerciseCount === 0 && !isLoadingExercises && (
                  <span className="text-[10px] text-muted-foreground font-medium italic">
                    Sin rutina configurada
                  </span>
                )}
              </div>
            </div>

            {/* ⋮ Menu — prevent accordion toggle on click */}
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => onRename(group)}
                    className="text-xs gap-2 cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Renombrar grupo
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowAddMembers(true)}
                    className="text-xs gap-2 cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Agregar alumno
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(group)}
                    className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar grupo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </AccordionTrigger>

        {/* ─── ACCORDION CONTENT ─── */}
        <AccordionContent className="px-4 pb-4 space-y-5">
          {/* ── ROUTINE SECTION ── */}
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Dumbbell className="h-3.5 w-3.5 text-primary" />
              Rutina del Grupo
            </h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInlineRoutine(!showInlineRoutine)}
                className="gap-1.5 h-8 text-[10px] font-bold rounded-lg border-border/60"
              >
                <Eye className="h-3 w-3" />
                {showInlineRoutine ? "Ocultar" : "Vista Previa"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateToRoutine(group.id)}
                className="gap-1.5 h-8 text-[10px] font-bold rounded-lg border-border/60"
              >
                <Edit3 className="h-3 w-3" />
                Editar Rutina
              </Button>
            </div>

            {/* Inline routine preview */}
            {showInlineRoutine && (
              <div className="pt-3 border-t border-border/30 animate-in fade-in slide-in-from-top-2">
                {isLoadingExercises ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : exercises.length === 0 ? (
                  <div className="text-center py-6 border border-dashed rounded-xl bg-secondary/10 border-border/50">
                    <Dumbbell className="h-5 w-5 mx-auto text-muted-foreground/35 mb-1.5" />
                    <p className="text-[10px] text-muted-foreground font-semibold">
                      Sin ejercicios cargados
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 hide-scrollbar">
                    {DAYS.map((day) => {
                      const dayExs = exercises.filter((e) => e.day === day);
                      if (dayExs.length === 0) return null;
                      return (
                        <div key={day} className="space-y-1.5">
                          <Badge
                            variant="outline"
                            className="border-primary/20 bg-primary/5 text-primary text-[8px] font-bold px-2 py-0.5 rounded"
                          >
                            {day}
                          </Badge>
                          {dayExs.map((ex) => (
                            <div
                              key={ex.id}
                              className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/15 border border-border/30"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-foreground truncate">
                                  {ex.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">
                                  {ex.body_part && (
                                    <span className="text-primary font-bold">
                                      {ex.body_part} ·{" "}
                                    </span>
                                  )}
                                  {ex.sets} ×{" "}
                                  {ex.is_to_failure ? (
                                    <span className="text-destructive font-bold">
                                      Al Fallo
                                    </span>
                                  ) : (
                                    `${ex.reps} REPS`
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ADD MEMBERS SECTION ── */}
          {showAddMembers && (
            <div className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                    Vincular Alumnos al Grupo
                  </Label>
                  <p className="text-[10px] text-muted-foreground">
                    Solo se muestran alumnos que no pertenecen a ningún grupo.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddMembers(false);
                    setSelectedStudentIds(new Set());
                  }}
                  className="h-7 text-[10px] text-muted-foreground"
                >
                  Cerrar
                </Button>
              </div>
              {ungroupedStudents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic py-2">
                  Todos tus alumnos ya pertenecen a un grupo.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 hide-scrollbar">
                    {ungroupedStudents.map((s) => (
                      <label
                        key={s.user_id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-card/60 hover:bg-muted/10 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-[9px]">
                            {(s.display_name || "Al").substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-foreground">
                            {s.display_name || "Alumno"}
                          </span>
                        </div>
                        <Checkbox
                          checked={selectedStudentIds.has(s.user_id)}
                          onCheckedChange={() => toggleStudentSelection(s.user_id)}
                          className="h-4.5 w-4.5 rounded-md border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </label>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    onClick={handleAddStudents}
                    disabled={selectedStudentIds.size === 0}
                    className="gap-1.5 h-8.5 text-xs font-bold rounded-lg w-full sm:w-auto"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Confirmar ({selectedStudentIds.size})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── MEMBERS LIST ── */}
          <div className="space-y-3">
            <h4 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              Miembros ({members.length})
            </h4>
            {members.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-xl bg-secondary/10 border-border/50">
                <Users className="h-5 w-5 mx-auto text-muted-foreground/35 mb-1.5" />
                <p className="text-[10px] text-muted-foreground font-semibold">
                  Sin miembros vinculados
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 hide-scrollbar">
                {members.map((m) => {
                  const student = students.find((s) => s.user_id === m.student_id);
                  return (
                    <GroupMemberRow
                      key={m.id}
                      student={student}
                      memberId={m.id}
                      studentId={m.student_id}
                      onViewNutrition={onViewNutrition}
                      onViewProgress={onViewProgress}
                      onMoveStudent={onMoveStudent}
                      onRemove={(id) => setRemoveMemberTarget(id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* ── REMOVE MEMBER CONFIRMATION ── */}
      <AlertDialog
        open={!!removeMemberTarget}
        onOpenChange={() => setRemoveMemberTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">¿Retirar del grupo?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              El alumno será movido a la sección &quot;Sin Grupo&quot;. Podrás reasignarlo después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove} className="text-xs">
              Retirar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
