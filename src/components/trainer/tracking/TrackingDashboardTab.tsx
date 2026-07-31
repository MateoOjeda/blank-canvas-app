import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Activity, AlertCircle, AlertTriangle, Bell, CheckCircle,
  Clock, Dumbbell, Scale, Target, TrendingDown, TrendingUp,
  Trophy, HeartPulse, Flame, Droplets, StickyNote, ChevronRight
} from "lucide-react";
import { Assessment, Injury, Goal, TrackingNote } from "@/services/tracking";
import { RecoveryLog } from "@/services/recovery";
import { ExerciseLogDay } from "@/hooks/useStudentTracking";
import { differenceInDays, parseISO, format, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  assessments: Assessment[];
  injuries: Injury[];
  goals: Goal[];
  notes: TrackingNote[];
  exerciseLogs: ExerciseLogDay[];
  recoveryLogs: RecoveryLog[];
  loading: boolean;
  onTabChange: (tab: string) => void;
}

type AlertSeverity = "error" | "warning" | "success" | "info";

interface SmartAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  icon: typeof AlertCircle;
}

// ─── Health Score Calculation ─────────────────────────────────────────────────

interface HealthScoreBreakdown {
  training: number;
  nutrition: number;
  recovery: number;
  physicalProgress: number;
  adherence: number;
  total: number;
  label: "Excelente" | "Bueno" | "Atención" | "Crítico";
  color: string;
}

function computeHealthScore(
  assessments: Assessment[],
  injuries: Injury[],
  goals: Goal[],
  exerciseLogs: ExerciseLogDay[],
  recoveryLogs: RecoveryLog[]
): HealthScoreBreakdown {
  const now = new Date();

  // ── Training score (30%) ──
  let trainingScore = 50; // default
  const recent30Logs = [...exerciseLogs]
    .sort((a, b) => b.log_date.localeCompare(a.log_date))
    .slice(0, 30);
  if (recent30Logs.length > 0) {
    const adherence = recent30Logs.filter((l) => l.completed).length / recent30Logs.length;
    const lastLog = recent30Logs[0];
    const daysSince = lastLog ? differenceInDays(now, parseISO(lastLog.log_date)) : 30;
    const recencyPenalty = Math.min(daysSince * 3, 30);
    trainingScore = Math.max(0, Math.round(adherence * 100 - recencyPenalty));
  } else if (exerciseLogs.length === 0) {
    trainingScore = 20;
  }

  // ── Nutrition score (25%) ──
  let nutritionScore = 50;
  const recentAssessments = assessments.slice(0, 4);
  if (recentAssessments.length > 0) {
    const avgCompliance = recentAssessments.reduce(
      (s, a) => s + (a.diet_compliance_pct ?? 70), 0
    ) / recentAssessments.length;
    const avgWater = recentAssessments.reduce(
      (s, a) => s + (a.water_liters ?? 1.5), 0
    ) / recentAssessments.length;
    const waterScore = Math.min((avgWater / 2.5) * 100, 100);
    nutritionScore = Math.round((avgCompliance * 0.7 + waterScore * 0.3));
  }

  // ── Recovery score (20%) ──
  let recoveryScore = 50;
  if (recoveryLogs.length > 0) {
    const recent = recoveryLogs.slice(0, 7);
    const avg = (key: keyof RecoveryLog) =>
      recent.reduce((s, r) => s + ((r[key] as number) ?? 3), 0) / recent.length;
    const sleepQ = avg("sleep_quality") / 5;
    const energy = avg("energy") / 5;
    const fatigue = (5 - avg("fatigue")) / 5; // inverted
    const stress = (5 - avg("stress")) / 5;   // inverted
    const painPenalty = avg("pain_level") > 0
      ? (10 - avg("pain_level")) / 10
      : 1;
    recoveryScore = Math.round(
      (sleepQ * 0.25 + energy * 0.25 + fatigue * 0.2 + stress * 0.2 + painPenalty * 0.1) * 100
    );
  }

  // ── Physical Progress score (15%) ──
  let physicalScore = 50;
  if (assessments.length >= 2) {
    const latest = assessments[0];
    const prev = assessments[1];
    const weightChange = latest.weight != null && prev.weight != null
      ? prev.weight - latest.weight
      : 0;
    const goalIsLoss = goals.some(
      (g) => g.status === "en_progreso" && /pérdida|bajar|reducir/i.test(g.goal)
    );
    const weightImproving = goalIsLoss ? weightChange >= 0 : Math.abs(weightChange) < 3;
    physicalScore = weightImproving ? 75 : 40;
  } else if (assessments.length > 0) {
    physicalScore = 60;
  }

  // ── Adherence score (10%) ──
  const latestAssessment = assessments[0];
  let adherenceScore = 50;
  if (latestAssessment?.habits) {
    const positiveHabits = ["sleep", "water", "fruits", "vegetables", "walking", "cardio", "stretching"];
    const completed = positiveHabits.filter(
      (h) => (latestAssessment.habits as Record<string, boolean>)[h]
    ).length;
    adherenceScore = Math.round((completed / positiveHabits.length) * 100);
  }

  // ── Total (weighted) ──
  const total = Math.round(
    trainingScore * 0.30 +
    nutritionScore * 0.25 +
    recoveryScore * 0.20 +
    physicalScore * 0.15 +
    adherenceScore * 0.10
  );

  const clamped = Math.min(100, Math.max(0, total));

  const label =
    clamped >= 80 ? "Excelente" :
    clamped >= 60 ? "Bueno" :
    clamped >= 40 ? "Atención" : "Crítico";

  const color =
    clamped >= 80 ? "text-emerald-500" :
    clamped >= 60 ? "text-primary" :
    clamped >= 40 ? "text-amber-500" : "text-destructive";

  return {
    training: trainingScore,
    nutrition: nutritionScore,
    recovery: recoveryScore,
    physicalProgress: physicalScore,
    adherence: adherenceScore,
    total: clamped,
    label,
    color,
  };
}

