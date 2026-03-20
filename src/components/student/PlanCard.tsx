import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LEVEL_LABELS } from "@/lib/planConstants";

interface PlanLevel {
  plan_type: string;
  level: string;
  unlocked: boolean;
}

interface PlanCardProps {
  label: string;
  description: string;
  icon: LucideIcon;
  planLevels: PlanLevel[];
  onClick: () => void;
}

export default function PlanCard({ label, description, icon: Icon, planLevels, onClick }: PlanCardProps) {
  const activeLevels = planLevels.filter((l) => l.unlocked);
  const hasActive = activeLevels.length > 0;

  return (
    <Card
      className="card-glass cursor-pointer group hover:neon-border transition-all duration-300"
      onClick={onClick}
    >
      <CardContent className="p-6 flex items-center gap-4">
        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-base tracking-wide">{label}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
          <div className="mt-2 flex gap-1.5 flex-wrap">
            {hasActive ? (
              activeLevels.map((l) => (
                <Badge
                  key={l.level}
                  className="text-[10px] bg-green-500/15 text-green-500 border-green-500/30"
                  variant="outline"
                >
                  {LEVEL_LABELS[l.level]} — Activo
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                No tiene plan asignado
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </CardContent>
    </Card>
  );
}
