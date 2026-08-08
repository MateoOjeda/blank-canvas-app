import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  AlertTriangle, Check, ChevronDown, ChevronUp, Edit2,
  Loader2, Plus, RefreshCw, StickyNote, Target, Trash2, X,
} from "lucide-react";
import {
  Injury, InjuryStatus, Goal, GoalStatus, GoalPriority, StudentNote,
  fetchInjuriesByStudent, addInjury, updateInjury, deleteInjury,
  fetchGoalsByStudent, addGoal, updateGoal, deleteGoal,
  fetchStudentNotes, addStudentNote, updateStudentNote, deleteStudentNote,
} from "@/services/tracking";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_INJURY: Record<InjuryStatus, { label: string; className: string }> = {
  activa: { label: "Activa", className: "bg-destructive/10 text-destructive border-destructive/30" },
  recuperada: { label: "Recuperada", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
};

const STATUS_GOAL: Record<GoalStatus, { label: string; className: string }> = {
  en_progreso: { label: "En progreso", className: "bg-primary/10 text-primary border-primary/30" },
  logrado: { label: "Logrado ✓", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  abandonado: { label: "Abandonado", className: "bg-muted/40 text-muted-foreground border-border/40" },
};

const PRIORITY_CONFIG: Record<GoalPriority, { label: string; className: string }> = {
  alta: { label: "Alta", className: "text-destructive border-destructive/30 bg-destructive/10" },
  media: { label: "Media", className: "text-amber-500 border-amber-500/30 bg-amber-500/10" },
  baja: { label: "Baja", className: "text-muted-foreground border-border/40 bg-muted/30" },
};

const CATEGORIES = [
  "Fuerza", "Resistencia", "Pérdida de peso", "Ganancia muscular",
  "Flexibilidad", "Hábitos", "Rendimiento", "Salud general", "Otro"
];

function painColor(level: number) {
  if (level <= 3) return "text-emerald-600 dark:text-emerald-400";
  if (level <= 6) return "text-amber-500";
  return "text-destructive";
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function StudentProgressPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"injuries" | "goals" | "notes">("injuries");

  // Data state
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<StudentNote[]>([]);

  // Load data
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [inj, g, n] = await Promise.all([
        fetchInjuriesByStudent(user.uid),
        fetchGoalsByStudent(user.uid),
        fetchStudentNotes(user.uid),
      ]);
      setInjuries(inj);
      setGoals(g);
      setNotes(n);
    } catch (err) {
      console.error("Error loading student progress:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded-lg" />
        </div>
        <LoadingSkeleton type="list" count={4} />
      </div>
    );
  }

  const sections = [
    { key: "injuries" as const, label: "Lesiones", icon: AlertTriangle, count: injuries.filter((i) => i.status === "activa").length },
    { key: "goals" as const, label: "Objetivos", icon: Target, count: goals.filter((g) => g.status === "en_progreso").length },
    { key: "notes" as const, label: "Notas", icon: StickyNote, count: notes.length },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Progreso</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestiona tus lesiones, objetivos y notas personales</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2">
        {sections.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition-all",
              activeSection === key
                ? "bg-primary/10 border-primary/30 text-primary"
                : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count > 0 && (
              <Badge className="text-[8px] h-4 min-w-4 px-1" variant="outline">{count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSection === "injuries" && user && (
        <InjuriesSection
          studentId={user.uid}
          injuries={injuries}
          setInjuries={setInjuries}
        />
      )}
      {activeSection === "goals" && user && (
        <GoalsSection
          studentId={user.uid}
          goals={goals}
          setGoals={setGoals}
        />
      )}
      {activeSection === "notes" && user && (
        <NotesSection
          studentId={user.uid}
          notes={notes}
          setNotes={setNotes}
        />
      )}
    </div>
  );
}

// ─── Injuries Section ─────────────────────────────────────────────────────────

function InjuriesSection({ studentId, injuries, setInjuries }: {
  studentId: string;
  injuries: Injury[];
  setInjuries: React.Dispatch<React.SetStateAction<Injury[]>>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form
  const [location, setLocation] = useState("");
  const [zone, setZone] = useState("");
  const [painLevel, setPainLevel] = useState(5);
  const [intensity, setIntensity] = useState("");
  const [observations, setObservations] = useState("");

  const handleSave = async () => {
    if (!location.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const data: Omit<Injury, "id"> = {
        trainer_id: studentId,
        student_id: studentId,
        created_by: studentId,
        created_at: now,
        updated_at: now,
        location: location.trim(),
        zone: zone.trim() || undefined,
        pain_level: painLevel,
        intensity: intensity.trim() || undefined,
        status: "activa",
        observations: observations.trim() || undefined,
      };
      const id = await addInjury(data);
      setInjuries((prev) => [{ id, ...data }, ...prev]);
      toast.success("Lesión registrada");
      setLocation(""); setZone(""); setPainLevel(5); setIntensity(""); setObservations("");
      setShowForm(false);
    } catch {
      toast.error("Error al guardar la lesión");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (injury: Injury) => {
    setTogglingId(injury.id);
    const newStatus: InjuryStatus = injury.status === "activa" ? "recuperada" : "activa";
    try {
      const updated_at = new Date().toISOString();
      await updateInjury(injury.id, { status: newStatus, updated_at });
      setInjuries((prev) => prev.map((x) => x.id === injury.id ? { ...x, status: newStatus, updated_at } : x));
      toast.success(newStatus === "recuperada" ? "Marcada como recuperada" : "Reactivada");
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteInjury(id);
      setInjuries((prev) => prev.filter((x) => x.id !== id));
      toast.success("Lesión eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const active = injuries.filter((i) => i.status === "activa");
  const recovered = injuries.filter((i) => i.status === "recuperada");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Mis Lesiones</h2>
        <Button
          size="sm"
          className="h-8 text-[10px] gap-1.5 font-bold"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancelar" : "Registrar Lesión"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Zona afectada *</Label>
                <Input placeholder="Ej: Rodilla derecha" value={location} onChange={(e) => setLocation(e.target.value)} className="h-9 text-xs border-border/50 bg-secondary/15" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Zona (detalle)</Label>
                <Input placeholder="Ej: Ligamento lateral externo" value={zone} onChange={(e) => setZone(e.target.value)} className="h-9 text-xs border-border/50 bg-secondary/15" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Nivel de dolor</Label>
                <span className={cn("text-sm font-bold", painColor(painLevel))}>{painLevel}/10</span>
              </div>
              <Slider min={1} max={10} step={1} value={[painLevel]} onValueChange={([v]) => setPainLevel(v)} className="w-full" />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Intensidad / Tipo</Label>
              <Input placeholder="Ej: Aguda, crónica, muscular..." value={intensity} onChange={(e) => setIntensity(e.target.value)} className="h-9 text-xs border-border/50 bg-secondary/15" />
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Observaciones</Label>
              <Textarea placeholder="Contexto, circunstancias..." value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} className="text-xs border-border/50 bg-secondary/15 resize-none" />
            </div>
            <Button onClick={handleSave} disabled={saving || !location.trim()} className="w-full h-10 rounded-xl font-bold shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
              {saving ? "Guardando..." : "Registrar Lesión"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {injuries.length === 0 ? (
        <EmptyState type="empty" title="Sin lesiones registradas" description="Registra lesiones o incomodidades para que tu entrenador pueda hacer seguimiento." />
      ) : (
        <div className="space-y-3">
          {active.map((inj) => {
            const cfg = STATUS_INJURY[inj.status];
            return (
              <div key={inj.id} className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/20 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold">{inj.location}</p>
                    {inj.zone && <p className="text-[10px] text-muted-foreground">{inj.zone}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge variant="outline" className={cn("text-[9px] font-bold border", cfg.className)}>{cfg.label}</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleToggle(inj)} disabled={togglingId === inj.id}>
                      {togglingId === inj.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(inj.id)} disabled={deletingId === inj.id}>
                      {deletingId === inj.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-xs font-bold", painColor(inj.pain_level))}>Dolor: {inj.pain_level}/10</span>
                  {inj.intensity && <Badge variant="outline" className="text-[9px]">{inj.intensity}</Badge>}
                  <span className="text-[9px] text-muted-foreground ml-auto">{format(parseISO(inj.created_at), "d MMM yyyy", { locale: es })}</span>
                </div>
                {inj.observations && <p className="text-[10px] text-muted-foreground italic border-l-2 border-border/40 pl-2">{inj.observations}</p>}
              </div>
            );
          })}
          {recovered.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-[10px] font-bold text-muted-foreground flex items-center gap-1.5 py-2">
                <RefreshCw className="h-3 w-3 text-emerald-500" />
                Historial recuperadas ({recovered.length})
              </summary>
              <div className="space-y-2 mt-2">
                {recovered.map((inj) => {
                  const cfg = STATUS_INJURY[inj.status];
                  return (
                    <div key={inj.id} className="p-3 rounded-xl bg-secondary/10 border border-border/30 space-y-1.5 opacity-70">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold">{inj.location}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className={cn("text-[9px] font-bold border", cfg.className)}>{cfg.label}</Badge>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => handleToggle(inj)} disabled={togglingId === inj.id}>
                            {togglingId === inj.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(inj.id)} disabled={deletingId === inj.id}>
                            {deletingId === inj.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                      <span className="text-[9px] text-muted-foreground">{format(parseISO(inj.created_at), "d MMM yyyy", { locale: es })}</span>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Goals Section ────────────────────────────────────────────────────────────

function GoalsSection({ studentId, goals, setGoals }: {
  studentId: string;
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form
  const [goalText, setGoalText] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState<GoalPriority>("media");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [targetDate, setTargetDate] = useState("");
  const [progressPct, setProgressPct] = useState(0);

  const handleSave = async () => {
    if (!goalText.trim() || !targetDate) return;
    setSaving(true);
    try {
      const data: Omit<Goal, "id"> = {
        trainer_id: studentId,
        student_id: studentId,
        created_by: studentId,
        created_at: new Date().toISOString(),
        goal: goalText.trim(),
        category,
        priority,
        start_date: startDate,
        target_date: targetDate,
        progress_pct: progressPct,
        status: "en_progreso",
      };
      const id = await addGoal(data);
      setGoals((prev) => [{ id, ...data }, ...prev]);
      toast.success("Objetivo creado");
      setGoalText(""); setCategory(CATEGORIES[0]); setPriority("media");
      setStartDate(new Date().toISOString().split("T")[0]); setTargetDate(""); setProgressPct(0);
      setShowForm(false);
    } catch {
      toast.error("Error al guardar el objetivo");
    } finally {
      setSaving(false);
    }
  };

  const handleProgressUpdate = async (id: string, newPct: number) => {
    try {
      await updateGoal(id, { progress_pct: newPct });
      setGoals((prev) => prev.map((x) => x.id === id ? { ...x, progress_pct: newPct } : x));
    } catch {
      toast.error("Error al actualizar progreso");
    }
  };

  const handleStatusChange = async (id: string, status: GoalStatus) => {
    try {
      await updateGoal(id, { status });
      setGoals((prev) => prev.map((x) => x.id === id ? { ...x, status } : x));
      toast.success(STATUS_GOAL[status].label);
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteGoal(id);
      setGoals((prev) => prev.filter((x) => x.id !== id));
      toast.success("Objetivo eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const active = goals.filter((g) => g.status === "en_progreso");
  const done = goals.filter((g) => g.status !== "en_progreso");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Mis Objetivos</h2>
        <Button size="sm" className="h-8 text-[10px] gap-1.5 font-bold" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancelar" : "Nuevo Objetivo"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1">
              <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Objetivo *</Label>
              <Input placeholder="Ej: Levantar 100kg en sentadilla" value={goalText} onChange={(e) => setGoalText(e.target.value)} className="h-9 text-xs border-border/50 bg-secondary/15" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Categoría</Label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 rounded-lg border border-border/50 bg-secondary/15 text-xs px-3 focus:outline-none focus:ring-1 focus:ring-primary/40">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Prioridad</Label>
                <div className="flex gap-2">
                  {(["alta", "media", "baja"] as GoalPriority[]).map((p) => (
                    <button key={p} type="button" onClick={() => setPriority(p)} className={cn("flex-1 h-9 rounded-lg border text-[10px] font-bold transition-all", priority === p ? PRIORITY_CONFIG[p].className : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40")}>
                      {PRIORITY_CONFIG[p].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Inicio</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-xs border-border/50 bg-secondary/15" />
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Fecha objetivo *</Label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="h-9 text-xs border-border/50 bg-secondary/15" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving || !goalText.trim() || !targetDate} className="w-full h-10 rounded-xl font-bold shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
              {saving ? "Guardando..." : "Crear Objetivo"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {goals.length === 0 ? (
        <EmptyState type="empty" title="Sin objetivos" description="Define metas concretas para hacer seguimiento de tu progreso." />
      ) : (
        <div className="space-y-3">
          {[...active, ...done].map((g) => {
            const stCfg = STATUS_GOAL[g.status];
            const prCfg = PRIORITY_CONFIG[g.priority];
            return (
              <Card key={g.id} className={cn("border bg-card/60 rounded-xl shadow-sm", g.status === "en_progreso" ? "border-border/40" : "border-border/20 opacity-70")}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-snug">{g.goal}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {g.category && <Badge variant="outline" className="text-[9px]">{g.category}</Badge>}
                        <Badge variant="outline" className={cn("text-[9px] border", prCfg.className)}>{prCfg.label}</Badge>
                        <Badge variant="outline" className={cn("text-[9px] border", stCfg.className)}>{stCfg.label}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0" onClick={() => handleDelete(g.id)} disabled={deletingId === g.id}>
                      {deletingId === g.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                      <span>Progreso</span>
                      <span className="font-bold text-primary">{g.progress_pct}%</span>
                    </div>
                    <Progress value={g.progress_pct} className="h-1.5" />
                    {g.status === "en_progreso" && (
                      <div className="flex gap-1 justify-end">
                        {[0, 25, 50, 75, 100].map((pct) => (
                          <button key={pct} type="button" onClick={() => handleProgressUpdate(g.id, pct)} className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded border transition-all", g.progress_pct === pct ? "bg-primary/15 border-primary/40 text-primary" : "border-border/30 text-muted-foreground hover:bg-muted/40")}>
                            {pct}%
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[9px] text-muted-foreground">
                      {format(parseISO(g.start_date), "d MMM", { locale: es })} → {format(parseISO(g.target_date), "d MMM yyyy", { locale: es })}
                    </p>
                    {g.status === "en_progreso" && (
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleStatusChange(g.id, "logrado")}>
                          ✓ Logrado
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 border-border/40 text-muted-foreground hover:bg-muted/40" onClick={() => handleStatusChange(g.id, "abandonado")}>
                          Abandonar
                        </Button>
                      </div>
                    )}
                    {g.status !== "en_progreso" && (
                      <Button variant="outline" size="sm" className="h-6 text-[9px] px-2 border-primary/30 text-primary hover:bg-primary/10" onClick={() => handleStatusChange(g.id, "en_progreso")}>
                        Reactivar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Notes Section ────────────────────────────────────────────────────────────

function NotesSection({ studentId, notes, setNotes }: {
  studentId: string;
  notes: StudentNote[];
  setNotes: React.Dispatch<React.SetStateAction<StudentNote[]>>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [content, setContent] = useState("");

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const data: Omit<StudentNote, "id"> = {
        student_id: studentId,
        created_by: studentId,
        created_at: now,
        updated_at: now,
        content: content.trim(),
      };
      const id = await addStudentNote(data);
      setNotes((prev) => [{ id, ...data }, ...prev]);
      toast.success("Nota guardada");
      setContent("");
      setShowForm(false);
    } catch {
      toast.error("Error al guardar la nota");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    try {
      const updated_at = new Date().toISOString();
      await updateStudentNote(id, { content: editContent.trim(), updated_at });
      setNotes((prev) => prev.map((n) => n.id === id ? { ...n, content: editContent.trim(), updated_at } : n));
      toast.success("Nota actualizada");
      setEditingId(null);
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteStudentNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Nota eliminada");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Mis Notas</h2>
        <Button size="sm" className="h-8 text-[10px] gap-1.5 font-bold" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
          {showForm ? "Cancelar" : "Nueva Nota"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Nota</Label>
              <Textarea placeholder="Escribe aquí tus observaciones, cómo te sientes, etc..." value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="text-xs border-border/50 bg-secondary/15 resize-none" />
            </div>
            <Button onClick={handleSave} disabled={saving || !content.trim()} className="w-full h-10 rounded-xl font-bold shadow-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <StickyNote className="h-4 w-4 mr-2" />}
              {saving ? "Guardando..." : "Guardar Nota"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {notes.length === 0 ? (
        <EmptyState type="empty" title="Sin notas" description="Agrega notas para que tu entrenador pueda conocer mejor tu situación." />
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="p-4 rounded-xl bg-secondary/10 border border-border/30 space-y-2">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="text-xs border-border/50 bg-secondary/15 resize-none" />
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setEditingId(null)}>Cancelar</Button>
                    <Button size="sm" className="h-7 text-[10px]" onClick={() => handleUpdate(note.id)} disabled={!editContent.trim()}>Guardar</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap flex-1">{note.content}</p>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => { setEditingId(note.id); setEditContent(note.content); }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(note.id)} disabled={deletingId === note.id}>
                        {deletingId === note.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    {format(parseISO(note.created_at), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
                    {note.updated_at !== note.created_at && " (editada)"}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
