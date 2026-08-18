import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  updateDoc, 
  doc, 
  limit
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Moon, Sun, Dumbbell, Briefcase, Sparkles, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  peso_actual: string;
}

const INITIAL: FormData = {
  hora_dormir: "", hora_despertar: "", dificultad_levantarse: "", hora_ideal_despertar: "",
  desayuno_habito: "", bano_levantarse: "", entrena: false, tipo_entrenamiento: "",
  horario_entrenamiento: "", obligaciones_diarias: "", horarios_ocupados: "", personas_cargo: "",
  organizacion_comidas: "", nuevos_habitos: "", tiempo_para_si: "", peso_actual: "",
};

const STEP_FIELDS: (keyof FormData)[][] = [
  ["hora_dormir", "hora_despertar", "dificultad_levantarse", "hora_ideal_despertar"],
  ["desayuno_habito", "bano_levantarse"],
  ["tipo_entrenamiento", "horario_entrenamiento"],
  ["obligaciones_diarias", "horarios_ocupados", "personas_cargo", "organizacion_comidas", "nuevos_habitos", "tiempo_para_si", "peso_actual"],
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
    
    async function loadData() {
      try {
        const q = query(collection(db, "seguimiento_personal"), where("student_id", "==", user.uid), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setExistingId(snap.docs[0].id);
          const { student_id, created_at, updated_at, ...rest } = data as any;
          setForm({ ...INITIAL, ...rest, peso_actual: "" });
        }
      } catch (err) {
        console.error("Error loading personal data:", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [user]);

  const set = (key: keyof FormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validateStep = (): boolean => {
    const fields = STEP_FIELDS[step];
    for (const f of fields) {
      if (f === "entrena") continue;
      if (typeof form[f] === "string" && (form[f] as string).trim() === "") {
        toast({ title: "Campos incompletos", description: "Completa todos los campos antes de continuar.", variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const next = () => { if (!validateStep()) return; setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (!validateStep() || !user) return;
    setSaving(true);

    try {
      const { peso_actual, ...surveyData } = form;
      const payload = { 
        ...surveyData, 
        student_id: user.uid,
        updated_at: new Date().toISOString()
      };

      if (existingId) {
        await updateDoc(doc(db, "seguimiento_personal", existingId), payload);
      } else {
        await setDoc(doc(db, "seguimiento_personal", user.uid), {
          ...payload,
          created_at: new Date().toISOString()
        });
        setExistingId(user.uid);
      }

      // Save weight to weight_history and update profile
      const weightNum = parseFloat(peso_actual);
      if (!isNaN(weightNum) && weightNum > 0) {
        const historyRef = doc(collection(db, "weight_history"));
        await Promise.all([
          setDoc(historyRef, { 
            student_id: user.uid, 
            weight: weightNum,
            recorded_at: new Date().toISOString()
          }),
          updateDoc(doc(db, "profiles", user.uid), { weight: weightNum }),
        ]);
      }

      toast({ title: "¡Guardado!", description: "Tu información de cambio personal ha sido registrada." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const StepIcon = STEPS[step].icon;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Cambio Personal</h1>
        <p className="text-xs text-muted-foreground">Completa tu información para personalizar tu plan</p>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <span>Paso {step + 1} de {STEPS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="flex gap-2 justify-center overflow-x-auto py-1 hide-scrollbar">
        {STEPS.map((s, i) => (
          <button key={i} onClick={() => { if (i < step) setStep(i); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              i === step 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : i < step 
                  ? "bg-primary/5 text-primary hover:bg-primary/10 cursor-pointer" 
                  : "bg-muted text-muted-foreground opacity-60"
            }`}>
            <s.icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{s.title}</span>
          </button>
        ))}
      </div>

      <Card className="border border-border/50 bg-card rounded-2xl shadow-sm">
        <CardHeader className="pb-3 border-b border-border/40 p-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <StepIcon className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground leading-none">{STEPS[step].title}</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-1">{STEPS[step].description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          {step === 0 && (
            <>
              <Field label="¿A qué hora te duermes normalmente?"><Input type="time" value={form.hora_dormir} onChange={(e) => set("hora_dormir", e.target.value)} className="h-10" /></Field>
              <Field label="¿A qué hora te despiertas?"><Input type="time" value={form.hora_despertar} onChange={(e) => set("hora_despertar", e.target.value)} className="h-10" /></Field>
              <Field label="¿Te cuesta levantarte? Describe tu dificultad"><Textarea value={form.dificultad_levantarse} onChange={(e) => set("dificultad_levantarse", e.target.value)} placeholder="Ej: Mucho, pongo 5 alarmas..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
              <Field label="¿Cuál sería tu horario ideal para despertar?"><Input type="time" value={form.hora_ideal_despertar} onChange={(e) => set("hora_ideal_despertar", e.target.value)} className="h-10" /></Field>
            </>
          )}
          {step === 1 && (
            <>
              <Field label="¿Desayunas al levantarte? ¿Qué sueles comer?"><Textarea value={form.desayuno_habito} onChange={(e) => set("desayuno_habito", e.target.value)} placeholder="Ej: Sí, como cereal con leche..." className="resize-none text-xs rounded-xl" rows={3} /></Field>
              <Field label="¿Te bañas al levantarte o en otro momento?"><Textarea value={form.bano_levantarse} onChange={(e) => set("bano_levantarse", e.target.value)} placeholder="Ej: Me baño en la noche..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
            </>
          )}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-muted/30">
                <Label className="text-xs font-semibold text-foreground">¿Entrenas actualmente?</Label>
                <Switch checked={form.entrena} onCheckedChange={(v) => set("entrena", v)} />
              </div>
              <Field label="¿Qué tipo de entrenamiento haces o te gustaría hacer?"><Textarea value={form.tipo_entrenamiento} onChange={(e) => set("tipo_entrenamiento", e.target.value)} placeholder="Ej: Pesas, cardio, crossfit..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
              <Field label="¿En qué horarios entrenas o podrías entrenar?"><Textarea value={form.horario_entrenamiento} onChange={(e) => set("horario_entrenamiento", e.target.value)} placeholder="Ej: Después del trabajo, 6pm..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
            </>
          )}
          {step === 3 && (
            <>
              <Field label="Peso Actual (kg)">
                <Input type="number" value={form.peso_actual} onChange={(e) => set("peso_actual", e.target.value)} placeholder="Ej: 75.5" min="20" max="300" step="0.1" className="h-10" />
              </Field>
              <Field label="¿Cuáles son tus obligaciones diarias?"><Textarea value={form.obligaciones_diarias} onChange={(e) => set("obligaciones_diarias", e.target.value)} placeholder="Ej: Trabajo de 8am a 5pm..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
              <Field label="¿Qué horarios ocupan estas obligaciones?"><Textarea value={form.horarios_ocupados} onChange={(e) => set("horarios_ocupados", e.target.value)} placeholder="Ej: Lunes a viernes 8am-5pm..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
              <Field label="¿Tienes personas o mascotas a tu cargo?"><Textarea value={form.personas_cargo} onChange={(e) => set("personas_cargo", e.target.value)} placeholder="Ej: Un hijo pequeño, un perro..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
              <Field label="¿Qué tan organizado estás con tus comidas?"><Textarea value={form.organizacion_comidas} onChange={(e) => set("organizacion_comidas", e.target.value)} placeholder="Ej: No muy organizado..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
              <Field label="¿Qué nuevos hábitos te gustaría incorporar?"><Textarea value={form.nuevos_habitos} onChange={(e) => set("nuevos_habitos", e.target.value)} placeholder="Ej: Meditar, leer..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
              <Field label="¿Cuánto tiempo dedicas a ti mismo/a?"><Textarea value={form.tiempo_para_si} onChange={(e) => set("tiempo_para_si", e.target.value)} placeholder="Ej: Casi nada..." className="resize-none text-xs rounded-xl" rows={2} /></Field>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {step > 0 && <Button variant="outline" onClick={prev} className="flex-1 gap-1.5 h-10 rounded-xl text-xs font-semibold"><ChevronLeft className="h-4 w-4" /> Anterior</Button>}
        {step < STEPS.length - 1 ? (
          <Button onClick={next} className="flex-1 gap-1.5 h-10 rounded-xl text-xs font-semibold">Siguiente <ChevronRight className="h-4 w-4" /></Button>
        ) : (
          <Button onClick={submit} disabled={saving} className="flex-1 gap-1.5 h-10 rounded-xl text-xs font-semibold">
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
      <Label className="text-xs font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  );
}
