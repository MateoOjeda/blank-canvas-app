import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PlanCardProps {
  label: string;
  description: string;
  icon: LucideIcon;
  unlockedCount: number;
  totalLevels: number;
  onClick: () => void;
}

export default function PlanCard({ label, description, icon: Icon, unlockedCount, totalLevels, onClick }: PlanCardProps) {
  const allUnlocked = unlockedCount === totalLevels;

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
          <div className="mt-2">
            <Badge
              variant="outline"
              className={`text-[10px] ${allUnlocked ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
            >
              {unlockedCount}/{totalLevels} niveles desbloqueados
            </Badge>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </CardContent>
    </Card>
  );
}
