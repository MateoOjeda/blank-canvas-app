import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Send } from "lucide-react";
import { fetchSurveyWithQuestions, submitSurveyAnswers, type CustomSurvey } from "@/services/surveys";
import { toast } from "sonner";

interface TakeSurveyDialogProps {
  assignmentId: string;
  surveyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function TakeSurveyDialog({ assignmentId, surveyId, open, onOpenChange, onCompleted }: TakeSurveyDialogProps) {
  const [survey, setSurvey] = useState<CustomSurvey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && surveyId) {
      setLoading(true);
      fetchSurveyWithQuestions(surveyId)
        .then(s => setSurvey(s))
        .catch(() => toast.error("Error al cargar la encuesta"))
        .finally(() => setLoading(false));
    }
  }, [open, surveyId]);

  const handleSubmit = async () => {
    if (!survey?.questions) return;
    
    // Validate all answered
    const unanswered = survey.questions.filter(q => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      return toast.error("Por favor, responde todas las preguntas");
    }

    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, text]) => ({
        question_id: qId,
        answer_text: text
      }));
      await submitSurveyAnswers(assignmentId, formattedAnswers);
      toast.success("Respuestas enviadas correctamente");
      onCompleted();
      onOpenChange(false);
    } catch {
      toast.error("Error al enviar las respuestas");
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loading ? "Cargando..." : survey?.title}</DialogTitle>
          {survey?.description && <p className="text-sm text-muted-foreground mt-2">{survey.description}</p>}
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : survey?.questions ? (
          <div className="space-y-6 py-4">
            {survey.questions.map((q, i) => (
              <div key={q.id} className="space-y-3 bg-secondary/20 p-4 rounded-xl border border-border">
                <Label className="text-base break-words">
                  <span className="text-primary font-bold mr-2">{i + 1}.</span> 
                  {q.question_text}
                </Label>
                
                {q.question_type === "text" ? (
                  <Textarea 
                    placeholder="Escribe tu respuesta aquí..."
                    className="resize-none min-h-[100px] mt-3"
                    value={answers[q.id] || ""}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                  />
                ) : (
                  <RadioGroup 
                    value={answers[q.id] || ""} 
                    onValueChange={v => setAnswers({ ...answers, [q.id]: v })}
                    className="flex flex-col space-y-3 mt-4"
                  >
                    {q.options?.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center space-x-3 bg-background p-3 rounded-lg border border-border/50 transition-colors hover:border-primary/50">
                        <RadioGroupItem value={opt} id={`q-${q.id}-opt-${oIdx}`} />
                        <Label htmlFor={`q-${q.id}-opt-${oIdx}`} className="font-normal cursor-pointer flex-1 text-sm">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No se pudieron cargar las preguntas</p>
        )}
        
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || submitting || !survey} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Respuestas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
