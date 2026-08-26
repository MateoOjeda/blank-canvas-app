import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dumbbell, Apple, TrendingUp } from "lucide-react";

interface PlanAssignmentCardProps {
  selectedEntrenamiento: string;
  selectedAlimentacion: string;
  selectedCambioFisico: string;
  handlePlanChangeRequest: (type: string, val: string) => void;
}

const LEVEL_LABELS: Record<string, string> = {
  principiante: "Inicial",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export function PlanAssignmentCard({
  selectedEntrenamiento,
  selectedAlimentacion,
  selectedCambioFisico,
  handlePlanChangeRequest
}: PlanAssignmentCardProps) {
  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm animate-in fade-in duration-200">
      <CardHeader className="pb-3 p-4 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configurar Niveles de Plan</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {[
          { type: "entrenamiento", icon: Dumbbell, label: "Entrenamiento", selected: selectedEntrenamiento },
          { type: "nutricion", icon: Apple, label: "Alimentación", selected: selectedAlimentacion },
          { type: "cambios_fisicos", icon: TrendingUp, label: "Cambio Físico", selected: selectedCambioFisico },
        ].map(({ type, icon: Icon, label, selected }) => (
          <div key={type} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-secondary/20 border border-border/40">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <Label className="text-xs font-bold block">{label}</Label>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {selected !== "none" ? `Activo: ${LEVEL_LABELS[selected]}` : "Sin asignar"}
                </span>
              </div>
            </div>
            <Select value={selected} onValueChange={(val) => handlePlanChangeRequest(type, val)}>
              <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin plan</SelectItem>
                <SelectItem value="principiante">Inicial</SelectItem>
                <SelectItem value="intermedio">Intermedio</SelectItem>
                <SelectItem value="avanzado">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
