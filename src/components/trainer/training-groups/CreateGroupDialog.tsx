import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2, Plus } from "lucide-react";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  creating: boolean;
  createGroup: () => void;
}

export const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({
  open,
  onOpenChange,
  newGroupName,
  setNewGroupName,
  creating,
  createGroup,
}) => {
  const handleCreate = () => {
    createGroup();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-border/40 bg-card/95 shadow-xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/40">
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Nuevo Grupo de Entrenamiento
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Asigna un nombre descriptivo para identificar al grupo (ej: Principiantes Mañana, Fuerza Avanzado).
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="create-group-dialog-input" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Nombre del grupo
            </Label>
            <div className="relative">
              <Users className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
              <Input
                id="create-group-dialog-input"
                placeholder="Nombre del grupo..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !creating && newGroupName.trim() && handleCreate()}
                className="pl-9 h-10 text-xs border-border/50 bg-secondary/15"
                autoFocus
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/40 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 rounded-xl text-xs font-semibold"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="h-9 px-4 rounded-xl text-xs font-bold shadow-sm"
            onClick={handleCreate}
            disabled={creating || !newGroupName.trim()}
          >
            {creating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Plus className="h-3.5 w-3.5 mr-1.5" />
            )}
            Crear Grupo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
