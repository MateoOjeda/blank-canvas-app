import { useState, useCallback, useMemo } from "react";
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
  HeartPulse, Plus, Loader2, Trash2, Moon, Zap,
  Brain, Activity, AlertTriangle
} from "lucide-react";
import { RecoveryLog, RecoveryLogInput } from "@/services/recovery";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface Props {
  studentId: string;
  logs: RecoveryLog[];
  loading: boolean;
  onAdd: (data: RecoveryLogInput) => Promise<RecoveryLog>;
  onRemove: (id: string) => Promise<void>;
}

// ─── Recovery Score ───────────────────────────────────────────────────────────

function computeRecoveryScore(logs: RecoveryLog[]): {
  score: number;
  label: string;
  color: string;
  trend: number | null;
} {
  if (logs.length === 0) return { score: 0, label: "Sin datos", color: "text-muted-foreground", trend: null };

  const calc = (slice: RecoveryLog[]) => {
    if (slice.length === 0) return 0;
    const avg = (key: keyof RecoveryLog, invert = false) => {
      const vals = slice.map((l) => l[key] as number | null | undefined).filter((v): v is number => v != null);
      if (vals.length === 0) return 3;
      const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
      return invert ? 5 - mean : mean;
    };
    const sleepQ = avg("sleep_quality") / 5;
    const energy = avg("energy") / 5;
    const fatigue = avg("fatigue", true) / 5;
    const stress = avg("stress", true) / 5;
    const painVals = slice.map((l) => l.pain_level ?? 0).filter((v) => v > 0);
    const painScore = painVals.length > 0
      ? (10 - painVals.reduce((s, v) => s + v, 0) / painVals.length) / 10
      : 1;
    return Math.min(100, Math.max(0, Math.round(
      (sleepQ * 0.25 + energy * 0.25 + fatigue * 0.2 + stress * 0.2 + painScore * 0.1) * 100
    )));
  };

  const recent = calc(logs.slice(0, 5));
  const previous = logs.length >= 6 ? calc(logs.slice(5, 10)) : null;
  const trend = previous !== null ? recent - previous : null;

  const label = recent >= 80 ? "Excelente" : recent >= 65 ? "Buena" : recent >= 45 ? "Atención" : "Crítica";
  const color = recent >= 80 ? "text-emerald-500" : recent >= 65 ? "text-primary" : recent >= 45 ? "text-amber-500" : "text-destructive";

  return { score: recent, label, color, trend };
}

// ─── Score Card ───────────────────────────────────────────────────────────────

