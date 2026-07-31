import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Activity, Plus, Trash2, Loader2, CheckCircle, BarChart3,
  Ruler, Droplets, Beef, Flame, Utensils, Smile, ImageIcon
} from "lucide-react";
import WeightProgressChart from "@/components/trainer/WeightProgressChart";
import PhotoSessionsPanel from "@/components/trainer/tracking/PhotoSessionsPanel";
import {
  Assessment, HABIT_KEYS, HABIT_LABELS, HABIT_POSITIVE,
  HabitsMap, addAssessment, deleteAssessment
} from "@/services/tracking";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const MOOD_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Muy malo", color: "text-destructive" },
  2: { label: "Malo", color: "text-orange-500" },
  3: { label: "Regular", color: "text-amber-500" },
  4: { label: "Bueno", color: "text-emerald-500" },
  5: { label: "Excelente", color: "text-primary" },
};

const MOOD_EMOJIS = ["😞", "😕", "😐", "🙂", "😄"];

const DEFAULT_HABITS: HabitsMap = {
  sleep: false, water: false, fruits: false, vegetables: false,
  walking: false, cardio: false, stretching: false, supplements: false,
  alcohol: false, smoking: false,
};

interface Props {
  studentId: string;
  assessments: Assessment[];
  loading: boolean;
  onAdd: (a: Assessment) => void;
  onDelete: (id: string) => void;
}

