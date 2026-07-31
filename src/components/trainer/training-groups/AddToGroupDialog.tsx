import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Users, AlertCircle } from "lucide-react";
import type { TrainingGroup, RoutineAction } from "@/hooks/trainer/useTrainingGroups";

interface AddToGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentId: string;
  groups: TrainingGroup[];
  hasActiveRoutine: boolean;
  onConfirm: (groupId: string, studentIds: string[], routineAction: RoutineAction) => Promise<void>;
  isAdding: boolean;
}

export const AddToGroupDialog: React.FC<AddToGroupDialogProps> = ({
  open,
  onOpenChange,
  studentName,
  studentId,
  groups,
  hasActiveRoutine,
  onConfirm,
  isAdding,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [routineAction, setRoutineAction] = useState<RoutineAction>("archive");

  useEffect(() => {
    if (open) {
      setSelectedGroupId(null);
      setRoutineAction("archive");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!selectedGroupId) return;
    await onConfirm(selectedGroupId, [studentId], routineAction);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Agregar a Grupo
          </DialogTitle>
          <DialogDescription className="text-xs">
            Selecciona el grupo para <strong>{studentName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Group selection */}
          <div className="space-y-2">
            <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
              Grupo Destino
            </Label>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No hay grupos creados. Crea un grupo primero.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroupId(g.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedGroupId === g.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border/40 bg-secondary/10 hover:bg-secondary/20"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        selectedGroupId === g.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {g.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Routine action — only shown if student has an active individual routine */}
          {hasActiveRoutine && selectedGroupId && (
            <div className="space-y-3 p-3.5 rounded-xl border border-orange-500/30 bg-orange-500/5 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Rutina individual activa
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Este alumno tiene una rutina individual. ¿Qué deseas hacer con ella?
                  </p>
                </div>
              </div>
              <RadioGroup
                value={routineAction}
                onValueChange={(val) => setRoutineAction(val as RoutineAction)}
                className="space-y-2 pl-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="archive" id="routine-archive" />
                  <Label htmlFor="routine-archive" className="text-xs font-medium cursor-pointer">
                    Archivar <span className="text-muted-foreground">(recomendado)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="keep" id="routine-keep" />
                  <Label htmlFor="routine-keep" className="text-xs font-medium cursor-pointer">
                    Conservar <span className="text-muted-foreground">(queda activa pero no se usa)</span>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delete" id="routine-delete" />
                  <Label htmlFor="routine-delete" className="text-xs font-medium cursor-pointer text-destructive">
                    Eliminar <span className="text-muted-foreground">(se pierden los ejercicios)</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAdding}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedGroupId || isAdding}
            className="text-xs gap-1.5"
          >
            {isAdding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
