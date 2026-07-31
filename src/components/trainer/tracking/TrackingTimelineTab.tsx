import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertCircle, AlertTriangle, Camera, CheckCircle2,
  ChevronDown, ChevronUp, ClipboardList, Dumbbell,
  HeartPulse, Scale, ShieldCheck, StickyNote, Target,
  Trophy, Utensils, XCircle
} from "lucide-react";
import { Assessment, Goal, Injury, TrackingNote } from "@/services/tracking";
import { ExerciseLogDay } from "@/hooks/useStudentTracking";
import { RecoveryLog } from "@/services/recovery";
import { PhotoSession } from "@/services/photoSessions";
import { differenceInDays, format, formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Event types ──────────────────────────────────────────────────────────────

type EventType =
  | "workout_done"
  | "workout_missed"
  | "pr"
  | "weight_update"
  | "assessment"
  | "photo_session"
  | "nutrition_note"
  | "coach_note"
  | "recovery_log"
  | "goal_created"
  | "goal_done"
  | "goal_abandoned"
  | "injury_new"
  | "injury_recovered";

interface TimelineEvent {
  id: string;
  type: EventType;
  date: string; // ISO
  title: string;
  subtitle?: string;
  details?: string;
  raw?: unknown;
}

const EVENT_CONFIG: Record<EventType, {
  icon: typeof Dumbbell;
  iconColor: string;
  dotColor: string;
  bg: string;
  border: string;
}> = {
  workout_done:     { icon: Dumbbell,     iconColor: "text-primary",                   dotColor: "bg-primary",         bg: "bg-primary/5",          border: "border-primary/20" },
  workout_missed:   { icon: XCircle,      iconColor: "text-destructive/70",             dotColor: "bg-destructive/50",  bg: "bg-destructive/5",      border: "border-destructive/15" },
  pr:               { icon: Trophy,       iconColor: "text-amber-500",                  dotColor: "bg-amber-500",       bg: "bg-amber-500/5",        border: "border-amber-500/20" },
  weight_update:    { icon: Scale,        iconColor: "text-sky-500",                    dotColor: "bg-sky-500",         bg: "bg-sky-500/5",          border: "border-sky-500/20" },
  assessment:       { icon: ClipboardList, iconColor: "text-indigo-500",               dotColor: "bg-indigo-500",      bg: "bg-indigo-500/5",       border: "border-indigo-500/20" },
  photo_session:    { icon: Camera,       iconColor: "text-violet-500",                 dotColor: "bg-violet-500",      bg: "bg-violet-500/5",       border: "border-violet-500/20" },
  nutrition_note:   { icon: Utensils,     iconColor: "text-emerald-500",               dotColor: "bg-emerald-500",     bg: "bg-emerald-500/5",      border: "border-emerald-500/20" },
  coach_note:       { icon: StickyNote,   iconColor: "text-amber-400",                  dotColor: "bg-amber-400",       bg: "bg-amber-400/5",        border: "border-amber-400/20" },
  recovery_log:     { icon: HeartPulse,   iconColor: "text-rose-500",                   dotColor: "bg-rose-500",        bg: "bg-rose-500/5",         border: "border-rose-500/20" },
  goal_created:     { icon: Target,       iconColor: "text-blue-500",                   dotColor: "bg-blue-500",        bg: "bg-blue-500/5",         border: "border-blue-500/20" },
  goal_done:        { icon: CheckCircle2, iconColor: "text-emerald-500",               dotColor: "bg-emerald-500",     bg: "bg-emerald-500/5",      border: "border-emerald-500/20" },
  goal_abandoned:   { icon: XCircle,      iconColor: "text-muted-foreground",            dotColor: "bg-muted",           bg: "bg-muted/10",           border: "border-border/20" },
  injury_new:       { icon: AlertTriangle, iconColor: "text-destructive",              dotColor: "bg-destructive",     bg: "bg-destructive/5",      border: "border-destructive/20" },
  injury_recovered: { icon: ShieldCheck,  iconColor: "text-emerald-500",               dotColor: "bg-emerald-500",     bg: "bg-emerald-500/5",      border: "border-emerald-500/20" },
};

// ─── Event builders (zero extra Firestore reads — all from props) ─────────────

function buildTimeline(
  assessments: Assessment[],
  injuries: Injury[],
  goals: Goal[],
  notes: TrackingNote[],
  exerciseLogs: ExerciseLogDay[],
  recoveryLogs: RecoveryLog[],
  photoSessions: PhotoSession[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Group exercise logs by date
  const logsByDate: Record<string, ExerciseLogDay[]> = {};
  exerciseLogs.forEach((l) => {
    if (!logsByDate[l.log_date]) logsByDate[l.log_date] = [];
    logsByDate[l.log_date].push(l);
  });
  Object.entries(logsByDate).forEach(([date, logs]) => {
    const completed = logs.filter((l) => l.completed).length;
    const total = logs.length;
    const allDone = completed === total;
    events.push({
      id: `workout_${date}`,
      type: completed > 0 ? "workout_done" : "workout_missed",
      date: `${date}T12:00:00`,
      title: completed > 0 ? `Entrenamiento completado` : "Entrenamiento incompleto",
      subtitle: `${completed}/${total} ejercicios completados`,
    });
  });

  // Assessments
  assessments.forEach((a) => {
    events.push({
      id: `assessment_${a.id}`,
      type: "assessment",
      date: a.recorded_at,
      title: "Evaluación física registrada",
      subtitle: [
        a.weight != null && `Peso: ${a.weight}kg`,
        a.body_fat != null && `Grasa: ${a.body_fat}%`,
        a.muscle_mass != null && `Músculo: ${a.muscle_mass}kg`,
      ].filter(Boolean).join(" · ") || undefined,
      details: a.notes,
      raw: a,
    });

    // Weight updates get their own entry if weight present
    if (a.weight != null) {
      events.push({
        id: `weight_${a.id}`,
        type: "weight_update",
        date: a.recorded_at,
        title: `Peso actualizado: ${a.weight} kg`,
        subtitle: a.body_fat != null ? `Grasa corporal: ${a.body_fat}%` : undefined,
      });
    }
  });

  // Injuries
  injuries.forEach((inj) => {
    events.push({
      id: `injury_new_${inj.id}`,
      type: "injury_new",
      date: inj.created_at,
      title: `Lesión registrada: ${inj.location}`,
      subtitle: `Dolor ${inj.pain_level}/10${inj.zone ? ` — ${inj.zone}` : ""}`,
      details: inj.observations,
    });
    if (inj.status === "recuperada" && inj.updated_at !== inj.created_at) {
      events.push({
        id: `injury_recovered_${inj.id}`,
        type: "injury_recovered",
        date: inj.updated_at,
        title: `Lesión recuperada: ${inj.location}`,
      });
    }
  });

  // Goals
  goals.forEach((g) => {
    events.push({
      id: `goal_created_${g.id}`,
      type: "goal_created",
      date: g.created_at,
      title: `Objetivo creado: ${g.goal}`,
      subtitle: `Meta: ${format(parseISO(g.target_date), "d MMM yyyy", { locale: es })}`,
    });
    if (g.status === "logrado") {
      events.push({
        id: `goal_done_${g.id}`,
        type: "goal_done",
        date: g.target_date + "T12:00:00",
        title: `¡Objetivo logrado! ${g.goal}`,
      });
    }
    if (g.status === "abandonado") {
      events.push({
        id: `goal_abandoned_${g.id}`,
        type: "goal_abandoned",
        date: g.target_date + "T12:00:00",
        title: `Objetivo abandonado: ${g.goal}`,
      });
    }
  });

  // Notes
  notes.forEach((n) => {
    const isNutrition = /nutri|dieta|comida|agua|proteína/i.test(n.content);
    events.push({
      id: `note_${n.id}`,
      type: isNutrition ? "nutrition_note" : "coach_note",
      date: n.created_at,
      title: isNutrition ? "Nota de nutrición" : "Nota del entrenador",
      details: n.content,
    });
  });

  // Recovery logs
  recoveryLogs.forEach((r) => {
    const parts = [
      r.sleep_hours != null && `${r.sleep_hours}h sueño`,
      r.energy != null && `Energía ${r.energy}/5`,
      r.pain_level != null && r.pain_level > 0 && `Dolor ${r.pain_level}/10`,
    ].filter(Boolean);
    events.push({
      id: `recovery_${r.id}`,
      type: "recovery_log",
      date: r.recorded_at,
      title: "Registro de recuperación",
      subtitle: parts.join(" · ") || undefined,
      details: r.notes,
    });
  });

  // Photo sessions
  photoSessions.forEach((ps) => {
    const photoCount = Object.values(ps.photos).filter((v) => v != null && v !== "").length;
    events.push({
      id: `photo_${ps.id}`,
      type: "photo_session",
      date: ps.session_date,
      title: "Sesión de fotos de progreso",
      subtitle: `${photoCount} foto${photoCount !== 1 ? "s" : ""}${ps.notes ? ` · ${ps.notes}` : ""}`,
    });
  });

  // Sort newest first
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event }: { event: TimelineEvent }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = EVENT_CONFIG[event.type];
  const Icon = cfg.icon;

  return (
    <div className={cn("flex gap-3 group")}>
      {/* Timeline dot + line */}
      <div className="flex flex-col items-center">
        <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm", cfg.bg, "border", cfg.border)}>
          <Icon className={cn("h-3.5 w-3.5", cfg.iconColor)} />
        </div>
        <div className="flex-1 w-px bg-border/30 mt-1" />
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-4 rounded-xl border p-3 mb-1", cfg.bg, cfg.border)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{event.title}</p>
            {event.subtitle && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{event.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(parseISO(event.date), { addSuffix: true, locale: es })}
            </span>
            {event.details && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Date */}
        <p className="text-[9px] text-muted-foreground/60 mt-1">
          {format(parseISO(event.date), "EEEE d 'de' MMMM yyyy", { locale: es })}
        </p>

        {/* Expanded details */}
        {expanded && event.details && (
          <p className="mt-2 text-[10px] text-muted-foreground border-l-2 border-primary/30 pl-2 italic leading-relaxed">
            {event.details}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  assessments: Assessment[];
  injuries: Injury[];
  goals: Goal[];
  notes: TrackingNote[];
  exerciseLogs: ExerciseLogDay[];
  recoveryLogs: RecoveryLog[];
  photoSessions: PhotoSession[];
  loading: boolean;
}

const EVENT_LABELS: Partial<Record<EventType, string>> = {
  workout_done: "Entrenamientos",
  assessment: "Evaluaciones",
  photo_session: "Fotos",
  coach_note: "Notas",
  recovery_log: "Recuperación",
  goal_done: "Objetivos",
  injury_new: "Lesiones",
};

type FilterType = "all" | EventType;

export default function TrackingTimelineTab({
  assessments, injuries, goals, notes, exerciseLogs, recoveryLogs, photoSessions, loading
}: Props) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [showCount, setShowCount] = useState(20);

  const allEvents = useMemo(
    () => buildTimeline(assessments, injuries, goals, notes, exerciseLogs, recoveryLogs, photoSessions),
    [assessments, injuries, goals, notes, exerciseLogs, recoveryLogs, photoSessions]
  );

  const filtered = useMemo(
    () => filter === "all" ? allEvents : allEvents.filter((e) => e.type === filter || (filter === "workout_done" && e.type === "workout_missed")),
    [allEvents, filter]
  );

  const visible = filtered.slice(0, showCount);

  const FILTER_OPTIONS: { label: string; value: FilterType; icon: typeof Dumbbell }[] = [
    { label: "Todo", value: "all", icon: AlertCircle },
    { label: "Entrenos", value: "workout_done", icon: Dumbbell },
    { label: "Evaluaciones", value: "assessment", icon: ClipboardList },
    { label: "Fotos", value: "photo_session", icon: Camera },
    { label: "Notas", value: "coach_note", icon: StickyNote },
    { label: "Recuperación", value: "recovery_log", icon: HeartPulse },
    { label: "Objetivos", value: "goal_done", icon: Trophy },
    { label: "Lesiones", value: "injury_new", icon: AlertTriangle },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />)}
      </div>
    );
  }

  if (allEvents.length === 0) {
    return (
      <EmptyState
        type="empty"
        title="Sin actividad registrada"
        description="La línea de tiempo mostrará aquí todos los eventos del alumno."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_OPTIONS.map(({ label, value, icon: Icon }) => (
          <button
            key={value}
            onClick={() => { setFilter(value); setShowCount(20); }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all",
              filter === value
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
            {value !== "all" && (
              <span className={cn(
                "ml-0.5 px-1 rounded-full text-[8px] font-black",
                filter === value ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"
              )}>
                {value === "workout_done"
                  ? allEvents.filter((e) => e.type === "workout_done" || e.type === "workout_missed").length
                  : allEvents.filter((e) => e.type === value || (value === "goal_done" && (e.type === "goal_created" || e.type === "goal_abandoned"))).length
                }
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Total count */}
      <p className="text-[10px] text-muted-foreground">
        {filtered.length} evento{filtered.length !== 1 ? "s" : ""}
        {filter !== "all" && " filtrados"}
      </p>

      {/* Timeline */}
      <div className="space-y-0">
        {visible.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      {/* Load more */}
      {showCount < filtered.length && (
        <Button
          variant="outline"
          className="w-full h-10 text-xs font-bold rounded-xl"
          onClick={() => setShowCount((c) => c + 20)}
        >
          <ChevronDown className="h-4 w-4 mr-2" />
          Cargar más ({filtered.length - showCount} restantes)
        </Button>
      )}
    </div>
  );
}
