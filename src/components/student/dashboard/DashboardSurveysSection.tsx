import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, CheckCircle2 } from "lucide-react";

interface PendingSurvey {
  id: string;
  survey_id: string;
  survey?: {
    title: string;
  };
}

interface DashboardSurveysSectionProps {
  pendingSurveys: PendingSurvey[];
  onSelectSurvey: (survey: PendingSurvey) => void;
}

export const DashboardSurveysSection: React.FC<DashboardSurveysSectionProps> = ({
  pendingSurveys,
  onSelectSurvey,
}) => {
  return (
    <div id="encuestas-section" className="space-y-3 pt-2">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          <ClipboardList className="h-4 w-4" />
        </div>
        <h2 className="text-base font-bold tracking-tight text-foreground">Encuestas Pendientes</h2>
      </div>

      {pendingSurveys.length === 0 ? (
        <Card className="border border-border/40 bg-card/40 py-5 text-center shadow-sm rounded-xl">
          <CardContent className="p-0 flex flex-col items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-500/70 mb-1.5" />
            <p className="text-xs text-muted-foreground font-medium">
              No tienes encuestas pendientes por el momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {pendingSurveys.map((asst) => (
            <Card
              key={asst.id}
              className="border border-border/40 bg-card/60 hover:border-primary/30 transition-all duration-200 rounded-xl p-4 cursor-pointer shadow-sm group"
              onClick={() => onSelectSurvey(asst)}
            >
              <CardContent className="p-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 shrink-0 shadow-sm transition-colors group-hover:bg-primary/20">
                    <ClipboardList className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs text-foreground truncate leading-tight mb-1">{asst.survey?.title}</h3>
                    <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-wider bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-500 px-1.5 py-0.5 rounded-md">
                      Pendiente
                    </Badge>
                  </div>
                </div>
                <Button className="h-7 px-3 rounded-lg text-xs font-semibold shrink-0">
                  Responder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
