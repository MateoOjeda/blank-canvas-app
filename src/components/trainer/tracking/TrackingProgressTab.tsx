import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  AlertTriangle, ArrowLeftRight, Camera, ChevronRight,
  ClipboardList, Loader2, RefreshCw, Scale, StickyNote,
  Target, TrendingDown, TrendingUp, User as UserIcon,
} from "lucide-react";
import WeightProgressChart from "@/components/trainer/WeightProgressChart";
import PhotoSessionsPanel from "@/components/trainer/tracking/PhotoSessionsPanel";
import PhotoCompareModal from "@/components/trainer/tracking/PhotoCompareModal";
import { usePhotoSessions } from "@/hooks/usePhotoSessions";
import type { Assessment, Injury, Goal, StudentNote } from "@/services/tracking";
import { safeFormat } from "@/lib/dateUtils";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  studentId: string;
  assessments: Assessment[];
  injuries: Injury[];
  goals: Goal[];
  studentNotes: StudentNote[];
  loading: boolean;
  onNavigateToAssessment?: () => void;
}

type InjuryStatus = "activa" | "recuperada";
type GoalStatus = "en_progreso" | "logrado" | "abandonado";

const STATUS_INJURY: Record<InjuryStatus, { label: string; className: string }> = {
  activa: { label: "Activa", className: "bg-destructive/10 text-destructive border-destructive/30" },
  recuperada: { label: "Recuperada", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
};
const STATUS_INJURY_FALLBACK = { label: "Desconocido", className: "bg-muted/40 text-muted-foreground border-border/40" };

const STATUS_GOAL: Record<GoalStatus, { label: string; className: string }> = {
  en_progreso: { label: "En progreso", className: "bg-primary/10 text-primary border-primary/30" },
  logrado: { label: "Logrado ✓", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  abandonado: { label: "Abandonado", className: "bg-muted/40 text-muted-foreground border-border/40" },
};
const STATUS_GOAL_FALLBACK = { label: "Desconocido", className: "bg-muted/40 text-muted-foreground border-border/40" };

// ─── Metric helpers ───────────────────────────────────────────────────────────

function MetricCard({ label, current, initial, unit, icon: Icon, accentColor }: {
  label: string;
  current: number | null | undefined;
  initial: number | null | undefined;
  unit: string;
  icon: typeof Scale;
  accentColor: string;
}) {
  const hasHistory = current != null && initial != null && initial !== current;
  const change = hasHistory ? current! - initial! : null;

  return (
    <Card className={cn("border rounded-xl shadow-sm bg-card/60", `border-${accentColor}/20`)}>
      <CardContent className="p-3.5 text-center space-y-1">
        <Icon className={cn("h-4 w-4 mx-auto mb-1", `text-${accentColor}`)} />
        <p className="text-xl font-black text-foreground leading-none">
          {current != null ? `${current}${unit}` : "—"}
        </p>
        <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
        
        {initial != null && (
          <p className="text-[9px] text-muted-foreground/80 font-medium">
            Inicio: {initial}{unit}
          </p>
        )}

        {change != null ? (
          <Badge
            variant="outline"
            className={cn(
              "text-[9px] font-bold mx-auto mt-1",
              change < 0 ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5" :
              change > 0 ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/5" :
              "border-border/40 text-muted-foreground"
            )}
          >
            {change > 0 ? "+" : ""}{change.toFixed(1)}{unit}
          </Badge>
        ) : (
          <span className="text-[8px] text-muted-foreground/60 italic block">Sin registro previo</span>
        )}
      </CardContent>
    </Card>
  );
}

function painColor(level: number) {
  if (level <= 3) return "text-emerald-600 dark:text-emerald-400";
  if (level <= 6) return "text-amber-500";
  return "text-destructive";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrackingProgressTab({
  studentId, assessments, injuries, goals, studentNotes, loading,
  onNavigateToAssessment,
}: Props) {
  const { sessions: photoSessions, loading: loadingPhotos, error: photoError } = usePhotoSessions(studentId);
  const [compareIds, setCompareIds] = useState<{ a: string | null; b: string | null } | null>(null);

  // Derive metrics from assessments
  const latestAssessment = assessments[0] ?? null;
  const initialAssessment = assessments.length > 1 ? assessments[assessments.length - 1] : null;

  // Photo sessions
  const sortedPhotos = useMemo(
    () =>
      [...photoSessions].sort((a, b) => {
        const sa = typeof a.session_date === "string" ? a.session_date : "";
        const sb = typeof b.session_date === "string" ? b.session_date : "";
        return sa.localeCompare(sb);
      }),
    [photoSessions]
  );
  const initialPhoto = sortedPhotos[0] ?? null;
  const latestPhoto = sortedPhotos.length > 1 ? sortedPhotos[sortedPhotos.length - 1] : null;

  // Goals
  const activeGoals = goals.filter((g) => g.status === "en_progreso");
  const completedGoals = goals.filter((g) => g.status !== "en_progreso");

  // Injuries
  const activeInjuries = injuries.filter((i) => i.status === "activa");
  const recoveredInjuries = injuries.filter((i) => i.status === "recuperada");

  if (loading) return <LoadingSkeleton type="list" count={5} />;

  return (
    <div className="space-y-6">
      {/* ── Section: Body Metrics ─────────────────────────────────── */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <Scale className="h-3 w-3 text-primary" />
          Composición Corporal
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Peso"
            current={latestAssessment?.weight}
            initial={initialAssessment?.weight}
            unit=" kg"
            icon={Scale}
            accentColor="sky-500"
          />
          <MetricCard
            label="% Grasa"
            current={latestAssessment?.body_fat}
            initial={initialAssessment?.body_fat}
            unit="%"
            icon={TrendingDown}
            accentColor="amber-500"
          />
          <MetricCard
            label="Masa Muscular"
            current={latestAssessment?.muscle_mass}
            initial={initialAssessment?.muscle_mass}
            unit=" kg"
            icon={TrendingUp}
            accentColor="emerald-500"
          />
        </div>
      </div>

      {/* ── Section: Physical Evolution Chart ─────────────────────── */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <TrendingUp className="h-3 w-3 text-primary" />
          Evolución Física
        </h3>
        <WeightProgressChart studentId={studentId} />
      </div>

      {/* ── Section: Photos ──────────────────────────────────────── */}
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              Fotos de Progreso
            </CardTitle>
            <Badge variant="outline" className="text-[9px] bg-muted/20 text-muted-foreground border-border/40 font-medium">
              Gestionadas por el alumno
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPhotos ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : photoError ? (
            <div className="flex items-center gap-2 py-4 px-3 rounded-xl bg-destructive/5 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive font-semibold">{photoError}</p>
            </div>
          ) : photoSessions.length === 0 ? (
            <EmptyState
              type="empty"
              title="Sin sesiones de fotos registradas"
              description="Las fotos de progreso deben ser cargadas por el alumno desde su aplicación."
            />
          ) : (
            <div className="space-y-4">
              {/* Initial vs Latest comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Initial Session */}
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sesión Inicial</p>
                  {initialPhoto ? (
                    <div className="rounded-xl overflow-hidden border border-border/30 bg-muted/10">
                      {(() => {
                        const pos = (["front", "back", "left", "right"] as const).find((p) => initialPhoto.photos[p]);
                        return pos && initialPhoto.photos[pos] ? (
                          <img src={initialPhoto.photos[pos]!} alt="Foto inicial" className="w-full h-36 object-cover" />
                        ) : (
                          <div className="h-36 flex items-center justify-center"><Camera className="h-6 w-6 text-muted-foreground/30" /></div>
                        );
                      })()}
                      <div className="p-2">
                        <p className="text-[10px] font-bold">
                          {safeFormat(initialPhoto.session_date, "d 'de' MMMM yyyy", "—", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-36 rounded-xl border border-dashed border-border/30 flex items-center justify-center">
                      <p className="text-[10px] text-muted-foreground">Solo hay una sesión</p>
                    </div>
                  )}
                </div>

                {/* Latest Session */}
                <div className="space-y-2">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Sesión Más Reciente</p>
                  {(latestPhoto ?? initialPhoto) ? (
                    <div className="rounded-xl overflow-hidden border border-border/30 bg-muted/10">
                      {(() => {
                        const photo = latestPhoto ?? initialPhoto!;
                        const pos = (["front", "back", "left", "right"] as const).find((p) => photo.photos[p]);
                        return pos && photo.photos[pos] ? (
                          <img src={photo.photos[pos]!} alt="Foto reciente" className="w-full h-36 object-cover" />
                        ) : (
                          <div className="h-36 flex items-center justify-center"><Camera className="h-6 w-6 text-muted-foreground/30" /></div>
                        );
                      })()}
                      <div className="p-2">
                        <p className="text-[10px] font-bold">
                          {safeFormat((latestPhoto ?? initialPhoto!).session_date, "d 'de' MMMM yyyy", "—", { locale: es })}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Compare button */}
              {photoSessions.length >= 2 && (
                <Button
                  variant="outline"
                  className="w-full h-9 text-xs font-bold rounded-xl gap-1.5"
                  onClick={() => setCompareIds({
                    a: sortedPhotos[0]?.id ?? null,
                    b: sortedPhotos[sortedPhotos.length - 1]?.id ?? null,
                  })}
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Comparar Sesiones
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section: Latest Assessment (Trainer-owned) ────────────── */}
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Última Evaluación
              <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/30 font-medium ml-1">
                Registrada por el entrenador
              </Badge>
            </CardTitle>
            {onNavigateToAssessment && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] gap-1 font-bold text-primary hover:bg-primary/10"
                onClick={onNavigateToAssessment}
              >
                Nueva / Ver todas <ChevronRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!latestAssessment ? (
            <EmptyState type="empty" title="Sin evaluaciones" description="Registra la primera evaluación física del alumno." />
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] text-muted-foreground font-semibold">
                {safeFormat(latestAssessment.recorded_at, "EEEE d 'de' MMMM yyyy", "—", { locale: es })}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { label: "Peso", val: latestAssessment.weight, unit: "kg" },
                  { label: "Grasa", val: latestAssessment.body_fat, unit: "%" },
                  { label: "Músculo", val: latestAssessment.muscle_mass, unit: "kg" },
                  { label: "Cintura", val: latestAssessment.waist, unit: "cm" },
                  { label: "Cadera", val: latestAssessment.hips, unit: "cm" },
                  { label: "Brazo", val: latestAssessment.arm, unit: "cm" },
                  { label: "Pecho", val: latestAssessment.chest, unit: "cm" },
                  { label: "Muslo", val: latestAssessment.thigh, unit: "cm" },
                  { label: "Pantorrilla", val: latestAssessment.calf, unit: "cm" },
                ].filter((f) => f.val != null).map((f) => (
                  <div key={f.label} className="bg-card/80 border border-border/30 rounded-lg p-2 text-center">
                    <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{f.label}</p>
                    <p className="text-xs font-bold">{f.val} {f.unit}</p>
                  </div>
                ))}
              </div>
              {latestAssessment.notes && (
                <p className="text-[10px] text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                  {latestAssessment.notes}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Section: Student Information ──────────────────────────── */}
      <div>
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
          <UserIcon className="h-3 w-3 text-primary" />
          Información Reportada por el Alumno
        </h3>

        {/* ── Injuries (read-only) ── */}
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Lesiones
              {activeInjuries.length > 0 && (
                <Badge className="ml-1 text-[9px] bg-destructive/15 text-destructive border border-destructive/30">
                  {activeInjuries.length} activa{activeInjuries.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {injuries.length === 0 ? (
              <EmptyState type="empty" title="Sin lesiones reportadas por el alumno" description="Las lesiones son registradas por el alumno desde su aplicación." />
            ) : (
              <div className="space-y-2">
                {activeInjuries.map((inj) => {
                  const cfg = STATUS_INJURY[inj.status as InjuryStatus] ?? STATUS_INJURY_FALLBACK;
                  return (
                    <div key={inj.id} className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold">{inj.location}</p>
                          {inj.zone && <p className="text-[10px] text-muted-foreground">{inj.zone}</p>}
                        </div>
                        <Badge variant="outline" className={cn("text-[9px] font-bold border shrink-0", cfg.className)}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("text-xs font-bold", painColor(inj.pain_level ?? 0))}>
                          Dolor: {inj.pain_level ?? "—"}/10
                        </span>
                        {inj.intensity && <Badge variant="outline" className="text-[9px]">{inj.intensity}</Badge>}
                        <span className="text-[9px] text-muted-foreground ml-auto">
                          {safeFormat(inj.created_at, "d MMM yyyy", "—", { locale: es })}
                        </span>
                      </div>
                      {inj.observations && (
                        <p className="text-[10px] text-muted-foreground italic border-l-2 border-border/40 pl-2">
                          {inj.observations}
                        </p>
                      )}
                    </div>
                  );
                })}
                {recoveredInjuries.length > 0 && (
                  <details className="group">
                    <summary className="cursor-pointer text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 py-1">
                      <RefreshCw className="h-3 w-3 text-emerald-500" />
                      Historial recuperadas ({recoveredInjuries.length})
                    </summary>
                    <div className="space-y-2 mt-2">
                      {recoveredInjuries.map((inj) => {
                        const cfg = STATUS_INJURY[inj.status as InjuryStatus] ?? STATUS_INJURY_FALLBACK;
                        return (
                          <div key={inj.id} className="p-3 rounded-xl bg-secondary/10 border border-border/30 space-y-1.5 opacity-70">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-bold">{inj.location}</p>
                              <Badge variant="outline" className={cn("text-[9px] font-bold border shrink-0", cfg.className)}>
                                {cfg.label}
                              </Badge>
                            </div>
                            <span className="text-[9px] text-muted-foreground">
                              {safeFormat(inj.created_at, "d MMM yyyy", "—", { locale: es })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Goals (read-only) ── */}
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Objetivos
              {activeGoals.length > 0 && (
                <Badge className="ml-1 text-[9px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  {activeGoals.length} activo{activeGoals.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <EmptyState type="empty" title="Sin objetivos registrados por el alumno" description="Los objetivos son definidos por el alumno desde su aplicación." />
            ) : (
              <div className="space-y-2">
                {[...activeGoals, ...completedGoals].map((g) => {
                  const stCfg = STATUS_GOAL[g.status as GoalStatus] ?? STATUS_GOAL_FALLBACK;
                  const progressPct = Math.min(100, Math.max(0, g.progress_pct ?? 0));
                  return (
                    <div
                      key={g.id}
                      className={cn(
                        "p-3 rounded-xl bg-secondary/10 border border-border/30 space-y-2",
                        g.status !== "en_progreso" && "opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-snug">{g.goal}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {g.category && <Badge variant="outline" className="text-[9px]">{g.category}</Badge>}
                            <Badge variant="outline" className={cn("text-[9px] border", stCfg.className)}>
                              {stCfg.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>Progreso</span>
                          <span className="font-bold text-primary">{progressPct}%</span>
                        </div>
                        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-primary/70 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        {safeFormat(g.start_date, "d MMM", "—", { locale: es })} →{" "}
                        {safeFormat(g.target_date, "d MMM yyyy", "—", { locale: es })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Student Notes (read-only) ── */}
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-amber-500" />
              Notas del Alumno
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentNotes.length === 0 ? (
              <EmptyState type="empty" title="Sin notas del alumno" description="Las notas son agregadas por el alumno desde su aplicación." />
            ) : (
              <div className="space-y-2">
                {studentNotes.map((note) => (
                  <div key={note.id} className="p-3 rounded-xl bg-secondary/10 border border-border/30 space-y-1.5">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {safeFormat(note.created_at, "d 'de' MMMM yyyy, HH:mm", "—", { locale: es })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Photo Compare Modal */}
      {compareIds && photoSessions.length >= 2 && (
        <PhotoCompareModal
          open={!!compareIds}
          onClose={() => setCompareIds(null)}
          sessions={photoSessions}
          initialA={compareIds.a}
          initialB={compareIds.b}
        />
      )}
    </div>
  );
}
