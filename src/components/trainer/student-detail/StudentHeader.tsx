import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Calendar, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentHeaderProps {
  profile: any;
  paymentPaid: boolean;
  onPaymentToggle: (checked: boolean) => void;
  selectedEntrenamiento: string;
  selectedAlimentacion: string;
  selectedCambioFisico: string;
  editingPlans: boolean;
  setEditingPlans: (v: boolean) => void;
  navigate: any;
}

const LEVEL_LABELS_HEADER: Record<string, string> = {
  principiante: "Inicial",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export function StudentHeader({
  profile,
  paymentPaid,
  onPaymentToggle,
  selectedEntrenamiento,
  selectedAlimentacion,
  selectedCambioFisico,
  editingPlans,
  setEditingPlans,
  navigate
}: StudentHeaderProps) {
  const joinDate = profile.created_at ? new Date(profile.created_at).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }) : "Reciente";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-card/60 p-6 shadow-sm">
      <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl -z-10" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg shrink-0" onClick={() => navigate("/trainer/students")}>
            <ArrowLeft className="h-4.5 w-4.5" />
          </Button>
          
          <Avatar className="h-16 w-16 border-2 border-primary/20 shadow-md shrink-0">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
              {profile.avatar_initials || (profile.display_name || "??").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-foreground">{profile.display_name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn(
                "text-[9px] font-bold px-2 py-0.5 rounded-md border-none",
                paymentPaid ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
              )}>
                {paymentPaid ? "✓ Pago al día" : "✗ Pago Pendiente"}
              </Badge>
              
              {selectedEntrenamiento !== "none" && (
                <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border-none">
                  Entrenamiento: {LEVEL_LABELS_HEADER[selectedEntrenamiento] || selectedEntrenamiento}
                </Badge>
              )}

              {selectedAlimentacion !== "none" && (
                <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-none">
                  Nutrición: {LEVEL_LABELS_HEADER[selectedAlimentacion] || selectedAlimentacion}
                </Badge>
              )}

              {selectedCambioFisico !== "none" && (
                <Badge variant="outline" className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none">
                  Cambio Físico: {LEVEL_LABELS_HEADER[selectedCambioFisico] || selectedCambioFisico}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3 inline text-primary" />
              Alumno desde el {joinDate}
            </p>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-muted/40 px-3.5 py-1.5 rounded-xl border border-border/50 shadow-sm">
            <Label htmlFor="payment-switch-header" className="text-xs font-bold text-muted-foreground mr-1">
              Pago Registrado:
            </Label>
            <Switch 
              id="payment-switch-header" 
              checked={paymentPaid} 
              onCheckedChange={onPaymentToggle}
              className="data-[state=checked]:bg-emerald-500" 
            />
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-9 rounded-xl font-semibold text-xs border-border/60 hover:bg-muted/10 gap-1.5",
              editingPlans && "bg-primary/10 border-primary/30 text-primary hover:bg-primary/15"
            )}
            onClick={() => setEditingPlans(!editingPlans)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Planificar
          </Button>
        </div>
      </div>
    </div>
  );
}
