import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Dumbbell, UserX } from "lucide-react";
import type { TrainingGroup } from "@/hooks/trainer/useTrainingGroups";

interface UnifiedGroupsKpiCardsProps {
  groups: TrainingGroup[];
  totalGroupedStudents: number;
  totalUngroupedStudents: number;
}

export const UnifiedGroupsKpiCards: React.FC<UnifiedGroupsKpiCardsProps> = ({
  groups,
  totalGroupedStudents,
  totalUngroupedStudents,
}) => {
  const kpis = [
    {
      label: "Grupos",
      value: groups.length,
      icon: Dumbbell,
      color: "text-primary",
      bg: "bg-primary/10",
      border: "border-primary/20",
    },
    {
      label: "En Grupos",
      value: totalGroupedStudents,
      icon: Users,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    {
      label: "Sin Grupo",
      value: totalUngroupedStudents,
      icon: UserX,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map((kpi) => (
        <Card
          key={kpi.label}
          className={`border ${kpi.border} bg-card/60 rounded-xl shadow-sm overflow-hidden`}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}
            >
              <kpi.icon className={`h-4.5 w-4.5 ${kpi.color}`} />
            </div>
            <div>
              <p className="text-xl font-black text-foreground leading-none">
                {kpi.value}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                {kpi.label}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
