import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, FileText, TrendingUp } from "lucide-react";

interface DashboardPlanDetailsProps {
  studentData: any;
}

export const DashboardPlanDetails: React.FC<DashboardPlanDetailsProps> = ({
  studentData,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">Planes Activados</span>
        <div className="h-[1px] w-full bg-border/50" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {studentData?.plan_entrenamiento && (
          <Card className="bg-card/50 border border-border/40 rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all transition-ds">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shrink-0">
              <Dumbbell className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Entrenamiento</p>
              <p className="font-semibold text-xs truncate text-foreground">{studentData.plan_entrenamiento}</p>
            </div>
          </Card>
        )}
        {studentData?.plan_alimentacion && (
          <Card className="bg-card/50 border border-border/40 rounded-xl p-4 flex items-center gap-4 hover:border-emerald-500/30 transition-all transition-ds">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Nutrición</p>
              <p className="font-semibold text-xs truncate text-foreground">{studentData.plan_alimentacion}</p>
            </div>
          </Card>
        )}
        {studentData?.plan_cambio_fisico && (
          <Card className="bg-card/50 border border-border/40 rounded-xl p-4 flex items-center gap-4 hover:border-amber-500/30 transition-all transition-ds">
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Cambio Físico</p>
              <p className="font-semibold text-xs truncate text-foreground">{studentData.plan_cambio_fisico}</p>
            </div>
          </Card>
        )}
        {!studentData?.plan_entrenamiento && !studentData?.plan_alimentacion && !studentData?.plan_cambio_fisico && (
          <Card className="bg-card/30 border border-dashed border-border/80 rounded-xl p-6 text-center col-span-full">
            <p className="text-xs text-muted-foreground font-medium">No tienes planes asignados actualmente</p>
          </Card>
        )}
      </div>
    </div>
  );
};
