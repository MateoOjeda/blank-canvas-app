import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Award, BarChart3, CheckCircle, Dumbbell, TrendingUp,
  XCircle, Calendar, ChevronDown, ChevronUp, Target
} from "lucide-react";
import ExerciseHistoryTab from "@/components/trainer/ExerciseHistoryTab";
import { Assessment, Goal } from "@/services/tracking";
import { ExerciseLogDay } from "@/hooks/useStudentTracking";
import { differenceInDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";

interface ExerciseLog {
  exercise_id: string;
  exercise_name?: string;
  actual_weight: number | null;
  actual_reps: number | null;
  actual_sets: number | null;
  log_date: string;
  completed: boolean;
}

interface Props {
  studentId: string;
  assessments: Assessment[];
  goals: Goal[];
  exerciseLogs: ExerciseLogDay[];
  loading: boolean;
}

// ─── Personal Records ─────────────────────────────────────────────────────────

interface PR {
  exerciseName: string;
  weight: number;
  date: string;
  exerciseId: string;
}

// ─── Training Frequency heatmap ───────────────────────────────────────────────

function FrequencyHeatmap({ exerciseLogs }: { exerciseLogs: ExerciseLogDay[] }) {
  const weeks = useMemo(() => {
    const byWeek: Record<string, { completed: number; missed: number }> = {};
    exerciseLogs.forEach((l) => {
      const d = parseISO(l.log_date);
      // Get Monday of week
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = format(monday, "dd/MM", { locale: es });
      if (!byWeek[key]) byWeek[key] = { completed: 0, missed: 0 };
      if (l.completed) byWeek[key].completed++;
      else byWeek[key].missed++;
    });
    return Object.entries(byWeek)
      .slice(0, 10)
      .reverse()
      .map(([week, { completed, missed }]) => ({ week, completed, missed }));
  }, [exerciseLogs]);

  if (weeks.length === 0) return null;

  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Frecuencia Semanal
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeks} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={24} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "11px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completadas" radius={[3, 3, 0, 0]} />
            <Bar dataKey="missed" fill="hsl(var(--destructive) / 0.5)" name="Incompletas" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Volume Progression ───────────────────────────────────────────────────────

function VolumeProgression({ exerciseLogs }: { exerciseLogs: ExerciseLogDay[] }) {
  // exercise_logs don't carry sets/reps/weight in ExerciseLogDay — we only have date/completed
  // Volume is surfaced from assessments proxy. Show weekly completed sessions count instead.
  const weeks = useMemo(() => {
    const byWeek: Record<string, number> = {};
    exerciseLogs.filter((l) => l.completed).forEach((l) => {
      const d = parseISO(l.log_date);
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const key = format(monday, "dd MMM", { locale: es });
      byWeek[key] = (byWeek[key] || 0) + 1;
    });
    return Object.entries(byWeek)
      .slice(0, 8)
      .reverse()
      .map(([week, sessions]) => ({ week, sessions }));
  }, [exerciseLogs]);

  if (weeks.length === 0) return null;

  const maxSessions = Math.max(...weeks.map((w) => w.sessions));

  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Sesiones por Semana
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {weeks.map((w) => {
          const pct = maxSessions > 0 ? (w.sessions / maxSessions) * 100 : 0;
          return (
            <div key={w.week} className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground w-14 shrink-0">{w.week}</span>
              <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] font-bold text-foreground w-6 text-right shrink-0">{w.sessions}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ─── Adherence KPIs ───────────────────────────────────────────────────────────

function AdherenceKpis({ exerciseLogs }: { exerciseLogs: ExerciseLogDay[] }) {
  const stats = useMemo(() => {
    const sorted = [...exerciseLogs].sort((a, b) => b.log_date.localeCompare(a.log_date));
    const total = sorted.length;
    const completed = sorted.filter((l) => l.completed).length;
    const daysSince = sorted[0]
      ? differenceInDays(new Date(), parseISO(sorted[0].log_date))
      : null;
    return { total, completed, missed: total - completed, rate: total > 0 ? Math.round((completed / total) * 100) : 0, daysSince };
  }, [exerciseLogs]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Adherencia", value: `${stats.rate}%`, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
        { label: "Completadas", value: stats.completed, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
        { label: "Incompletas", value: stats.missed, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
        { label: "Último entreno", value: stats.daysSince !== null ? `${stats.daysSince}d` : "—", color: "text-muted-foreground", bg: "bg-muted/30 border-border/40" },
      ].map((kpi) => (
        <Card key={kpi.label} className={cn("border rounded-xl shadow-sm bg-card/60", kpi.bg)}>
          <CardContent className="p-4 text-center">
            <p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1 font-semibold uppercase tracking-wide">{kpi.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Goals section ────────────────────────────────────────────────────────────

function GoalsSummary({ goals }: { goals: Goal[] }) {
  const active = goals.filter((g) => g.status === "en_progreso");
  const done = goals.filter((g) => g.status === "logrado");

  if (goals.length === 0) return (
    <EmptyState type="empty" title="Sin objetivos" description="Define metas concretas para este alumno." />
  );

  return (
    <div className="space-y-2">
      {active.map((g) => (
        <div key={g.id} className="p-3 rounded-xl bg-secondary/10 border border-border/30 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{g.goal}</p>
              {g.category && <Badge variant="outline" className="text-[9px] mt-0.5">{g.category}</Badge>}
            </div>
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary shrink-0">En progreso</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-muted/40 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: `${g.progress_pct}%` }} />
            </div>
            <span className="text-[9px] font-bold text-primary">{g.progress_pct}%</span>
          </div>
          <p className="text-[9px] text-muted-foreground">
            {format(parseISO(g.start_date), "d MMM", { locale: es })} → {format(parseISO(g.target_date), "d MMM yyyy", { locale: es })}
          </p>
        </div>
      ))}
      {done.length > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
            {done.length} objetivo{done.length > 1 ? "s" : ""} logrado{done.length > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TrackingTrainingTab({ studentId, assessments, goals, exerciseLogs, loading }: Props) {
  const [showGoals, setShowGoals] = useState(true);

  return (
    <div className="space-y-6">
      {/* Adherence KPIs */}
      <AdherenceKpis exerciseLogs={exerciseLogs} />

      {/* Frequency heatmap */}
      <FrequencyHeatmap exerciseLogs={exerciseLogs} />

      {/* Volume progression */}
      <VolumeProgression exerciseLogs={exerciseLogs} />

      {/* Exercise History */}
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            Historial de Ejercicios
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <ExerciseHistoryTab studentId={studentId} />
        </CardContent>
      </Card>

      {/* Goals */}
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <button
            className="flex items-center justify-between w-full"
            onClick={() => setShowGoals((v) => !v)}
          >
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Objetivos del Alumno
              <Badge variant="outline" className="text-[9px]">
                {goals.filter((g) => g.status === "en_progreso").length} activos
              </Badge>
            </CardTitle>
            {showGoals ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CardHeader>
        {showGoals && (
          <CardContent className="pt-0">
            <GoalsSummary goals={goals} />
          </CardContent>
        )}
      </Card>
    </div>
  );
}
