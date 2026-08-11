import React from "react";
import { PremiumCard, PremiumCardContent } from "@/components/ui/premium-card";
import { Dumbbell, Clock, Users } from "lucide-react";
import type { Exercise } from "@/services/routines";

interface RoutineKpiCardsProps {
  exercises: Exercise[];
  selectedDay: string;
  combinedBodyPart: string;
}

export const RoutineKpiCards: React.FC<RoutineKpiCardsProps> = ({
  exercises,
  selectedDay,
  combinedBodyPart,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <PremiumCard className="hover:border-primary/20">
        <PremiumCardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary shrink-0">
            <Dumbbell className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Total Ejercicios</p>
            <h3 className="text-base font-bold text-foreground mt-0.5">{exercises.length} Cargados</h3>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard className="hover:border-blue-500/20">
        <PremiumCardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-500 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Ejercicios del {selectedDay}</p>
            <h3 className="text-base font-bold text-foreground mt-0.5">{exercises.filter(e => e.day === selectedDay).length} Programados</h3>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard className="hover:border-emerald-500/20">
        <PremiumCardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Músculos ({selectedDay})</p>
            <h3 className="text-base font-bold text-foreground mt-0.5 truncate">{combinedBodyPart || "No definidos"}</h3>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
};
