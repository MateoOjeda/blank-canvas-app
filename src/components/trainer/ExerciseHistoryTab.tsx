import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Dumbbell, Loader2, MessageSquare, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

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

const PAGE_SIZE = 7; // days

export default function ExerciseHistoryTab({ studentId }: Props) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = useCallback(async (currentOffset: number, append = false) => {
    if (!user) return;
    
    // Get distinct dates first
    const { data: dateData } = await supabase
      .from("exercise_logs")
      .select("log_date")
      .eq("student_id", studentId)
      .eq("trainer_id", user.id)
      .order("log_date", { ascending: false });

    if (!dateData || dateData.length === 0) {
      if (!append) setLogs([]);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Get unique dates
    const uniqueDates = [...new Set(dateData.map(d => d.log_date))];
    const pageDates = uniqueDates.slice(currentOffset, currentOffset + PAGE_SIZE);
    
    if (pageDates.length === 0) {
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    setHasMore(currentOffset + PAGE_SIZE < uniqueDates.length);

    // Fetch logs for those dates
    const { data: logData } = await supabase
      .from("exercise_logs")
      .select("id, exercise_id, log_date, completed, actual_sets, actual_reps, actual_weight, notes")
      .eq("student_id", studentId)
      .eq("trainer_id", user.id)
      .in("log_date", pageDates)
      .order("log_date", { ascending: false });

    if (!logData) {
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Get exercise details
    const exerciseIds = [...new Set(logData.map(l => l.exercise_id))];
    const { data: exerciseData } = await supabase
      .from("exercises")
      .select("id, name, sets, reps, weight, day")
      .in("id", exerciseIds);

    const exerciseMap = new Map(exerciseData?.map(e => [e.id, e]) || []);

    const enriched: ExerciseLog[] = logData.map(log => {
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
    setLoading(false);
    setLoadingMore(false);
  }, [user, studentId]);

  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`trainer-exercise-logs-${studentId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "exercise_logs",
        filter: `student_id=eq.${studentId}`,
      }, () => {
        setOffset(0);
        fetchLogs(0);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, studentId, fetchLogs]);

  const loadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    setLoadingMore(true);
    fetchLogs(newOffset, true);
  };

  // Group by date
  const grouped = logs.reduce<Record<string, ExerciseLog[]>>((acc, log) => {
    const key = log.log_date;
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (sortedDates.length === 0) {
    return (
      <Card className="card-glass">
        <CardContent className="py-8 text-center space-y-2">
          <Dumbbell className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">El alumno aún no ha registrado actividad diaria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedDates.map(dateStr => {
        const dayLogs = grouped[dateStr];
        const completedCount = dayLogs.filter(l => l.completed).length;
        const total = dayLogs.length;
        const dateFormatted = format(parseISO(dateStr), "EEEE d 'de' MMMM", { locale: es });

        return (
          <Card key={dateStr} className="card-glass">
            <CardContent className="p-4 space-y-3">
              {/* Date header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold capitalize">{dateFormatted}</h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] gap-1 ${
                    completedCount === total
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {completedCount}/{total} completados
                </Badge>
              </div>

              {/* Exercises */}
              <div className="space-y-2">
                {dayLogs.map(log => {
                  const setsMatch = log.actual_sets === log.planned_sets;
                  const repsMatch = log.actual_reps === log.planned_reps;
                  const weightMatch = log.actual_weight === log.planned_weight;

                  return (
                    <div
                      key={log.id}
                      className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/30"
                    >
                      <div className="flex items-center gap-3">
                        {log.completed ? (
                          <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive/60 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{log.exercise_name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {/* Planned */}
                            <span className="text-[10px] text-muted-foreground">
                              Programado: {log.planned_sets}×{log.planned_reps} · {log.planned_weight}kg
                            </span>
                            {/* Actual */}
                            {(log.actual_sets !== null || log.actual_reps !== null || log.actual_weight !== null) && (
                              <span className="text-[10px]">
                                Real:{" "}
                                <span className={!setsMatch ? "text-warning font-semibold" : "text-primary"}>
                                  {log.actual_sets ?? "—"}
                                </span>
                                ×
                                <span className={!repsMatch ? "text-warning font-semibold" : "text-primary"}>
                                  {log.actual_reps ?? "—"}
                                </span>
                                {" · "}
                                <span className={!weightMatch ? "text-warning font-semibold" : "text-primary"}>
                                  {log.actual_weight ?? "—"}kg
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] flex-shrink-0 ${
                            log.completed ? "border-primary/40 text-primary" : "border-destructive/30 text-destructive"
                          }`}
                        >
                          {log.completed ? "✓ Hecho" : "✗ Faltó"}
                        </Badge>
                      </div>

                      {/* Notes */}
                      {log.notes && (
                        <div className="flex items-start gap-2 ml-7 p-2 rounded bg-background/50">
                          <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-[11px] text-muted-foreground italic">{log.notes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Load more */}
      {hasMore && (
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          Cargar más días
        </Button>
      )}
    </div>
  );
}
