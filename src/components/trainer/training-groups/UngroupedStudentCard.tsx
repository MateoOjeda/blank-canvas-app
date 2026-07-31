import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dumbbell, Apple, TrendingUp, Users } from "lucide-react";
import type { LinkedStudentProfile } from "@/hooks/useLinkedStudents";

interface UngroupedStudentCardProps {
  student: LinkedStudentProfile;
  onViewRoutine: (studentId: string) => void;
  onEditRoutine: (studentId: string) => void;
  onViewNutrition: (studentId: string) => void;
  onEditNutrition: (studentId: string) => void;
  onViewProgress: (studentId: string) => void;
  onAddToGroup: (studentId: string) => void;
}

export const UngroupedStudentCard: React.FC<UngroupedStudentCardProps> = ({
  student,
  onViewRoutine,
  onEditRoutine,
  onViewNutrition,
  onEditNutrition,
  onViewProgress,
  onAddToGroup,
}) => {
  const initials = (student.display_name || "??").substring(0, 2).toUpperCase();

  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm hover:shadow-md hover:border-border/60 transition-all duration-200">
      <CardContent className="p-4 space-y-4">
        {/* Student Header */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-border/30">
            <AvatarImage src={student.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-foreground truncate">
              {student.display_name}
            </p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              Rutina Individual
            </p>
          </div>
        </div>

        {/* Action Sections */}
        <div className="space-y-2.5">
          {/* Exercise Routine */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/15 border border-border/30">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Rutina
              </span>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[9px] font-bold px-2 rounded-md hover:bg-primary/10 hover:text-primary"
                onClick={() => onViewRoutine(student.user_id)}
              >
                Ver
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[9px] font-bold px-2 rounded-md hover:bg-primary/10 hover:text-primary"
                onClick={() => onEditRoutine(student.user_id)}
              >
                Editar
              </Button>
            </div>
          </div>

          {/* Nutrition */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/15 border border-border/30">
            <div className="flex items-center gap-2">
              <Apple className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Nutrición
              </span>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[9px] font-bold px-2 rounded-md hover:bg-orange-500/10 hover:text-orange-500"
                onClick={() => onViewNutrition(student.user_id)}
              >
                Ver
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[9px] font-bold px-2 rounded-md hover:bg-orange-500/10 hover:text-orange-500"
                onClick={() => onEditNutrition(student.user_id)}
              >
                Editar
              </Button>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/15 border border-border/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Progreso
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[9px] font-bold px-2 rounded-md hover:bg-emerald-500/10 hover:text-emerald-500"
              onClick={() => onViewProgress(student.user_id)}
            >
              Ver
            </Button>
          </div>

          {/* Add to Group */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddToGroup(student.user_id)}
            className="w-full gap-1.5 h-8 text-[10px] font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/10 mt-1"
          >
            <Users className="h-3 w-3" />
            Agregar a Grupo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
