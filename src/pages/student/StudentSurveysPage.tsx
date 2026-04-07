import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, CheckCircle2 } from "lucide-react";
import { fetchStudentPendingSurveys } from "@/services/surveys";
import { TakeSurveyDialog } from "@/components/student/TakeSurveyDialog";

export default function StudentSurveysPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<any[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<any | null>(null);

  const fetchSurveys = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchStudentPendingSurveys(user.uid);
      setSurveys(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 pb-32 animate-in fade-in duration-750">
      {/* HEADER SECTION */}
      <div className="mb-10 text-center sm:text-left relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-3 relative z-10">
          <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter uppercase italic leading-none">
            Mis <span className="text-primary italic-none tracking-normal">Encuestas</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full w-fit mx-auto sm:mx-0">
            <ClipboardList className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Consultas</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto sm:mx-0 font-medium leading-relaxed">
          Responde las consultas de tu entrenador para ajustar tu plan y maximizar tus resultados.
        </p>
      </div>

      {surveys.length === 0 ? (
        <Card className="card-premium border-white/5 bg-white/5 py-16">
          <CardContent className="p-0 text-center space-y-4">
            <div className="h-16 w-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">
              No tienes encuestas pendientes por el momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {surveys.map((asst) => (
            <Card 
              key={asst.id} 
              className="card-premium border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-500 rounded-[2.5rem] p-6 cursor-pointer group shadow-xl hover:scale-[1.02]"
              onClick={() => setActiveSurvey(asst)}
            >
              <CardContent className="p-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 bg-primary/10 rounded-[1.5rem] flex items-center justify-center border border-primary/20 group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
                    <ClipboardList className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg uppercase tracking-tight leading-none mb-2">{asst.survey?.title}</h3>
                    <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-primary/10 border-primary/20 text-primary px-3 py-1 rounded-full">
                      Pendiente
                    </Badge>
                  </div>
                </div>
                <Button className="btn-premium-primary h-10 px-6 rounded-2xl shadow-lg shadow-primary/20 transition-transform active:scale-95">
                  Responder
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeSurvey && (
        <TakeSurveyDialog
          open={!!activeSurvey}
          onOpenChange={(v) => !v && setActiveSurvey(null)}
          surveyId={activeSurvey.survey_id}
          assignmentId={activeSurvey.id}
          onCompleted={() => {
            setActiveSurvey(null);
            fetchSurveys();
          }}
        />
      )}
    </div>
  );
}
