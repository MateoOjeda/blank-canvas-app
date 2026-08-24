import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, Zap, Weight, TrendingUp, Dumbbell, Loader2, ClipboardList, AlertTriangle } from "lucide-react";
import { useStudentSurveys } from "@/hooks/useStudentSurveys";
import { useNavigate } from "react-router-dom";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";

interface Exercise {
  id: string;
  name: string;
  completed: boolean;
  day: string;
}

interface Profile {
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
  weight: number | null;
}

export default function ProgressPage() {
  const { user } = useAuth();
  
  // Use React Query hook instead of direct service call
  const { pendingSurveys, isLoadingPending } = useStudentSurveys(user?.uid);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const qEx = query(collection(db, "exercises"), where("student_id", "==", user.uid));
      const profileRef = doc(db, "profiles", user.uid);
      const qLevels = query(
        collection(db, "plan_levels"), 
        where("student_id", "==", user.uid), 
        where("unlocked", "==", true)
      );

      // Fetch all documents in parallel
      const [snapEx, profSnap, snapLevels] = await Promise.all([
        getDocs(qEx),
        getDoc(profileRef),
        getDocs(qLevels)
      ]);

      const exData = snapEx.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));
      setExercises(exData);
      
      if (profSnap.exists()) {
        setProfile(profSnap.data() as Profile);
      }
      setUnlockedCount(snapLevels.size);
    } catch (err: unknown) {
      console.error("Error fetching progress data:", err);
      const error = err as { code?: string } | undefined;
      const msg = error?.code === "permission-denied"
        ? "No tienes permiso para ver estos datos."
        : "Error al cargar datos de progreso. Intenta de nuevo.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasPendingSurveys = pendingSurveys.length > 0;
  const isLoadingAll = loading || isLoadingPending;

  if (isLoadingAll) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded-lg" />
        </div>
        <LoadingSkeleton type="details" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Progreso</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitorea tu desempeño semanal y efectividad de entrenamiento</p>
        </div>
        <Card className="border border-destructive/20 bg-destructive/5 rounded-xl">
          <CardContent className="p-6 text-center space-y-3">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
            <p className="text-sm font-semibold text-foreground">{error}</p>
            <button onClick={fetchData} className="text-xs font-bold text-primary hover:underline">
              Reintentar
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Progreso</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitorea tu desempeño semanal y efectividad de entrenamiento</p>
        </div>
        <EmptyState
          type="empty"
          title="Sin ejercicios asignados"
          description="Tu entrenador aún no te ha asignado ejercicios. Cuando los tengas, verás tu progreso aquí."
        />
      </div>
    );
  }

  const totalCompleted = exercises.filter((e) => e.completed).length;
  const totalExercises = exercises.length;
  const completionRate = totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0;

  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const dayStats = days.map((day) => {
    const dayExercises = exercises.filter((e) => e.day === day);
    const done = dayExercises.filter((e) => e.completed).length;
    return { day: day.substring(0, 3), total: dayExercises.length, done };
  });

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Progreso</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitorea tu desempeño semanal y efectividad de entrenamiento</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-full w-fit">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Desempeño</span>
        </div>
      </div>

      {hasPendingSurveys && (
        <div className="flex justify-center">
          <Badge 
            className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-full text-[10px] font-semibold px-3 py-1.5 flex items-center gap-1.5 cursor-pointer hover:bg-amber-500/15 transition-colors"
            onClick={() => navigate("/student/surveys")}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Tienes encuestas de seguimiento pendientes
          </Badge>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Ejercicios", value: totalExercises, sub: "Asignados", icon: Dumbbell, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
            { label: "Completados", value: totalCompleted, sub: "Total", icon: Zap, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
            { label: "Peso", value: profile?.weight ? `${profile.weight} kg` : "—", sub: "Actual", icon: Weight, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
            { label: "Nivel", value: `${unlockedCount}/12`, sub: "Evolución", icon: TrendingUp, color: "text-primary bg-primary/10 border-primary/20" }
          ].map((stat, i) => (
            <Card key={i} className="border border-border/50 bg-card hover:bg-muted/10 transition-all rounded-xl shadow-sm">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <div className={cn("mb-2.5 p-2 rounded-lg border", stat.color)}>
                  <stat.icon className="h-4.5 w-4.5" />
                </div>
                <p className="text-xl font-bold tracking-tight text-foreground">{stat.value}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion by day */}
        <Card className="border border-border/50 bg-card shadow-sm rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-muted/40">
            <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-foreground">
              <Target className="h-4 w-4 text-primary" />
              Consistencia Semanal
            </h3>
          </div>
          <CardContent className="p-5">
            <div className="grid grid-cols-7 gap-2 sm:gap-4">
              {dayStats.map((ds) => {
                const pct = ds.total > 0 ? Math.round((ds.done / ds.total) * 100) : 0;
                return (
                  <div key={ds.day} className="flex flex-col items-center gap-2.5 group">
                    <div className="relative w-full h-28 bg-muted/30 rounded-lg overflow-hidden border border-border/40 shadow-inner">
                      <div
                        className="absolute bottom-0 w-full bg-primary/20 transition-all duration-300"
                        style={{ height: `${pct}%` }}
                      />
                      <div
                        className="absolute bottom-0 w-full bg-primary shadow-sm transition-all duration-300"
                        style={{ height: `${ds.total > 0 ? (ds.done / ds.total) * 100 : 0}%` }}
                      />
                      {pct === 100 && (
                        <div className="absolute top-1.5 left-1/2 -translate-x-1/2">
                          <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{ds.day}</p>
                      <p className={cn(
                        "text-[10px] font-semibold mt-0.5",
                        ds.done === ds.total && ds.total > 0 ? "text-primary" : "text-muted-foreground/60"
                      )}>
                        {ds.done}/{ds.total}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Completion rate - Elite Card */}
        <div className="relative group">
          <Card className="border border-primary/20 bg-primary/5 py-8 relative overflow-hidden rounded-2xl shadow-sm text-center">
            <CardContent className="p-0 space-y-4">
              <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto border border-primary/20 shadow-sm">
                <Zap className="h-7 w-7 text-primary fill-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-4xl font-bold tracking-tight text-foreground leading-none">{completionRate}%</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Tasa de Efectividad</p>
              </div>
              <p className="text-xs text-muted-foreground max-w-[280px] mx-auto font-medium leading-relaxed italic px-4">
                {completionRate >= 80 ? "¡Estás en la zona elite! Mantén ese ritmo imparable. 🏆" : "Cada repetición cuenta para tu objetivo. ¡Sigue presionando! 💪"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
