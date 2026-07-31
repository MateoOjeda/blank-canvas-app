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
import { Loader2, ArrowRight, Users } from "lucide-react";
import type { TrainingGroup } from "@/hooks/trainer/useTrainingGroups";

interface MoveStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  currentGroupName: string;
  currentGroupId: string;
  memberId: string;
  studentId: string;
  previousRoutineId?: string | null;
  availableGroups: TrainingGroup[];
  onConfirm: (params: {
    memberId: string;
    studentId: string;
    fromGroupId: string;
    toGroupId: string;
    previousRoutineId?: string | null;
  }) => Promise<void>;
  isMoving: boolean;
}

export const MoveStudentDialog: React.FC<MoveStudentDialogProps> = ({
  open,
  onOpenChange,
  studentName,
  currentGroupName,
  currentGroupId,
  memberId,
  studentId,
  previousRoutineId,
  availableGroups,
  onConfirm,
  isMoving,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Filter out the current group
  const targetGroups = availableGroups.filter((g) => g.id !== currentGroupId);

  useEffect(() => {
    if (open) setSelectedGroupId(null);
  }, [open]);

  const handleConfirm = async () => {
    if (!selectedGroupId) return;
    await onConfirm({
      memberId,
      studentId,
      fromGroupId: currentGroupId,
      toGroupId: selectedGroupId,
      previousRoutineId,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="h-4 w-4 text-primary" />
            Mover Alumno
          </DialogTitle>
          <DialogDescription className="text-xs">
            Mover a <strong>{studentName}</strong> desde{" "}
            <strong>{currentGroupName}</strong> a otro grupo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
            Grupo Destino
          </Label>
          {targetGroups.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">
              No hay otros grupos disponibles. Crea un grupo primero.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {targetGroups.map((g) => (
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
            className="text-xs"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedGroupId || isMoving}
            className="text-xs gap-1.5"
          >
            {isMoving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Mover
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
