import { useState, useEffect, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  limit,
  startAfter,
  doc,
  getDoc
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { TimelineCard } from "@/components/ui/timeline-card";
import { CheckCircle, XCircle, Dumbbell, Loader2, MessageSquare, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { chunkArray } from "@/lib/chunking";

interface ExerciseLog {
  id: string;
  exercise_id: string;
  log_date: string;
  completed: boolean;
  actual_sets: number | null;
  actual_reps: number | null;
  actual_weight: number | null;
  notes: string;
  exercise_name: string;
  planned_sets: number;
  planned_reps: number;
  planned_weight: number;
  day: string;
}

interface Props {
  studentId: string;
}

const PAGE_SIZE = 10; // entries

export default function ExerciseHistoryTab({ studentId }: Props) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (append = false) => {
    if (!user) return;
    if (!append) setLoading(true);
    else setLoadingMore(true);
    
    try {
      let q = query(
        collection(db, "exercise_logs"),
        where("student_id", "==", studentId),
        where("trainer_id", "==", user.uid),
        orderBy("log_date", "desc"),
        limit(PAGE_SIZE)
      );

      if (append && lastDoc) {
        q = query(
          collection(db, "exercise_logs"),
          where("student_id", "==", studentId),
          where("trainer_id", "==", user.uid),
          orderBy("log_date", "desc"),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      if (snap.empty) {
        if (!append) setLogs([]);
        setHasMore(false);
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      setLastDoc(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.docs.length === PAGE_SIZE);

      const logData = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

      // Get exercise details
      const exerciseIds = [...new Set(logData.map((l: any) => l.exercise_id))];
      // Firestore doesn't support 'in' with more than 30 elements, but here it's likely small.
      // If it's a lot, we might need a different approach.
      const exerciseMap = new Map<string, any>();
      
      // Fetch each exercise individually (or in chunks of 30)
      const chunks = chunkArray(exerciseIds, 30);
      const exSnaps = await Promise.all(
        chunks.map(chunk => getDocs(query(collection(db, "exercises"), where("__name__", "in", chunk))))
      );
      exSnaps.forEach(snap => {
        snap.docs.forEach(d => exerciseMap.set(d.id, d.data()));
      });

      const enriched: ExerciseLog[] = logData.map((log: any) => {
        const ex = exerciseMap.get(log.exercise_id);
        return {
          ...log,
          exercise_name: ex?.name || "Ejercicio eliminado",
          planned_sets: ex?.sets || 0,
          planned_reps: ex?.reps || 0,
          planned_weight: ex?.weight || 0,
          day: ex?.day || "",
        };
      });

      if (append) {
        setLogs(prev => [...prev, ...enriched]);
      } else {
        setLogs(enriched);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, studentId, lastDoc]);

  useEffect(() => {
    fetchLogs(false);
  }, [studentId]); // Only refetch on studentId change

  // Realtime
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "exercise_logs"),
      where("student_id", "==", studentId),
      where("trainer_id", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, () => {
      // For now we just refetch everything if there's a change
      // because the pagination makes it tricky to just update
      setLastDoc(null);
      fetchLogs(false);
    });
    return () => unsubscribe();
  }, [user, studentId]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchLogs(true);
    }
  };

  // Group and sort logs by date memoized to avoid redundant calculations on renders
  const { grouped, sortedDates } = useMemo(() => {
    const grouped = logs.reduce<Record<string, ExerciseLog[]>>((acc, log) => {
      const key = log.log_date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
      return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
    return { grouped, sortedDates };
  }, [logs]);

  if (loading) {
    return <LoadingSkeleton type="list" count={4} />;
  }

  if (sortedDates.length === 0) {
    return (
      <EmptyState
        type="empty"
        title="Sin registros de actividad"
        description="El alumno aún no ha registrado actividad diaria en su entrenamiento."
      />
    );
  }
  return (
    <div className="space-y-6 relative pl-4 border-l border-border/40 ml-3">
      {sortedDates.map((dateStr, idx) => {
        const dayLogs = grouped[dateStr];
        const completedCount = dayLogs.filter(l => l.completed).length;
        const total = dayLogs.length;
        const dateFormatted = format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es });
        const allCompleted = completedCount === total;

        return (
          <TimelineCard
            key={dateStr}
            title={dateFormatted}
            subtitle={`${completedCount} de ${total} ejercicios completados`}
            status={allCompleted ? "activo" : "default"}
            isLast={idx === sortedDates.length - 1}
          >
            <div className="space-y-3 mt-3">
              {dayLogs.map(log => {
                const setsMatch = log.actual_sets === log.planned_sets;
                const repsMatch = log.actual_reps === log.planned_reps;
                const weightMatch = log.actual_weight === log.planned_weight;

                return (
                  <div
                    key={log.id}
                    className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-secondary/10 border border-border/30"
                  >
                    <div className="flex items-center gap-3.5">
                      {log.completed ? (
                        <CheckCircle className="h-4.5 w-4.5 text-primary flex-shrink-0" />
                      ) : (
                        <XCircle className="h-4.5 w-4.5 text-destructive/60 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{log.exercise_name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                          {/* Planned */}
                          <span>
                            Programado: {log.planned_sets}×{log.planned_reps} · {log.planned_weight}kg
                          </span>
                          {/* Actual */}
                          {(log.actual_sets !== null || log.actual_reps !== null || log.actual_weight !== null) && (
                            <span className="text-muted-foreground/60">
                              Real:{" "}
                              <span className={!setsMatch ? "text-amber-500 font-bold" : "text-primary font-bold"}>
                                {log.actual_sets ?? "—"}
                              </span>
                              ×
                              <span className={!repsMatch ? "text-amber-500 font-bold" : "text-primary font-bold"}>
                                {log.actual_reps ?? "—"}
                              </span>
                              {" · "}
                              <span className={!weightMatch ? "text-amber-500 font-bold" : "text-primary font-bold"}>
                                {log.actual_weight ?? "—"}kg
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge
                        status={log.completed ? "completado" : "error"}
                        label={log.completed ? "✓ Hecho" : "✗ Faltó"}
                        className="scale-90"
                      />
                    </div>

                    {/* Notes */}
                    {log.notes && (
                      <div className="flex items-start gap-2 ml-8 p-2.5 rounded-lg bg-card/40 border border-border/30">
                        <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-muted-foreground font-semibold italic leading-relaxed">{log.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </TimelineCard>
        );
      })}

      {/* Load more */}
      {hasMore && (
        <Button
          variant="outline"
          className="w-full h-10 text-xs font-bold rounded-xl border-border/60 hover:bg-muted/10 gap-1.5 mt-2 shadow-sm"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <ChevronDown className="h-4.5 w-4.5" />
          )}
          Cargar más registros
        </Button>
      )}
    </div>
  );
}