// ─── Smart Alerts ─────────────────────────────────────────────────────────────

function computeSmartAlerts(
  assessments: Assessment[],
  injuries: Injury[],
  goals: Goal[],
  exerciseLogs: ExerciseLogDay[],
  recoveryLogs: RecoveryLog[]
): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const now = new Date();

  const sortedLogs = [...exerciseLogs].sort((a, b) =>
    b.log_date.localeCompare(a.log_date)
  );

  // 1. Days without training
  const lastLog = sortedLogs[0];
  if (lastLog) {
    const daysSince = differenceInDays(now, parseISO(lastLog.log_date));
    if (daysSince >= 7) {
      alerts.push({ id: "no_train_7d", severity: "error", title: `Sin entrenamiento — ${daysSince} días`, description: "Requiere atención inmediata.", icon: AlertCircle });
    } else if (daysSince >= 4) {
      alerts.push({ id: "no_train_4d", severity: "warning", title: `Sin entrenamiento — ${daysSince} días`, description: "Considera hacer un seguimiento activo.", icon: Clock });
    }
  } else {
    alerts.push({ id: "no_train_ever", severity: "info", title: "Sin registros de entrenamiento", description: "El alumno no tiene actividad registrada.", icon: AlertCircle });
  }

  // 2. Low adherence
  if (sortedLogs.length >= 5) {
    const recent = sortedLogs.slice(0, 30);
    const rate = Math.round((recent.filter((l) => l.completed).length / recent.length) * 100);
    if (rate < 50) {
      alerts.push({ id: "low_adherence_critical", severity: "error", title: `Adherencia crítica: ${rate}%`, description: "Menos del 50% de los entrenamientos completados recientemente.", icon: TrendingDown });
    } else if (rate < 70) {
      alerts.push({ id: "low_adherence", severity: "warning", title: `Baja adherencia: ${rate}%`, description: "Menos del 70% de los entrenamientos completados.", icon: TrendingDown });
    }
  }

  // 3. Active injuries with high pain
  injuries.filter((i) => i.status === "activa" && i.pain_level >= 7).forEach((inj) => {
    alerts.push({ id: `inj_${inj.id}`, severity: "error", title: `Lesión crítica: ${inj.location}`, description: `Dolor ${inj.pain_level}/10 — atención inmediata.`, icon: AlertTriangle });
  });
  injuries.filter((i) => i.status === "activa" && i.pain_level >= 4 && i.pain_level < 7).forEach((inj) => {
    alerts.push({ id: `inj_mid_${inj.id}`, severity: "warning", title: `Lesión activa: ${inj.location}`, description: `Dolor ${inj.pain_level}/10 — monitorear.`, icon: AlertTriangle });
  });

  // 4. Weight plateau/rapid loss
  if (assessments.length >= 3) {
    const weights = assessments.slice(0, 4).map((a) => a.weight).filter((w): w is number => w != null);
    if (weights.length >= 3) {
      const avg = weights.reduce((s, w) => s + w, 0) / weights.length;
      const variance = Math.max(...weights) - Math.min(...weights);
      if (variance < 0.5) {
        alerts.push({ id: "weight_plateau", severity: "info", title: "Estancamiento de peso", description: `Variación menor a 0.5kg en últimas ${weights.length} evaluaciones.`, icon: Scale });
      }
      const rapidLoss = weights[weights.length - 1] - weights[0];
      if (rapidLoss < -3) {
        alerts.push({ id: "rapid_loss", severity: "warning", title: `Pérdida rápida: ${Math.abs(rapidLoss).toFixed(1)}kg`, description: "Verificar que sea por objetivo y no pérdida muscular.", icon: TrendingDown });
      }
    }
  }

  // 5. Nutrition below threshold
  const lastAssessment = assessments[0];
  if (lastAssessment?.diet_compliance_pct != null && lastAssessment.diet_compliance_pct < 60) {
    alerts.push({ id: "low_nutrition", severity: "warning", title: `Nutrición baja: ${lastAssessment.diet_compliance_pct}%`, description: "Cumplimiento nutricional por debajo del objetivo.", icon: Flame });
  }

  // 6. No assessment in 30+ days
  if (!lastAssessment) {
    alerts.push({ id: "no_assessment", severity: "info", title: "Sin evaluaciones", description: "Registrar la primera evaluación física del alumno.", icon: Scale });
  } else {
    const daysSince = differenceInDays(now, parseISO(lastAssessment.recorded_at));
    if (daysSince >= 30) {
      alerts.push({ id: "stale_assessment", severity: "warning", title: `Evaluación desactualizada (${daysSince}d)`, description: "Registrar una nueva evaluación física.", icon: Scale });
    }
  }

  // 7. Overdue goals
  const overdueGoals = goals.filter((g) => g.status === "en_progreso" && differenceInDays(now, parseISO(g.target_date)) > 0);
  if (overdueGoals.length > 0) {
    alerts.push({ id: "overdue_goals", severity: "warning", title: `${overdueGoals.length} objetivo(s) vencido(s)`, description: overdueGoals.map((g) => g.goal).slice(0, 2).join(", "), icon: AlertTriangle });
  }

  // 8. Recovery deteriorating
  if (recoveryLogs.length >= 4) {
    const recent = recoveryLogs.slice(0, 3);
    const old = recoveryLogs.slice(3, 6);
    const avgEnergy = (logs: RecoveryLog[]) =>
      logs.reduce((s, r) => s + (r.energy ?? 3), 0) / logs.length;
    if (avgEnergy(recent) < avgEnergy(old) - 0.8) {
      alerts.push({ id: "recovery_down", severity: "warning", title: "Recuperación deteriorando", description: "La energía ha bajado significativamente en los últimos registros.", icon: HeartPulse });
    }
  }

  // 9. New PR (positive)
  // PRs are detected in TrainingTab; here we surface the last PR from logs
  const prLog = sortedLogs.find((l) => l.completed);
  if (prLog && differenceInDays(now, parseISO(prLog.log_date)) <= 7) {
    alerts.push({ id: "recent_pr", severity: "success", title: "Actividad reciente esta semana", description: "El alumno entrenó en los últimos 7 días.", icon: Trophy });
  }

  // 10. Goal achieved recently
  const recentGoals = goals.filter(
    (g) => g.status === "logrado" && differenceInDays(now, parseISO(g.created_at)) <= 30
  );
  if (recentGoals.length > 0) {
    alerts.push({ id: "goal_achieved", severity: "success", title: `Objetivo logrado: ${recentGoals[0].goal}`, description: "¡Felicitaciones! El alumno cumplió un objetivo recientemente.", icon: CheckCircle });
  }

  const order: Record<AlertSeverity, number> = { error: 0, warning: 1, info: 3, success: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

// ─── Coach Insights ───────────────────────────────────────────────────────────

function CoachInsights({ score, alerts }: { score: HealthScoreBreakdown; alerts: SmartAlert[] }) {
  const status =
    score.total >= 80 ? { emoji: "🟢", label: "Excelente", bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-700 dark:text-emerald-400" } :
    score.total >= 60 ? { emoji: "🟡", label: "Atención", bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-700 dark:text-amber-400" } :
    { emoji: "🔴", label: "Acción Requerida", bg: "bg-destructive/10 border-destructive/30", text: "text-destructive" };

  const errorAlerts = alerts.filter((a) => a.severity === "error");
  const successAlerts = alerts.filter((a) => a.severity === "success");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  return (
    <div className={cn("p-4 rounded-xl border space-y-3", status.bg)}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{status.emoji}</span>
        <div>
          <p className={cn("text-sm font-bold", status.text)}>{status.label}</p>
          <p className="text-[10px] text-muted-foreground">Resumen generado automáticamente</p>
        </div>
      </div>
      <div className="space-y-1">
        {successAlerts.slice(0, 2).map((a) => (
          <p key={a.id} className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3 shrink-0" /> {a.title}
          </p>
        ))}
        {warningAlerts.slice(0, 2).map((a) => (
          <p key={a.id} className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 shrink-0" /> {a.title}
          </p>
        ))}
        {errorAlerts.slice(0, 2).map((a) => (
          <p key={a.id} className="text-[11px] text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3 shrink-0" /> {a.title}
          </p>
        ))}
        {errorAlerts.length === 0 && warningAlerts.length === 0 && successAlerts.length === 0 && (
          <p className="text-[11px] text-muted-foreground">Sin alertas activas. El alumno está en buen estado.</p>
        )}
      </div>
    </div>
  );
}

// ─── Health Score Card ────────────────────────────────────────────────────────

const SCORE_COMPONENTS = [
  { key: "training" as const, label: "Entrenamiento", weight: 30, icon: Dumbbell, color: "bg-primary" },
  { key: "nutrition" as const, label: "Nutrición", weight: 25, icon: Flame, color: "bg-emerald-500" },
  { key: "recovery" as const, label: "Recuperación", weight: 20, icon: HeartPulse, color: "bg-rose-500" },
  { key: "physicalProgress" as const, label: "Progreso Físico", weight: 15, icon: TrendingUp, color: "bg-violet-500" },
  { key: "adherence" as const, label: "Adherencia", weight: 10, icon: CheckCircle, color: "bg-amber-500" },
];

function HealthScoreCard({ score }: { score: HealthScoreBreakdown }) {
  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          Puntaje de Salud
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main score */}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke={score.total >= 80 ? "hsl(var(--primary))" : score.total >= 60 ? "hsl(43 96% 56%)" : "hsl(var(--destructive))"}
                strokeWidth="3"
                strokeDasharray={`${score.total} ${100 - score.total}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center rotate-0">
              <div className="text-center">
                <p className={cn("text-xl font-black leading-none", score.color)}>{score.total}</p>
                <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-wider">/100</p>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className={cn("text-sm font-bold", score.color)}>{score.label}</p>
              <p className="text-[10px] text-muted-foreground">Estado general del alumno</p>
            </div>
            {SCORE_COMPONENTS.map(({ key, label, weight, color }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-[9px] text-muted-foreground w-20 shrink-0">{label}</span>
                <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-700", color)}
                    style={{ width: `${score[key]}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-foreground w-7 text-right">{score[key]}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Weekly Adherence Strip ───────────────────────────────────────────────────

function WeeklyAdherenceStrip({ exerciseLogs }: { exerciseLogs: ExerciseLogDay[] }) {
  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const key = format(d, "yyyy-MM-dd");
      const logsForDay = exerciseLogs.filter((l) => l.log_date === key);
      const hasActivity = logsForDay.length > 0;
      const completed = logsForDay.some((l) => l.completed);
      return { key, label: format(d, "EEE", { locale: es }), hasActivity, completed };
    });
  }, [exerciseLogs]);

  const completedCount = days.filter((d) => d.completed).length;

  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Dumbbell className="h-3 w-3 text-primary" /> Adherencia últimos 7 días
          </p>
          <span className="text-xs font-bold text-primary">{completedCount}/7</span>
        </div>
        <div className="flex gap-1.5">
          {days.map((d) => (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-8 w-full rounded-lg transition-all",
                  d.completed ? "bg-primary/80" :
                  d.hasActivity ? "bg-destructive/40" :
                  "bg-muted/30"
                )}
              />
              <span className="text-[9px] font-semibold text-muted-foreground capitalize">{d.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Severity config ──────────────────────────────────────────────────────────

const SEV_CFG: Record<AlertSeverity, { border: string; bg: string; iconColor: string }> = {
  error:   { border: "border-destructive/30", bg: "bg-destructive/5",     iconColor: "text-destructive" },
  warning: { border: "border-amber-500/30",   bg: "bg-amber-500/5",       iconColor: "text-amber-500" },
  success: { border: "border-emerald-500/30", bg: "bg-emerald-500/5",     iconColor: "text-emerald-500" },
  info:    { border: "border-border/40",      bg: "bg-card/40",           iconColor: "text-primary" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrackingDashboardTab({
  assessments, injuries, goals, notes, exerciseLogs, recoveryLogs, loading, onTabChange
}: Props) {
  const score = useMemo(
    () => computeHealthScore(assessments, injuries, goals, exerciseLogs, recoveryLogs),
    [assessments, injuries, goals, exerciseLogs, recoveryLogs]
  );

  const alerts = useMemo(
    () => computeSmartAlerts(assessments, injuries, goals, exerciseLogs, recoveryLogs),
    [assessments, injuries, goals, exerciseLogs, recoveryLogs]
  );

  const lastAssessment = assessments[0];
  const activeGoals = goals.filter((g) => g.status === "en_progreso").slice(0, 3);
  const lastNote = notes[0];
  const sortedLogs = [...exerciseLogs].sort((a, b) => b.log_date.localeCompare(a.log_date));
  const lastLog = sortedLogs[0];
  const daysSinceWorkout = lastLog ? differenceInDays(new Date(), parseISO(lastLog.log_date)) : null;

  // ── KPI strip values ──
  const kpis = [
    {
      label: "Peso actual",
      value: lastAssessment?.weight ? `${lastAssessment.weight} kg` : "—",
      icon: Scale,
      color: "text-sky-500",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
    {
      label: "Días sin entrenar",
      value: daysSinceWorkout !== null ? `${daysSinceWorkout}d` : "—",
      icon: Clock,
      color: daysSinceWorkout != null && daysSinceWorkout >= 5 ? "text-destructive" : "text-primary",
      bg: daysSinceWorkout != null && daysSinceWorkout >= 5
        ? "bg-destructive/10 border-destructive/20"
        : "bg-primary/10 border-primary/20",
    },
    {
      label: "Objetivos activos",
      value: activeGoals.length,
      icon: Target,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Score de salud",
      value: `${score.total}/100`,
      icon: Activity,
      color: score.color,
      bg: score.total >= 80 ? "bg-emerald-500/10 border-emerald-500/20"
        : score.total >= 60 ? "bg-primary/10 border-primary/20"
        : score.total >= 40 ? "bg-amber-500/10 border-amber-500/20"
        : "bg-destructive/10 border-destructive/20",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Coach Insights — top */}
      <CoachInsights score={score} alerts={alerts} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={cn("border rounded-xl shadow-sm", kpi.bg, "bg-card/60")}>
              <CardContent className="p-3 text-center">
                <Icon className={cn("h-4 w-4 mx-auto mb-1", kpi.color)} />
                <p className={cn("text-xl font-black", kpi.color)}>{kpi.value}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wide">
                  {kpi.label}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Health Score */}
      <HealthScoreCard score={score} />

      {/* Weekly Adherence */}
      <WeeklyAdherenceStrip exerciseLogs={exerciseLogs} />

      {/* Smart Alerts */}
      {alerts.length > 0 && (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Alertas Inteligentes
              <Badge className="ml-auto text-[10px]" variant="outline">
                {alerts.filter((a) => a.severity === "error").length > 0 && (
                  <span className="text-destructive mr-1">
                    {alerts.filter((a) => a.severity === "error").length} crítica(s)
                  </span>
                )}
                {alerts.length} total
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 6).map((alert) => {
              const cfg = SEV_CFG[alert.severity];
              const Icon = alert.icon;
              return (
                <div key={alert.id} className={cn("flex items-start gap-3 p-3 rounded-xl border", cfg.border, cfg.bg)}>
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.iconColor)} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">{alert.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-500" />
                Objetivos Activos
              </CardTitle>
              <button
                onClick={() => onTabChange("training")}
                className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
              >
                Ver todos <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeGoals.map((g) => (
              <div key={g.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/10 border border-border/30">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{g.goal}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-muted/40 rounded-full overflow-hidden">
                      <div className="h-full bg-primary/70 rounded-full" style={{ width: `${g.progress_pct}%` }} />
                    </div>
                    <span className="text-[9px] font-bold text-primary shrink-0">{g.progress_pct}%</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Last Assessment */}
      {lastAssessment && (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                Última Evaluación
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">
                {format(parseISO(lastAssessment.recorded_at), "d MMM yyyy", { locale: es })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lastAssessment.weight != null && (
                <Badge variant="outline" className="text-[10px]">{lastAssessment.weight}kg</Badge>
              )}
              {lastAssessment.body_fat != null && (
                <Badge variant="outline" className="text-[10px]">{lastAssessment.body_fat}% grasa</Badge>
              )}
              {lastAssessment.muscle_mass != null && (
                <Badge variant="outline" className="text-[10px]">{lastAssessment.muscle_mass}kg músculo</Badge>
              )}
              {lastAssessment.diet_compliance_pct != null && (
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                  <Flame className="h-2.5 w-2.5 mr-1" />{lastAssessment.diet_compliance_pct}% dieta
                </Badge>
              )}
              {lastAssessment.water_liters != null && (
                <Badge variant="outline" className="text-[10px] text-sky-500 border-sky-500/30">
                  <Droplets className="h-2.5 w-2.5 mr-1" />{lastAssessment.water_liters}L agua
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest coach note */}
      {lastNote && (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-amber-500" />
                Última Nota del Entrenador
              </CardTitle>
              <button
                onClick={() => onTabChange("notes")}
                className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
              >
                Ver notas <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-foreground leading-relaxed line-clamp-3">{lastNote.content}</p>
            <p className="text-[9px] text-muted-foreground mt-1">
              {format(parseISO(lastNote.created_at), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </CardContent>
        </Card>
      )}

      {assessments.length === 0 && exerciseLogs.length === 0 && (
        <EmptyState
          type="empty"
          title="Sin datos de seguimiento"
          description="Registra evaluaciones y actividad para ver el dashboard completo del alumno."
        />
      )}
    </div>
  );
}
