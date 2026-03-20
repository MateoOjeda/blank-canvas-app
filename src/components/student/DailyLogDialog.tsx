import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  exercise: {
    id: string;
    name: string;
    sets: number;
    reps: number;
    weight: number;
  };
  studentId: string;
  trainerId: string;
}

export default function DailyLogDialog({ open, onClose, exercise, studentId, trainerId }: Props) {
  const [actualSets, setActualSets] = useState(String(exercise.sets));
  const [actualReps, setActualReps] = useState(String(exercise.reps));
  const [actualWeight, setActualWeight] = useState(String(exercise.weight));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("exercise_logs")
      .upsert({
        exercise_id: exercise.id,
        student_id: studentId,
        trainer_id: trainerId,
        log_date: today,
        completed: true,
        actual_sets: parseInt(actualSets) || null,
        actual_reps: parseInt(actualReps) || null,
        actual_weight: parseFloat(actualWeight) || null,
        notes,
      }, { onConflict: "exercise_id,log_date" });

    setSaving(false);
    if (error) {
      toast.error("Error al guardar el registro");
    } else {
      toast.success("Registro guardado");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{exercise.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Programado: {exercise.sets}×{exercise.reps} · {exercise.weight}kg
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Series reales</Label>
              <Input
                type="number"
                value={actualSets}
                onChange={(e) => setActualSets(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Reps reales</Label>
              <Input
                type="number"
                value={actualReps}
                onChange={(e) => setActualReps(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Peso real (kg)</Label>
              <Input
                type="number"
                step="0.5"
                value={actualWeight}
                onChange={(e) => setActualWeight(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Notas / Feedback del día</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Me dolió la rodilla, mucha energía..."
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