function RecoveryScoreCard({ logs }: { logs: RecoveryLog[] }) {
  const { score, label, color, trend } = computeRecoveryScore(logs);
  if (logs.length === 0) return null;

  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={score >= 80 ? "hsl(var(--primary))" : score >= 50 ? "hsl(43 96% 56%)" : "hsl(var(--destructive))"}
              strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className={cn("text-lg font-black leading-none", color)}>{score}</p>
              <p className="text-[7px] text-muted-foreground font-bold">/100</p>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className={cn("text-base font-bold", color)}>{label}</p>
            {trend !== null && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px]",
                  trend > 0 ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" :
                  trend < 0 ? "border-destructive/30 text-destructive" : "border-border/40 text-muted-foreground"
                )}
              >
                {trend > 0 ? "+" : ""}{trend} vs anterior
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">Puntaje de Recuperación</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { icon: Moon, label: "Sueño" },
              { icon: Zap, label: "Energía" },
              { icon: Brain, label: "Estrés" },
              { icon: Activity, label: "Fatiga" },
              { icon: AlertTriangle, label: "Dolor" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Icon className="h-2.5 w-2.5" /> {label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Trend chart ──────────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = { 1: "Muy bajo", 2: "Bajo", 3: "Medio", 4: "Bueno", 5: "Excelente" };

function RecoveryTrendChart({ logs }: { logs: RecoveryLog[] }) {
  const data = useMemo(() => {
    return logs.slice(0, 10).reverse().map((l) => ({
      date: format(parseISO(l.recorded_at), "dd/MM", { locale: es }),
      "Sueño": l.sleep_quality ?? null,
      "Energía": l.energy ?? null,
      "Fatiga (inv)": l.fatigue != null ? 6 - l.fatigue : null,
      "Estrés (inv)": l.stress != null ? 6 - l.stress : null,
    }));
  }, [logs]);

  if (data.length < 2) return null;

  const COLORS = ["hsl(var(--primary))", "hsl(43 96% 56%)", "hsl(var(--destructive))", "hsl(198 93% 60%)"];
  const KEYS = ["Sueño", "Energía", "Fatiga (inv)", "Estrés (inv)"];

  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Tendencia de Recuperación
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={20} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              formatter={(value: number, name: string) => [`${value}/5`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {KEYS.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[i]}
                fill={COLORS[i].replace(")", " / 0.1)").replace("hsl", "hsl")}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-[9px] text-muted-foreground text-center mt-1">
          Fatiga y Estrés invertidos (5 = mejor)
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Log form ─────────────────────────────────────────────────────────────────

const RATING_METRICS = [
  { key: "sleep_quality" as const, label: "Calidad del sueño", icon: Moon },
  { key: "energy" as const, label: "Energía", icon: Zap },
  { key: "fatigue" as const, label: "Fatiga", icon: Activity, invert: true },
  { key: "stress" as const, label: "Estrés", icon: Brain, invert: true },
];

const EMOJI_SCALE = ["😞", "😕", "😐", "🙂", "😄"];

function RatingSelector({
  label,
  icon: Icon,
  value,
  onChange,
  invert,
}: {
  label: string;
  icon: typeof Moon;
  value: number;
  onChange: (v: number) => void;
  invert?: boolean;
}) {
  const color = invert
    ? value <= 2 ? "text-emerald-500" : value <= 3 ? "text-amber-500" : "text-destructive"
    : value >= 4 ? "text-emerald-500" : value >= 3 ? "text-amber-500" : "text-destructive";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3" /> {label}
        </Label>
        <span className={cn("text-[10px] font-bold", color)}>
          {EMOJI_SCALE[value - 1]} {value}/5
        </span>
      </div>
      <div className="flex gap-1">
        {([1, 2, 3, 4, 5] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "flex-1 h-8 rounded-lg border text-[11px] font-bold transition-all",
              value === v
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40"
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Log history card ─────────────────────────────────────────────────────────

function RecoveryLogCard({ log, onDelete, deleting }: {
  log: RecoveryLog;
  onDelete: () => void;
  deleting: boolean;
}) {
  const metrics = [
    { label: "Sueño", value: log.sleep_quality, icon: Moon },
    { label: "Energía", value: log.energy, icon: Zap },
    { label: "Fatiga", value: log.fatigue, icon: Activity, invert: true },
    { label: "Estrés", value: log.stress, icon: Brain, invert: true },
  ].filter((m) => m.value != null);

  return (
    <div className="p-3.5 rounded-xl bg-secondary/10 border border-border/30 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-muted-foreground">
          {format(parseISO(log.recorded_at), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        <Button
          variant="ghost" size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {log.sleep_hours != null && (
          <Badge variant="outline" className="text-[9px] gap-1">
            <Moon className="h-2.5 w-2.5" /> {log.sleep_hours}h
          </Badge>
        )}
        {metrics.map(({ label, value, icon: Icon, invert }) => {
          const colorClass = invert
            ? (value! <= 2 ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : value! <= 3 ? "border-amber-500/30 text-amber-600" : "border-destructive/30 text-destructive")
            : (value! >= 4 ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : value! >= 3 ? "border-amber-500/30 text-amber-600" : "border-destructive/30 text-destructive");
          return (
            <Badge key={label} variant="outline" className={cn("text-[9px] gap-1", colorClass)}>
              <Icon className="h-2.5 w-2.5" /> {label}: {value}/5
            </Badge>
          );
        })}
        {log.pain_level != null && log.pain_level > 0 && (
          <Badge variant="outline" className="text-[9px] gap-1 border-destructive/30 text-destructive">
            <AlertTriangle className="h-2.5 w-2.5" /> Dolor: {log.pain_level}/10
          </Badge>
        )}
      </div>

      {log.pain_zones && log.pain_zones.length > 0 && (
        <p className="text-[9px] text-muted-foreground">Zonas: {log.pain_zones.join(", ")}</p>
      )}
      {log.notes && (
        <p className="text-[10px] text-muted-foreground italic border-l-2 border-primary/30 pl-2">{log.notes}</p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TrackingRecoveryTab({ studentId, logs, loading, onAdd, onRemove }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [sleepHours, setSleepHours] = useState("");
  const [sleepQuality, setSleepQuality] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [fatigue, setFatigue] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [stress, setStress] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [painLevel, setPainLevel] = useState(0);
  const [painZones, setPainZones] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data: RecoveryLogInput = {
        trainer_id: user.uid,
        student_id: studentId,
        recorded_at: new Date().toISOString(),
        sleep_hours: sleepHours ? Number(sleepHours) : null,
        sleep_quality: sleepQuality,
        energy,
        fatigue,
        stress,
        pain_level: painLevel > 0 ? painLevel : null,
        pain_zones: painZones.trim() ? painZones.split(",").map((z) => z.trim()).filter(Boolean) : undefined,
        notes: notes.trim() || undefined,
      };
      await onAdd(data);
      toast.success("Registro de recuperación guardado");
      setSleepHours(""); setSleepQuality(3); setEnergy(3); setFatigue(3); setStress(3);
      setPainLevel(0); setPainZones(""); setNotes("");
    } catch {
      toast.error("Error al guardar el registro");
    } finally {
      setSaving(false);
    }
  }, [user, studentId, sleepHours, sleepQuality, energy, fatigue, stress, painLevel, painZones, notes, onAdd]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onRemove(id);
      toast.success("Registro eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Recovery Score */}
      <RecoveryScoreCard logs={logs} />

      {/* Trend chart */}
      <RecoveryTrendChart logs={logs} />

      {/* Log form */}
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
        <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            Registrar Recuperación
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Sleep hours */}
          <div className="space-y-1">
            <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
              <Moon className="h-3 w-3" /> Horas de sueño
            </Label>
            <Input
              type="number"
              placeholder="Ej: 7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="h-9 text-xs border-border/50 bg-secondary/15 w-32"
              min="0" max="24" step="0.5"
            />
          </div>

          {/* Rating metrics */}
          {RATING_METRICS.map(({ key, label, icon, invert }) => (
            <RatingSelector
              key={key}
              label={label}
              icon={icon}
              value={key === "sleep_quality" ? sleepQuality : key === "energy" ? energy : key === "fatigue" ? fatigue : stress}
              onChange={(v) => {
                if (key === "sleep_quality") setSleepQuality(v as any);
                else if (key === "energy") setEnergy(v as any);
                else if (key === "fatigue") setFatigue(v as any);
                else setStress(v as any);
              }}
              invert={invert}
            />
          ))}

          {/* Pain level */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Nivel de dolor
              </Label>
              <span className={cn(
                "text-xs font-bold",
                painLevel === 0 ? "text-muted-foreground" :
                painLevel <= 3 ? "text-emerald-500" :
                painLevel <= 6 ? "text-amber-500" : "text-destructive"
              )}>
                {painLevel === 0 ? "Sin dolor" : `${painLevel}/10`}
              </span>
            </div>
            <Slider
              min={0} max={10} step={1}
              value={[painLevel]}
              onValueChange={([v]) => setPainLevel(v)}
            />
            {painLevel > 0 && (
              <Input
                placeholder="Zonas de dolor (Ej: rodilla, espalda baja)"
                value={painZones}
                onChange={(e) => setPainZones(e.target.value)}
                className="h-9 text-xs border-border/50 bg-secondary/15"
              />
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Observaciones</Label>
            <Textarea
              placeholder="Notas adicionales sobre la recuperación..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs border-border/50 bg-secondary/15 resize-none"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-10 rounded-xl font-bold shadow-sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <HeartPulse className="h-4 w-4 mr-2" />}
            {saving ? "Guardando..." : "Guardar Registro"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : logs.length === 0 ? (
        <EmptyState type="empty" title="Sin registros de recuperación" description="Registra el estado de recuperación del alumno para ver tendencias." />
      ) : (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-primary" />
              Historial de Recuperación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.map((log) => (
              <RecoveryLogCard
                key={log.id}
                log={log}
                onDelete={() => handleDelete(log.id)}
                deleting={deletingId === log.id}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