export default function TrackingAssessmentTab({
  studentId, assessments, loading, onAdd, onDelete
}: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [arm, setArm] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [thigh, setThigh] = useState("");
  const [calf, setCalf] = useState("");
  const [waterLiters, setWaterLiters] = useState("");
  const [proteinG, setProteinG] = useState("");
  const [caloriesKcal, setCaloriesKcal] = useState("");
  const [freeMeals, setFreeMeals] = useState("");
  const [compliance, setCompliance] = useState(100);
  const [habits, setHabits] = useState<HabitsMap>({ ...DEFAULT_HABITS });
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [notes, setNotes] = useState("");

  const toggleHabit = (key: keyof HabitsMap) => {
    setHabits((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data: Omit<Assessment, "id"> = {
        trainer_id: user.uid,
        student_id: studentId,
        recorded_at: new Date().toISOString(),
        weight: weight ? Number(weight) : null,
        body_fat: bodyFat ? Number(bodyFat) : null,
        muscle_mass: muscleMass ? Number(muscleMass) : null,
        arm: arm ? Number(arm) : null,
        chest: chest ? Number(chest) : null,
        waist: waist ? Number(waist) : null,
        hips: hips ? Number(hips) : null,
        thigh: thigh ? Number(thigh) : null,
        calf: calf ? Number(calf) : null,
        water_liters: waterLiters ? Number(waterLiters) : null,
        protein_g: proteinG ? Number(proteinG) : null,
        calories_kcal: caloriesKcal ? Number(caloriesKcal) : null,
        free_meals: freeMeals ? Number(freeMeals) : null,
        diet_compliance_pct: compliance,
        habits,
        mood,
        notes: notes.trim() || undefined,
      };
      const id = await addAssessment(data);
      onAdd({ id, ...data });
      toast.success("Evaluación guardada");
      // Reset form
      setWeight(""); setBodyFat(""); setMuscleMass("");
      setArm(""); setChest(""); setWaist(""); setHips(""); setThigh(""); setCalf("");
      setWaterLiters(""); setProteinG(""); setCaloriesKcal(""); setFreeMeals("");
      setCompliance(100); setHabits({ ...DEFAULT_HABITS }); setMood(3); setNotes("");
    } catch {
      toast.error("Error al guardar la evaluación");
    } finally {
      setSaving(false);
    }
  }, [user, studentId, weight, bodyFat, muscleMass, arm, chest, waist, hips, thigh, calf,
    waterLiters, proteinG, caloriesKcal, freeMeals, compliance, habits, mood, notes, onAdd]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteAssessment(id);
      onDelete(id);
      toast.success("Evaluación eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Weight chart */}
      <WeightProgressChart studentId={studentId} />

      {/* New Assessment Form */}
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
        <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Nueva Evaluación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-5">

          {/* Physical */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Ruler className="h-3 w-3 text-primary" /> Métricas Físicas
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Peso (kg)", val: weight, set: setWeight },
                { label: "Grasa corporal (%)", val: bodyFat, set: setBodyFat },
                { label: "Masa muscular (kg)", val: muscleMass, set: setMuscleMass },
                { label: "Brazo (cm)", val: arm, set: setArm },
                { label: "Pecho (cm)", val: chest, set: setChest },
                { label: "Cintura (cm)", val: waist, set: setWaist },
                { label: "Cadera (cm)", val: hips, set: setHips },
                { label: "Muslo (cm)", val: thigh, set: setThigh },
                { label: "Pantorrilla (cm)", val: calf, set: setCalf },
              ].map(({ label, val, set }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    placeholder="—"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="h-9 text-xs border-border/50 bg-secondary/15"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Progress photos */}
          <PhotoSessionsPanel
            studentId={studentId}
            latestAssessment={assessments[0] ?? null}
          />

          {/* Nutrition */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Utensils className="h-3 w-3 text-primary" /> Nutrición
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Agua (L)", val: waterLiters, set: setWaterLiters },
                { label: "Proteína (g)", val: proteinG, set: setProteinG },
                { label: "Calorías (kcal)", val: caloriesKcal, set: setCaloriesKcal },
                { label: "Comidas libres", val: freeMeals, set: setFreeMeals },
              ].map(({ label, val, set }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    placeholder="—"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    className="h-9 text-xs border-border/50 bg-secondary/15"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
                  Cumplimiento dietético
                </Label>
                <span className="text-xs font-bold text-primary">{compliance}%</span>
              </div>
              <Slider
                min={0} max={100} step={5}
                value={[compliance]}
                onValueChange={([v]) => setCompliance(v)}
                className="w-full"
              />
            </div>
          </div>

          {/* Habits */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-primary" /> Hábitos del día
            </p>
            <div className="flex flex-wrap gap-2">
              {HABIT_KEYS.map((key) => {
                const isPositive = HABIT_POSITIVE[key];
                const active = habits[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleHabit(key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                      active
                        ? isPositive
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-destructive/15 border-destructive/40 text-destructive"
                        : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {HABIT_LABELS[key]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Smile className="h-3 w-3 text-primary" /> Estado de Ánimo
            </p>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-base transition-all",
                    mood === m
                      ? "bg-primary/10 border-primary/40 shadow-sm"
                      : "bg-muted/20 border-border/30 hover:bg-muted/40"
                  )}
                >
                  <span>{MOOD_EMOJIS[m - 1]}</span>
                  <span className={cn("text-[8px] font-bold", mood === m ? MOOD_LABELS[m].color : "text-muted-foreground")}>
                    {MOOD_LABELS[m].label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
              Observaciones
            </Label>
            <Textarea
              placeholder="Notas adicionales de la evaluación..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="text-xs border-border/50 bg-secondary/15 resize-none"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-10 rounded-xl font-bold shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            {saving ? "Guardando..." : "Guardar Evaluación"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Historial de Evaluaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : assessments.length === 0 ? (
            <EmptyState type="empty" title="Sin evaluaciones" description="Registra la primera evaluación física del alumno." />
          ) : (
            <div className="space-y-3">
              {assessments.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl bg-secondary/10 border border-border/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted-foreground">
                      {format(parseISO(a.recorded_at), "EEEE d 'de' MMMM yyyy", { locale: es })}
                    </p>
                    <div className="flex items-center gap-2">
                      {a.mood && (
                        <span className="text-sm">{MOOD_EMOJIS[a.mood - 1]}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(a.id)}
                        disabled={deleting === a.id}
                      >
                        {deleting === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  {/* Physical grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { label: "Peso", val: a.weight, unit: "kg" },
                      { label: "Grasa", val: a.body_fat, unit: "%" },
                      { label: "Músculo", val: a.muscle_mass, unit: "kg" },
                      { label: "Cintura", val: a.waist, unit: "cm" },
                      { label: "Cadera", val: a.hips, unit: "cm" },
                    ].filter((f) => f.val != null).map((f) => (
                      <div key={f.label} className="bg-card/60 border border-border/30 rounded-lg p-2 text-center">
                        <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                        <p className="text-xs font-bold">{f.val} {f.unit}</p>
                      </div>
                    ))}
                  </div>

                  {/* Nutrition row */}
                  {(a.water_liters || a.protein_g || a.calories_kcal || a.diet_compliance_pct != null) && (
                    <div className="flex flex-wrap gap-2">
                      {a.diet_compliance_pct != null && (
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1">
                          <Flame className="h-2.5 w-2.5" /> {a.diet_compliance_pct}% cumpl.
                        </Badge>
                      )}
                      {a.water_liters != null && (
                        <Badge variant="outline" className="text-[10px] border-sky-400/40 text-sky-600 dark:text-sky-400 gap-1">
                          <Droplets className="h-2.5 w-2.5" /> {a.water_liters}L agua
                        </Badge>
                      )}
                      {a.protein_g != null && (
                        <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 gap-1">
                          <Beef className="h-2.5 w-2.5" /> {a.protein_g}g prot.
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Habits */}
                  {a.habits && Object.keys(a.habits).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {HABIT_KEYS.filter((k) => a.habits![k] !== undefined).map((k) => {
                        const active = a.habits![k];
                        const positive = HABIT_POSITIVE[k];
                        if (!active && positive) return null; // skip unchecked positive habits
                        return (
                          <span
                            key={k}
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[9px] font-bold",
                              active && positive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : active && !positive
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-muted/30 text-muted-foreground"
                            )}
                          >
                            {HABIT_LABELS[k]}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {a.notes && (
                    <p className="text-[10px] text-muted-foreground italic border-l-2 border-primary/30 pl-2">{a.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
