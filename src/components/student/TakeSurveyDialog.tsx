import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStudentSurveys, useSurveyQuestions } from "@/hooks/useStudentSurveys";
import { FREE_TEXT_OPTION_SENTINEL } from "@/services/surveys";
import { toast } from "sonner";

interface TakeSurveyDialogProps {
  assignmentId: string;
  surveyId: string;
  trainerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function TakeSurveyDialog({ assignmentId, surveyId, trainerId, open, onOpenChange, onCompleted }: TakeSurveyDialogProps) {
  const { user } = useAuth();
  
  // Use React Query hooks instead of direct service calls
  const { survey, isLoading } = useSurveyQuestions(open ? surveyId : undefined);
  const { submitAnswers, isSubmittingAnswers: submitting } = useStudentSurveys(user?.uid);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Reset answers only when dialog closes or surveyId changes
  useEffect(() => {
    if (!open) {
      setAnswers({});
    }
  }, [open]);

  useEffect(() => {
    setAnswers({});
  }, [surveyId]);

  const handleSubmit = async () => {
    if (!survey?.questions) return;
    
    // Validate all answered
    const unanswered = survey.questions.filter(q => !answers[q.id]?.trim());
    if (unanswered.length > 0) {
      return toast.error("Por favor, responde todas las preguntas");
    }

    try {
      const formattedAnswers = Object.entries(answers).map(([qId, text]) => ({
        question_id: qId,
        answer_text: text
      }));
      await submitAnswers({ assignmentId, surveyId, trainerId, answers: formattedAnswers });
      toast.success("Respuestas enviadas correctamente");
      onCompleted();
      onOpenChange(false);
    } catch {
      toast.error("Error al enviar las respuestas");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isLoading ? "Cargando..." : survey?.title}</DialogTitle>
          {survey?.description && <p className="text-sm text-muted-foreground mt-2">{survey?.description}</p>}
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : survey?.questions ? (
          <div className="space-y-6 py-4">
            {survey?.questions?.map((q, i) => (
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
                ) : (() => {
                  const hasFreeText = q.options?.includes(FREE_TEXT_OPTION_SENTINEL);
                  const fixedOptions = q.options?.filter(o => o !== FREE_TEXT_OPTION_SENTINEL) ?? [];
                  const currentAnswer = answers[q.id] || "";
                  const radioValue = fixedOptions.includes(currentAnswer) ? currentAnswer : "";
                  const freeTextValue = fixedOptions.includes(currentAnswer) ? "" : currentAnswer;
                  return (
                    <div className="space-y-3 mt-4">
                      {fixedOptions.length > 0 && (
                        <RadioGroup
                          value={radioValue}
                          onValueChange={v => setAnswers({ ...answers, [q.id]: v })}
                          className="flex flex-col space-y-3"
                        >
                          {fixedOptions.map((opt, oIdx) => (
                            <div key={oIdx} className="flex items-center space-x-3 bg-background p-3 rounded-lg border border-border/50 transition-colors hover:border-primary/50">
                              <RadioGroupItem value={opt} id={`q-${q.id}-opt-${oIdx}`} />
                              <Label htmlFor={`q-${q.id}-opt-${oIdx}`} className="font-normal cursor-pointer flex-1 text-sm">
                                {opt}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                      {hasFreeText && (
                        <div className="space-y-1.5">
                          {fixedOptions.length > 0 && (
                            <p className="text-[11px] font-semibold text-muted-foreground">O escribe tu respuesta:</p>
                          )}
                          <Textarea
                            placeholder="Escribe tu respuesta aquí..."
                            className="resize-none min-h-[80px]"
                            value={freeTextValue}
                            onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-muted-foreground">No se pudieron cargar las preguntas</p>
        )}
        
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isLoading || submitting || !survey} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Respuestas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
