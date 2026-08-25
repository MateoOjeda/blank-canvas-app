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
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <PremiumCard className="hover:border-primary/20">
        <PremiumCardContent className="p-2 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-4">
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-primary/10 border border-primary/20 rounded-lg sm:rounded-xl flex items-center justify-center text-primary shrink-0">
            <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[8px] sm:text-[9px] leading-tight font-bold text-muted-foreground uppercase tracking-wider">Total Ejercicios</p>
            <h3 className="text-xs sm:text-base font-bold text-foreground mt-0.5 truncate">{exercises.length} Cargados</h3>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard className="hover:border-blue-500/20">
        <PremiumCardContent className="p-2 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-4">
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-blue-500/10 border border-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-500 shrink-0">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[8px] sm:text-[9px] leading-tight font-bold text-muted-foreground uppercase tracking-wider">Ejercicios del {selectedDay}</p>
            <h3 className="text-xs sm:text-base font-bold text-foreground mt-0.5 truncate">{exercises.filter(e => e.day === selectedDay).length} Programados</h3>
          </div>
        </PremiumCardContent>
      </PremiumCard>

      <PremiumCard className="hover:border-emerald-500/20">
        <PremiumCardContent className="p-2 sm:p-4 flex flex-col items-center text-center gap-1.5 sm:flex-row sm:text-left sm:gap-4">
          <div className="h-8 w-8 sm:h-10 sm:w-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0 w-full">
            <p className="text-[8px] sm:text-[9px] leading-tight font-bold text-muted-foreground uppercase tracking-wider">Músculos ({selectedDay})</p>
            <h3 className="text-xs sm:text-base font-bold text-foreground mt-0.5 truncate">{combinedBodyPart || "No definidos"}</h3>
          </div>
        </PremiumCardContent>
      </PremiumCard>
    </div>
  );
};
