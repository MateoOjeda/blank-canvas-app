import React from "react";
import { cn } from "@/lib/utils";
import type { DayConfig, Exercise } from "@/services/routines";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const DAY_SHORT = ["L", "M", "X", "J", "V", "S", "D"];

interface DaySelectorProps {
  exercises: Exercise[];
  dayConfigs: Record<string, DayConfig>;
  selectedDay: string;
  onSelectDay: (day: string) => void;
  onClearSelection: () => void;
}

export const DaySelector: React.FC<DaySelectorProps> = ({
  exercises,
  dayConfigs,
  selectedDay,
  onSelectDay,
  onClearSelection,
}) => {
  return (
    <div className="grid grid-cols-7 gap-2">
      {DAYS.map((day, i) => {
        const count = exercises.filter((e) => e.day === day).length;
        const dc = dayConfigs[day];
        const isActive = selectedDay === day;
        return (
          <button
            key={day}
            onClick={() => { onSelectDay(day); onClearSelection(); }}
            className={cn(
              "relative flex flex-col items-center justify-center w-full h-16 rounded-2xl text-xs font-bold transition-all border-2",
              isActive
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105 z-10"
                : "bg-card/40 text-muted-foreground border-border/50 hover:border-primary/40 hover:bg-card/60"
            )}
          >
            <span className="text-[11px] sm:text-xs">{DAY_SHORT[i]}</span>
            {count > 0 && <span className={cn("text-[10px] mt-0.5", isActive ? "text-primary-foreground" : "text-primary")}>{count}</span>}
            {dc?.body_part_1 && (
              <span className={cn(
                "text-[8px] mt-0.5 truncate max-w-[45px] uppercase tracking-tighter opacity-70",
                isActive ? "text-primary-foreground" : "text-muted-foreground"
              )}>
                {dc.body_part_1.slice(0, 5)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
