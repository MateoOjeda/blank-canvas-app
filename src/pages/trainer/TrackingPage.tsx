import { lazy, Suspense, useState } from "react";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { useStudentTracking } from "@/hooks/useStudentTracking";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Activity, AlertTriangle, ArrowLeft, BarChart3,
  Camera, Dumbbell, Loader2, TrendingUp, ClipboardList
} from "lucide-react";
import { StudentCard } from "@/components/trainer/StudentCard";
import type { Assessment, Injury, Goal, TrackingNote } from "@/services/tracking";

// ── Lazy-loaded tab components ─────────────────────────────────────────────────
const TrackingDashboardTab  = lazy(() => import("@/components/trainer/tracking/TrackingDashboardTab"));
const TrackingTrainingTab   = lazy(() => import("@/components/trainer/tracking/TrackingTrainingTab"));
const TrackingProgressTab   = lazy(() => import("@/components/trainer/tracking/TrackingProgressTab"));
const TrackingAssessmentTab = lazy(() => import("@/components/trainer/tracking/TrackingAssessmentTab"));
const PhotoSessionsPanel    = lazy(() => import("@/components/trainer/tracking/PhotoSessionsPanel"));

// ── Tab definition ─────────────────────────────────────────────────────────────
const TABS = [
  { value: "dashboard",   label: "Dashboard",   icon: Activity },
  { value: "training",    label: "Entreno",     icon: Dumbbell },
  { value: "progress",    label: "Progreso",    icon: TrendingUp },
  { value: "assessment",  label: "Evaluación",  icon: ClipboardList },
  { value: "photos",      label: "Fotos",       icon: Camera },
] as const;

type TabValue = typeof TABS[number]["value"];

// ── Tab fallback ───────────────────────────────────────────────────────────────
function TabFallback() {
  return (
    <div className="space-y-3 mt-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse" />
      ))}
    </div>
  );
}

// ── Page header ────────────────────────────────────────────────────────────────
function PageHeader({ studentCount }: { studentCount: number }) {
  return (
    <div>
      <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">
        Seguimiento
      </h1>
      <p className="text-muted-foreground text-sm mt-1">
        {studentCount > 0
          ? `${studentCount} alumno${studentCount !== 1 ? "s" : ""} vinculado${studentCount !== 1 ? "s" : ""}`
          : "Selecciona un alumno para ver su dashboard completo"}
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TrackingPage() {
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>("dashboard");

  const student = students.find((s) => s.user_id === selectedStudentId) ?? null;

  // Core tracking data
  const {
    assessments, injuries, goals, notes, studentNotes, exerciseLogs, loading: loadingTracking,
    setAssessments, setInjuries, setGoals, setNotes,
  } = useStudentTracking(selectedStudentId);

  // Badge counts
  const activeInjuries = injuries.filter((i) => i.status === "activa").length;

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setActiveTab("dashboard");
  };

  const handleBack = () => setSelectedStudentId(null);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingStudents) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader studentCount={students.length} />
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Vincula alumnos primero para ver su seguimiento.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Student list view ──────────────────────────────────────────────────────
  if (!selectedStudentId) {
    return (
      <div className="space-y-6">
        <PageHeader studentCount={students.length} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {students.map((s) => (
            <StudentCard
              key={s.user_id}
              name={s.display_name}
              avatarUrl={s.avatar_url}
              avatarInitials={s.avatar_initials}
              size="sm"
              onClick={() => handleSelectStudent(s.user_id)}
              className="border-border/40 hover:border-primary/30"
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Student detail view ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
          <ArrowLeft className="h-4.5 w-4.5" />
        </Button>
        <Avatar className="h-9 w-9 border border-primary/20 shrink-0">
          <AvatarImage src={student?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
            {student?.avatar_initials ?? (student?.display_name ?? "??").slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold truncate">{student?.display_name}</h1>
          <p className="text-[10px] text-muted-foreground">Dashboard de seguimiento</p>
        </div>
        {/* Quick status badge */}
        {activeInjuries > 0 && (
          <Badge className="gap-1 bg-destructive/15 text-destructive border border-destructive/30 shrink-0">
            <AlertTriangle className="h-3 w-3" />
            {activeInjuries} lesión{activeInjuries > 1 ? "es" : ""}
          </Badge>
        )}
      </div>

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="flex flex-wrap w-full bg-muted/40 border border-border/50 p-1 h-auto rounded-xl">
          {TABS.map(({ value, label, icon: Icon }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex-1 min-w-[70px] text-[10px] py-1.5 px-2 transition-all data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg font-semibold"
            >
              <span className="flex items-center gap-1 justify-center">
                <Icon className="h-3 w-3" />
                {label}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Dashboard */}
        <TabsContent value="dashboard" className="space-y-4 outline-none mt-4">
          <Suspense fallback={<TabFallback />}>
            <TrackingDashboardTab
              studentId={selectedStudentId}
              assessments={assessments}
              injuries={injuries}
              goals={goals}
              notes={notes}
              exerciseLogs={exerciseLogs}
              loading={loadingTracking}
              onTabChange={(tab) => setActiveTab(tab as TabValue)}
            />
          </Suspense>
        </TabsContent>

        {/* Entrenamiento */}
        <TabsContent value="training" className="space-y-4 outline-none mt-4">
          <Suspense fallback={<TabFallback />}>
            <TrackingTrainingTab
              studentId={selectedStudentId}
              assessments={assessments}
              goals={goals}
              exerciseLogs={exerciseLogs}
              loading={loadingTracking}
            />
          </Suspense>
        </TabsContent>

        {/* Progreso — Read-only student evolution dashboard */}
        <TabsContent value="progress" className="space-y-4 outline-none mt-4">
          <Suspense fallback={<TabFallback />}>
            <TrackingProgressTab
              studentId={selectedStudentId}
              assessments={assessments}
              injuries={injuries}
              goals={goals}
              studentNotes={studentNotes}
              loading={loadingTracking}
              onNavigateToAssessment={() => setActiveTab("assessment")}
            />
          </Suspense>
        </TabsContent>

        {/* Evaluación Física (Trainer-owned form) */}
        <TabsContent value="assessment" className="space-y-4 outline-none mt-4">
          <Suspense fallback={<TabFallback />}>
            <TrackingAssessmentTab
              studentId={selectedStudentId}
              assessments={assessments}
              loading={loadingTracking}
              onAdd={(a: Assessment) => setAssessments((prev) => [a, ...prev])}
              onDelete={(id: string) => setAssessments((prev) => prev.filter((x) => x.id !== id))}
            />
          </Suspense>
        </TabsContent>

        {/* Fotos — Sesiones de fotos del alumno */}
        <TabsContent value="photos" className="space-y-4 outline-none mt-4">
          <Suspense fallback={<TabFallback />}>
            <PhotoSessionsPanel
              studentId={selectedStudentId}
              latestAssessment={assessments[0] ?? null}
              readOnly={false}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
