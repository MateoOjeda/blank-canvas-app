import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Moon, Sun, Dumbbell, Briefcase, Sparkles, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";

const STEPS = [
  { title: "Hábitos de Sueño", icon: Moon, description: "Cuéntanos sobre tu rutina de descanso" },
  { title: "Rutina de Mañana", icon: Sun, description: "¿Cómo empiezas tu día?" },
  { title: "Actividad Física", icon: Dumbbell, description: "Tu relación con el ejercicio" },
  { title: "Responsabilidades y Bienestar", icon: Briefcase, description: "Tu organización diaria" },
];

interface FormData {
  hora_dormir: string;
  hora_despertar: string;
  dificultad_levantarse: string;
  hora_ideal_despertar: string;
  desayuno_habito: string;
  bano_levantarse: string;
  entrena: boolean;
  tipo_entrenamiento: string;
  horario_entrenamiento: string;
  obligaciones_diarias: string;
  horarios_ocupados: string;
  personas_cargo: string;
  organizacion_comidas: string;
  nuevos_habitos: string;
  tiempo_para_si: string;
}

const INITIAL: FormData = {
  hora_dormir: "",
  hora_despertar: "",
  dificultad_levantarse: "",
  hora_ideal_despertar: "",
  desayuno_habito: "",
  bano_levantarse: "",
  entrena: false,
  tipo_entrenamiento: "",
  horario_entrenamiento: "",
  obligaciones_diarias: "",
  horarios_ocupados: "",
  personas_cargo: "",
  organizacion_comidas: "",
  nuevos_habitos: "",
  tiempo_para_si: "",
};

// Validation: which fields are required per step
const STEP_FIELDS: (keyof FormData)[][] = [
  ["hora_dormir", "hora_despertar", "dificultad_levantarse", "hora_ideal_despertar"],
  ["desayuno_habito", "bano_levantarse"],
  ["tipo_entrenamiento", "horario_entrenamiento"],
  ["obligaciones_diarias", "horarios_ocupados", "personas_cargo", "organizacion_comidas", "nuevos_habitos", "tiempo_para_si"],
];

