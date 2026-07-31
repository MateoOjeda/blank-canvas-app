import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Apple, TrendingUp, MoreVertical, ArrowRight, UserMinus } from "lucide-react";
import type { LinkedStudentProfile } from "@/hooks/useLinkedStudents";

interface GroupMemberRowProps {
  student: LinkedStudentProfile | undefined;
  memberId: string;
  studentId: string;
  onViewNutrition: (studentId: string) => void;
  onViewProgress: (studentId: string) => void;
  onMoveStudent: (memberId: string, studentId: string) => void;
  onRemove: (memberId: string) => void;
}

export const GroupMemberRow: React.FC<GroupMemberRowProps> = ({
  student,
  memberId,
  studentId,
  onViewNutrition,
  onViewProgress,
  onMoveStudent,
  onRemove,
}) => {
  const displayName = student?.display_name || studentId;
  const initials = displayName.substring(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-secondary/10 hover:bg-secondary/20 transition-all duration-200 group">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8 border border-border/30">
          <AvatarImage src={student?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-[9px] font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">
          {displayName}
        </span>
      </div>

      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10"
          title="Nutrición"
          onClick={() => onViewNutrition(studentId)}
        >
          <Apple className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10"
          title="Progreso"
          onClick={() => onViewProgress(studentId)}
        >
          <TrendingUp className="h-3.5 w-3.5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => onMoveStudent(memberId, studentId)}
              className="text-xs gap-2 cursor-pointer"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Mover a otro grupo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onRemove(memberId)}
              className="text-xs gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <UserMinus className="h-3.5 w-3.5" />
              Quitar del grupo
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
