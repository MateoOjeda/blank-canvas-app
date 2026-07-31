import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pencil } from "lucide-react";

interface RenameGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  onConfirm: (newName: string) => Promise<void>;
  isRenaming: boolean;
}

export const RenameGroupDialog: React.FC<RenameGroupDialogProps> = ({
  open,
  onOpenChange,
  currentName,
  onConfirm,
  isRenaming,
}) => {
  const [name, setName] = useState(currentName);

  // Sync when dialog opens with a new name
  React.useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;
    await onConfirm(name.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Pencil className="h-4 w-4 text-primary" />
            Renombrar Grupo
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ingresa el nuevo nombre para el grupo &quot;{currentName}&quot;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nombre del Grupo
            </Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Principiantes"
              className="h-10"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRenaming}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || name.trim() === currentName || isRenaming}
              className="text-xs gap-1.5"
            >
              {isRenaming && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