export default function PersonalChangePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("seguimiento_personal")
      .select("*")
      .eq("student_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExistingId(data.id);
          const { id, student_id, created_at, updated_at, ...rest } = data as any;
          setForm({ ...INITIAL, ...rest });
        }
        setLoading(false);
      });
  }, [user]);

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validateStep = (): boolean => {
    const fields = STEP_FIELDS[step];
    for (const f of fields) {
      if (f === "entrena") continue; // boolean, always valid
      if (typeof form[f] === "string" && (form[f] as string).trim() === "") {
        toast({ title: "Campos incompletos", description: "Completa todos los campos antes de continuar.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!validateStep() || !user) return;
    setSaving(true);

    const payload = { ...form, student_id: user.id };

    let error;
    if (existingId) {
      const { student_id, ...updateData } = payload;
      ({ error } = await supabase.from("seguimiento_personal").update(updateData).eq("id", existingId));
    } else {
      ({ error } = await supabase.from("seguimiento_personal").insert(payload));
    }

    if (!error) {
      // Log change for trainer feed
      await supabase.from("trainer_changes").insert({
        student_id: user.id,
        trainer_id: user.id, // will be visible to linked trainer via RLS
        change_type: "personal_survey",
        description: existingId ? "Actualizó su encuesta de Cambio Personal" : "Completó su encuesta de Cambio Personal",
      }).then(() => {}); // best-effort

      toast({ title: "¡Guardado!", description: "Tu información de cambio personal ha sido registrada." });
      setExistingId(existingId || "saved");
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const StepIcon = STEPS[step].icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-primary/10 neon-glow">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-display text-xl font-bold tracking-wide neon-text">CAMBIO PERSONAL</h1>
        <p className="text-sm text-muted-foreground">Cuéntanos sobre ti para personalizar tu plan</p>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Paso {step + 1} de {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 justify-center">
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => { if (i < step) setStep(i); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              i === step
                ? "bg-primary text-primary-foreground neon-glow"
                : i < step
                ? "bg-primary/20 text-primary cursor-pointer"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            <s.icon className="h-3 w-3" />
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        ))}
      </div>

      {/* Card */}
      <Card className="card-glass neon-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{STEPS[step].title}</CardTitle>
              <p className="text-xs text-muted-foreground">{STEPS[step].description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <Field label="¿A qué hora te duermes normalmente?">
                <Input type="time" value={form.hora_dormir} onChange={(e) => set("hora_dormir", e.target.value)} />
              </Field>
              <Field label="¿A qué hora te despiertas?">
                <Input type="time" value={form.hora_despertar} onChange={(e) => set("hora_despertar", e.target.value)} />
              </Field>
              <Field label="¿Te cuesta levantarte? Describe tu dificultad">
                <Textarea value={form.dificultad_levantarse} onChange={(e) => set("dificultad_levantarse", e.target.value)} placeholder="Ej: Mucho, pongo 5 alarmas..." className="resize-none" rows={2} />
              </Field>
              <Field label="¿Cuál sería tu horario ideal para despertar?">
                <Input type="time" value={form.hora_ideal_despertar} onChange={(e) => set("hora_ideal_despertar", e.target.value)} />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="¿Desayunas al levantarte? ¿Qué sueles comer?">
                <Textarea value={form.desayuno_habito} onChange={(e) => set("desayuno_habito", e.target.value)} placeholder="Ej: Sí, como cereal con leche..." className="resize-none" rows={3} />
              </Field>
              <Field label="¿Te bañas al levantarte o en otro momento?">
                <Textarea value={form.bano_levantarse} onChange={(e) => set("bano_levantarse", e.target.value)} placeholder="Ej: Me baño en la noche..." className="resize-none" rows={2} />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                <Label className="text-sm">¿Entrenas actualmente?</Label>
                <Switch checked={form.entrena} onCheckedChange={(v) => set("entrena", v)} />
              </div>
              <Field label="¿Qué tipo de entrenamiento haces o te gustaría hacer?">
                <Textarea value={form.tipo_entrenamiento} onChange={(e) => set("tipo_entrenamiento", e.target.value)} placeholder="Ej: Pesas, cardio, crossfit..." className="resize-none" rows={2} />
              </Field>
              <Field label="¿En qué horarios entrenas o podrías entrenar?">
                <Textarea value={form.horario_entrenamiento} onChange={(e) => set("horario_entrenamiento", e.target.value)} placeholder="Ej: Después del trabajo, 6pm..." className="resize-none" rows={2} />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <Field label="¿Cuáles son tus obligaciones diarias?">
                <Textarea value={form.obligaciones_diarias} onChange={(e) => set("obligaciones_diarias", e.target.value)} placeholder="Ej: Trabajo de 8am a 5pm, universidad..." className="resize-none" rows={2} />
              </Field>
              <Field label="¿Qué horarios ocupan estas obligaciones?">
                <Textarea value={form.horarios_ocupados} onChange={(e) => set("horarios_ocupados", e.target.value)} placeholder="Ej: Lunes a viernes 8am-5pm..." className="resize-none" rows={2} />
              </Field>
              <Field label="¿Tienes personas o mascotas a tu cargo?">
                <Textarea value={form.personas_cargo} onChange={(e) => set("personas_cargo", e.target.value)} placeholder="Ej: Un hijo pequeño, un perro..." className="resize-none" rows={2} />
              </Field>
              <Field label="¿Qué tan organizado estás con tus comidas?">
                <Textarea value={form.organizacion_comidas} onChange={(e) => set("organizacion_comidas", e.target.value)} placeholder="Ej: No muy organizado, como lo que haya..." className="resize-none" rows={2} />
              </Field>
              <Field label="¿Qué nuevos hábitos te gustaría incorporar?">
                <Textarea value={form.nuevos_habitos} onChange={(e) => set("nuevos_habitos", e.target.value)} placeholder="Ej: Meditar, leer, dormir temprano..." className="resize-none" rows={2} />
              </Field>
              <Field label="¿Cuánto tiempo dedicas a ti mismo/a?">
                <Textarea value={form.tiempo_para_si} onChange={(e) => set("tiempo_para_si", e.target.value)} placeholder="Ej: Casi nada, solo los fines de semana..." className="resize-none" rows={2} />
              </Field>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={prev} className="flex-1 gap-2">
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={next} className="flex-1 gap-2">
            Siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={submit} disabled={saving} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Guardando..." : existingId ? "Actualizar" : "Enviar"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground">{label}</Label>
      {children}
    </div>
  );
}
