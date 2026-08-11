import React from "react";
import { cn } from "@/lib/utils";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/ui/premium-card";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dumbbell, Trash2 } from "lucide-react";
import type { Exercise } from "@/services/routines";

interface ExerciseListPanelProps {
  selectedDay: string;
  combinedBodyPart: string;
  parentExercises: Exercise[];
  childByParent: Map<string, Exercise>;
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onBulkDeleteRequest: () => void;
  deleting: boolean;
  loading: boolean;
}

export const ExerciseListPanel: React.FC<ExerciseListPanelProps> = ({
  selectedDay,
  combinedBodyPart,
  parentExercises,
  childByParent,
  selectedIds,
  toggleSelect,
  onRemove,
  onBulkDeleteRequest,
  deleting,
  loading,
}) => {
  return (
    <PremiumCard className="overflow-hidden">
      <PremiumCardHeader className="p-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between gap-4">
          <PremiumCardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <div className="p-1 bg-primary/10 rounded-md">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            Ejercicios del {selectedDay}
            {combinedBodyPart && (
              <StatusBadge
                status="activo"
                label={combinedBodyPart}
                className="ml-1.5"
              />
            )}
          </PremiumCardTitle>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-3 rounded-lg text-xs font-semibold"
              onClick={onBulkDeleteRequest}
              disabled={deleting}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Borrar ({selectedIds.size})
            </Button>
          )}
        </div>
      </PremiumCardHeader>
      <PremiumCardContent className="p-4 overflow-y-auto max-h-[700px] hide-scrollbar">
        {loading ? (
          <LoadingSkeleton type="list" count={4} />
        ) : parentExercises.length === 0 ? (
          <EmptyState
            type="empty"
            title="Sin ejercicios programados"
            description="Configura los músculos del día y completa el formulario de la izquierda para añadir tu primer ejercicio."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {parentExercises.map((ex) => {
              const child = childByParent.get(ex.id);
              const isSelected = selectedIds.has(ex.id);
              return (
                <div key={ex.id} className="group/item space-y-1.5">
                  <div className={cn(
                    "flex items-center gap-3.5 p-3.5 rounded-xl transition-all duration-200 border",
                    isSelected
                      ? "bg-primary/5 border-primary/30 shadow-sm"
                      : "bg-secondary/15 border-border/50 hover:bg-secondary/25 hover:border-border/60 hover:scale-[1.01]"
                  )}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelect(ex.id)}
                      className="h-4.5 w-4.5 rounded-md border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-foreground tracking-tight truncate">{ex.name}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                        <span className="text-primary font-bold">{ex.sets || "-"} SERIES</span>
                        <span className="opacity-40">·</span>
                        <span className={cn(ex.is_to_failure || ex.is_piramide ? "text-destructive" : "text-foreground/80")}>
                          {ex.is_piramide && ex.pyramid_reps ? ex.pyramid_reps : ex.is_to_failure ? "AL FALLO" : `${ex.reps} REPS`}
                        </span>
                        {ex.is_dropset && (
                          <>
                            <span className="opacity-40">·</span>
                            <StatusBadge status="dropset" className="h-4 py-0" />
                          </>
                        )}
                        {ex.is_piramide && (
                          <>
                            <span className="opacity-40">·</span>
                            <StatusBadge status="piramide" className="h-4 py-0" />
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost" size="icon"
                      className="h-8.5 w-8.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover/item:opacity-100 transition-all duration-200"
                      onClick={() => onRemove(ex.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {child && (
                    <div className="ml-7 mt-0.5 flex items-center gap-3.5 p-3 rounded-xl bg-primary/5 border border-primary/10 shadow-sm animate-in slide-in-from-left-2 relative">
                      <div className="absolute left-[-16px] top-[-8px] bottom-1/2 w-4 border-l-2 border-b-2 border-primary/20 rounded-bl-lg pointer-events-none" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[11px] text-primary uppercase tracking-wide truncate">{child.name}</p>
                          <StatusBadge status="global" label="BI SERIE" className="h-3.5 py-0" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold">
                          <span className="text-muted-foreground">{child.sets || "-"} SETS</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className={child.is_to_failure ? "text-destructive" : "text-muted-foreground"}>
                            {child.is_to_failure ? "AL FALLO" : `${child.reps} REPS`}
                          </span>
                          {child.is_dropset && <StatusBadge status="dropset" label="DS" className="h-3 py-0 px-1" />}
                        </div>
                      </div>
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-45 hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => onRemove(child.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </PremiumCardContent>
    </PremiumCard>
  );
};
