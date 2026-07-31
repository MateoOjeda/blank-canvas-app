import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Trash2, Loader2, Sparkles, Save, CheckCircle2, Pencil, X, AlignLeft } from "lucide-react";
import { toast } from "sonner";
import { type LinkedStudentProfile } from "@/hooks/useLinkedStudents";
import { cn } from "@/lib/utils";
import { FREE_TEXT_OPTION_SENTINEL } from "@/services/surveys";

// ─── Local draft types (never persisted directly to Firestore) ───────────────
type DraftOption =
  | { type: "fixed"; value: string }   // radio button with predefined text
  | { type: "free_text" };             // open text field for the student

interface DraftQuestion {
  clientId: string;                          // stable React key
  question_text: string;
  question_type: "text" | "multiple_choice";
  options: DraftOption[];                    // mapped to string[] | null on submit
  isCommitted: boolean;                      // false = editor open, true = summary card
}

interface CreateSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  students: LinkedStudentProfile[];
  createSurveyMutation: any;
  assignSurveyMutation: any;
}

export function CreateSurveyDialog({
  open,
  onOpenChange,
  user,
  students,
  createSurveyMutation,
  assignSurveyMutation,
}: CreateSurveyDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [creating, setCreating] = useState(false);
  const [isGlobal, setIsGlobal] = useState(false);

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const hasOpenDraft = questions.some((q) => !q.isCommitted);

  const updateQuestion = (clientId: string, patch: Partial<DraftQuestion>) =>
    setQuestions((prev) =>
      prev.map((q) => (q.clientId === clientId ? { ...q, ...patch } : q))
    );

  // ─── Question-level handlers ────────────────────────────────────────────────

  const handleAddQuestion = () => {
    if (hasOpenDraft) return;
    setQuestions((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        question_text: "",
        question_type: "text",
        options: [{ type: "fixed", value: "" }],
        isCommitted: false,
      },
    ]);
  };

  const handleChangeQuestionField = (
    clientId: string,
    field: "question_text" | "question_type",
    value: string
  ) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.clientId !== clientId) return q;
        if (field === "question_type") {
          return {
            ...q,
            question_type: value as "text" | "multiple_choice",
            // Seed one empty fixed option when switching to multiple_choice
            options:
              value === "multiple_choice" && q.options.length === 0
                ? [{ type: "fixed", value: "" }]
                : q.options,
          };
        }
        return { ...q, [field]: value };
      })
    );
  };

  const handleFinishQuestion = (clientId: string) => {
    const q = questions.find((q) => q.clientId === clientId);
    if (!q) return;

    if (!q.question_text.trim()) {
      return toast.error("El enunciado de la pregunta no puede estar vacío");
    }
    if (q.question_type === "multiple_choice") {
      if (q.options.length === 0) {
        return toast.error("Agrega al menos una opción antes de finalizar");
      }
      const hasBlankFixed = q.options.some(
        (o) => o.type === "fixed" && !o.value.trim()
      );
      if (hasBlankFixed) {
        return toast.error("Completa o elimina las opciones vacías antes de finalizar");
      }
    }

    updateQuestion(clientId, { isCommitted: true });
  };

  const handleEditQuestion = (clientId: string) =>
    updateQuestion(clientId, { isCommitted: false });

  const handleRemoveQuestion = (clientId: string) =>
    setQuestions((prev) => prev.filter((q) => q.clientId !== clientId));

  // ─── Option-level handlers ──────────────────────────────────────────────────

  const handleAddOption = (clientId: string) =>
    setQuestions((prev) =>
      prev.map((q) =>
        q.clientId === clientId
          ? { ...q, options: [...q.options, { type: "fixed", value: "" }] }
          : q
      )
    );

  const handleAddFreeTextOption = (clientId: string) =>
    setQuestions((prev) =>
      prev.map((q) =>
        q.clientId === clientId
          ? { ...q, options: [...q.options, { type: "free_text" }] }
          : q
      )
    );

  const handleUpdateOption = (clientId: string, optionIndex: number, value: string) =>
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.clientId !== clientId) return q;
        const updated = [...q.options];
        const opt = updated[optionIndex];
        if (opt.type === "fixed") updated[optionIndex] = { type: "fixed", value };
        return { ...q, options: updated };
      })
    );

  const handleRemoveOption = (clientId: string, optionIndex: number) =>
    setQuestions((prev) =>
      prev.map((q) =>
        q.clientId === clientId
          ? { ...q, options: q.options.filter((_, i) => i !== optionIndex) }
          : q
      )
    );

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const handleCreateSubmit = async () => {
    if (!title.trim()) return toast.error("El título es obligatorio");
    if (questions.length === 0) return toast.error("Agrega al menos una pregunta");
    if (hasOpenDraft) return toast.error("Finaliza todas las preguntas antes de guardar");

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question_text.trim())
        return toast.error(`La pregunta ${i + 1} está vacía`);
      if (q.question_type === "multiple_choice") {
        if (q.options.length === 0)
          return toast.error(`La pregunta ${i + 1} necesita al menos una opción`);
        if (q.options.some((o) => o.type === "fixed" && !o.value.trim()))
          return toast.error(`La pregunta ${i + 1} tiene opciones de texto vacías`);
      }
    }

    if (!user) return;
    setCreating(true);
    try {
      // Serialize DraftOption[] → string[] | null for Firestore
      const serviceQuestions = questions.map((q) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        options:
          q.question_type === "multiple_choice"
            ? q.options.map((o) =>
                o.type === "fixed" ? o.value : FREE_TEXT_OPTION_SENTINEL
              )
            : null,
      }));

      const newSurvey = await createSurveyMutation({
        title,
        description,
        questions: serviceQuestions,
        isGlobal,
      });

      if (isGlobal) {
        if (students.length > 0) {
          await assignSurveyMutation({
            surveyId: newSurvey.id,
            studentIds: students.map((s) => s.user_id),
          });
          toast.success(`Encuesta global creada y asignada a ${students.length} alumnos`);
        } else {
          toast.success("Encuesta global creada (sin alumnos vinculados aún)");
        }
      } else {
        toast.success("Encuesta creada correctamente");
      }

      onOpenChange(false);
      setTitle("");
      setDescription("");
      setQuestions([]);
      setIsGlobal(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al crear encuesta");
    } finally {
      setCreating(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border border-border/40 bg-card/95 shadow-xl rounded-2xl">
        <DialogHeader className="space-y-1.5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <DialogTitle className="text-base font-bold">Nueva Encuesta de Seguimiento</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Define el título, descripción y preguntas para recopilar feedback de tus alumnos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">
              Título de la Encuesta
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Encuesta de Hábitos Iniciales"
              className="h-11 text-xs border-border/50 bg-secondary/15 hover:bg-secondary/25 focus-visible:ring-primary/20"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">
              Descripción (Opcional)
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instrucciones para tus alumnos (ej: Por favor responde con la mayor sinceridad posible)..."
              className="resize-none text-xs border-border/50 bg-secondary/15 hover:bg-secondary/25 min-h-[80px]"
            />
          </div>

          {/* Global toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-primary/20 bg-primary/5">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                Asignación Global Automática
              </Label>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Se asignará automáticamente a todos tus alumnos actuales y nuevos que vincules en el futuro.
              </p>
            </div>
            <Switch
              checked={isGlobal}
              onCheckedChange={setIsGlobal}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Questions section */}
          <div className="space-y-4 mt-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <Label className="text-sm font-bold text-foreground">Preguntas del Formulario</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddQuestion}
                disabled={hasOpenDraft}
                title={hasOpenDraft ? "Finaliza la pregunta actual antes de agregar otra" : undefined}
                className={cn(
                  "gap-1.5 h-8 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/5",
                  hasOpenDraft && "opacity-50 cursor-not-allowed"
                )}
              >
                <Plus className="h-3.5 w-3.5" /> Añadir Pregunta
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl bg-secondary/10 border-border/60">
                <FileText className="h-7 w-7 mx-auto text-muted-foreground/35 mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">No has agregado ninguna pregunta todavía</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Haz clic en &quot;Añadir Pregunta&quot; para comenzar a configurar tu encuesta.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((q, idx) =>
                  q.isCommitted ? (
                    // ── Committed: summary card ──────────────────────────────
                    <Card
                      key={q.clientId}
                      className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl shadow-sm"
                    >
                      <CardContent className="p-4 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                              Pregunta {idx + 1}
                            </p>
                            <p className="text-xs font-semibold text-foreground leading-snug truncate">
                              {q.question_text}
                            </p>
                            {q.question_type === "multiple_choice" && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {q.options.map((opt, oIdx) =>
                                  opt.type === "fixed" ? (
                                    <Badge
                                      key={oIdx}
                                      variant="outline"
                                      className="text-[9px] font-semibold bg-primary/5 border-primary/20 text-primary px-2 py-0.5 rounded-md"
                                    >
                                      {opt.value}
                                    </Badge>
                                  ) : (
                                    <Badge
                                      key={oIdx}
                                      variant="outline"
                                      className="text-[9px] font-semibold bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md flex items-center gap-1"
                                    >
                                      <AlignLeft className="h-2.5 w-2.5" />
                                      Texto libre
                                    </Badge>
                                  )
                                )}
                              </div>
                            )}
                            {q.question_type === "text" && (
                              <span className="text-[9px] text-muted-foreground mt-1 inline-block">
                                Texto libre
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            onClick={() => handleEditQuestion(q.clientId)}
                            title="Editar pregunta"
                            disabled={hasOpenDraft}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            onClick={() => handleRemoveQuestion(q.clientId)}
                            title="Eliminar pregunta"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    // ── Draft: full editor ───────────────────────────────────
                    <Card
                      key={q.clientId}
                      className="bg-card/40 border border-primary/25 rounded-xl overflow-hidden shadow-sm"
                    >
                      <CardContent className="p-4 space-y-4 relative">
                        {/* Remove question button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          onClick={() => handleRemoveQuestion(q.clientId)}
                          title="Eliminar pregunta"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>

                        {/* Question text + type row */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start pr-8">
                          <div className="space-y-1.5 flex-1 w-full">
                            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">
                              Enunciado de la Pregunta {idx + 1}
                            </Label>
                            <Input
                              value={q.question_text}
                              onChange={(e) =>
                                handleChangeQuestionField(q.clientId, "question_text", e.target.value)
                              }
                              placeholder="Ej: ¿Qué alimentos consumes antes de entrenar?"
                              className="h-10 text-xs bg-secondary/10"
                            />
                          </div>
                          <div className="space-y-1.5 w-full sm:w-[160px]">
                            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">
                              Tipo de Respuesta
                            </Label>
                            <Select
                              value={q.question_type}
                              onValueChange={(v) =>
                                handleChangeQuestionField(q.clientId, "question_type", v)
                              }
                            >
                              <SelectTrigger className="h-10 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Texto Libre</SelectItem>
                                <SelectItem value="multiple_choice">Opción Múltiple</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Per-option editor — only for multiple_choice */}
                        {q.question_type === "multiple_choice" && (() => {
                          const hasFreeText = q.options.some((o) => o.type === "free_text");
                          let fixedCounter = 0;
                          return (
                            <div className="pl-3 border-l-2 border-primary/30 space-y-2 animate-in slide-in-from-left-2">
                              <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">
                                Opciones de Respuesta
                              </Label>

                              <div className="space-y-2">
                                {q.options.map((opt, oIdx) => {
                                  if (opt.type === "fixed") {
                                    fixedCounter++;
                                    const n = fixedCounter;
                                    return (
                                      <div key={oIdx} className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-muted-foreground w-4 text-right shrink-0">
                                          {n}.
                                        </span>
                                        <Input
                                          value={opt.value}
                                          onChange={(e) =>
                                            handleUpdateOption(q.clientId, oIdx, e.target.value)
                                          }
                                          placeholder={`Opción ${n}`}
                                          className="h-9 text-xs bg-secondary/10 flex-1"
                                          autoFocus={oIdx === q.options.length - 1 && q.options.length > 1}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors"
                                          onClick={() => handleRemoveOption(q.clientId, oIdx)}
                                          disabled={q.options.length <= 1}
                                          title={
                                            q.options.length <= 1
                                              ? "Debe haber al menos una opción"
                                              : "Eliminar opción"
                                          }
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    );
                                  } else {
                                    // Free-text slot row
                                    return (
                                      <div
                                        key={oIdx}
                                        className="flex items-center gap-2 pl-6 pr-0"
                                      >
                                        <div className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/25 border-dashed">
                                          <AlignLeft className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 flex-1">
                                            Campo de texto libre
                                          </span>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors"
                                          onClick={() => handleRemoveOption(q.clientId, oIdx)}
                                          disabled={q.options.length <= 1}
                                          title={
                                            q.options.length <= 1
                                              ? "Debe haber al menos una opción"
                                              : "Eliminar campo de texto"
                                          }
                                        >
                                          <X className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    );
                                  }
                                })}
                              </div>

                              {/* Add Option / Add Free Text Box buttons */}
                              <div className="flex flex-wrap gap-2 mt-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddOption(q.clientId)}
                                  className="gap-1.5 h-8 text-[11px] font-semibold rounded-lg border-border/60 text-muted-foreground hover:text-primary hover:border-primary/30 hover:bg-primary/5"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Agregar Opción
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddFreeTextOption(q.clientId)}
                                  disabled={hasFreeText}
                                  title={hasFreeText ? "Ya hay un campo de texto libre en esta pregunta" : undefined}
                                  className={cn(
                                    "gap-1.5 h-8 text-[11px] font-semibold rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/8 hover:border-amber-500/50",
                                    hasFreeText && "opacity-40 cursor-not-allowed"
                                  )}
                                >
                                  <AlignLeft className="h-3.5 w-3.5" />
                                  Agregar Campo de Texto
                                </Button>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Finish Question button */}
                        <div className="flex justify-end pt-1 border-t border-border/30">
                          <Button
                            size="sm"
                            onClick={() => handleFinishQuestion(q.clientId)}
                            className="gap-1.5 h-8 text-[11px] font-bold rounded-lg shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Finalizar Pregunta
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t border-border/40 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            className="h-10 text-xs rounded-xl hover:bg-muted/15 font-semibold text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateSubmit}
            disabled={creating}
            className="h-10 text-xs rounded-xl font-bold shadow-sm"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Guardar Encuesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
