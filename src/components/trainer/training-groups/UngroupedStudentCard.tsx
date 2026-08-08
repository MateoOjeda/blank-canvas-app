import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dumbbell, Apple, TrendingUp, UserPlus } from "lucide-react";
import type { LinkedStudentProfile } from "@/hooks/useLinkedStudents";

interface UngroupedStudentCardProps {
  student: LinkedStudentProfile;
  /** Navigate directly to the student's routine edit/create flow */
  onRoutine: (studentId: string) => void;
  /** Navigate directly to the student's nutrition plan */
  onNutrition: (studentId: string) => void;
  /** Navigate directly to the student's tracking dashboard */
  onProgress: (studentId: string) => void;
  /** Open the group-selection dialog */
  onAddToGroup: (studentId: string) => void;
}

// ── Reusable quick-action icon button ─────────────────────────────────────────
interface ActionIconProps {
  tooltip: string;
  onClick: () => void;
  icon: React.ReactNode;
  colorClass: string;
  hoverBgClass: string;
}

const ActionIcon: React.FC<ActionIconProps> = ({
  tooltip,
  onClick,
  icon,
  colorClass,
  hoverBgClass,
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        aria-label={tooltip}
        className={`
          flex items-center justify-center
          h-9 w-9 rounded-xl border border-border/30
          bg-background/60 backdrop-blur-sm
          transition-all duration-200 ease-out
          hover:scale-110 hover:shadow-md hover:border-border/60
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          ${hoverBgClass}
        `}
      >
        <span className={`transition-colors duration-150 ${colorClass}`}>
          {icon}
        </span>
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-[10px] font-semibold px-2 py-1">
      {tooltip}
    </TooltipContent>
  </Tooltip>
);

// ── UngroupedStudentCard ───────────────────────────────────────────────────────
export const UngroupedStudentCard: React.FC<UngroupedStudentCardProps> = ({
  student,
  onRoutine,
  onNutrition,
  onProgress,
  onAddToGroup,
}) => {
  const initials = (student.display_name || "??")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <Card
      className="
        group border border-border/40 bg-card/70 rounded-xl shadow-sm
        hover:shadow-md hover:border-primary/25 hover:bg-card
        transition-all duration-200 ease-out
      "
    >
      <CardContent className="p-3.5">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <Avatar
            className="
              h-10 w-10 border-2 border-border/20 shrink-0
              ring-2 ring-transparent group-hover:ring-primary/20
              transition-all duration-200
            "
          >
            <AvatarImage src={student.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name + subtitle */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate leading-tight">
              {student.display_name}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
              Rutina Individual
            </p>
          </div>

          {/* Quick action icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ActionIcon
              tooltip="Rutina"
              onClick={() => onRoutine(student.user_id)}
              icon={<Dumbbell className="h-4 w-4" />}
              colorClass="text-primary"
              hoverBgClass="hover:bg-primary/10"
            />
            <ActionIcon
              tooltip="Nutrición"
              onClick={() => onNutrition(student.user_id)}
              icon={<Apple className="h-4 w-4" />}
              colorClass="text-orange-500"
              hoverBgClass="hover:bg-orange-500/10"
            />
            <ActionIcon
              tooltip="Progreso"
              onClick={() => onProgress(student.user_id)}
              icon={<TrendingUp className="h-4 w-4" />}
              colorClass="text-emerald-500"
              hoverBgClass="hover:bg-emerald-500/10"
            />
            <ActionIcon
              tooltip="Agregar a Grupo"
              onClick={() => onAddToGroup(student.user_id)}
              icon={<UserPlus className="h-4 w-4" />}
              colorClass="text-muted-foreground"
              hoverBgClass="hover:bg-primary/10 hover:text-primary"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
