import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Dumbbell,
  Apple,
  TrendingUp,
  User,
  Lock,
  Unlock,
  FileText,
  Trash2,
  Plus,
  Edit,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface TrainerChange {
  id: string;
  change_type: string;
  description: string;
  created_at: string;
  entity_id: string | null;
}

const CHANGE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  exercise_added: { icon: Plus, color: "text-green-400", label: "Nuevo ejercicio" },
  exercise_updated: { icon: Edit, color: "text-amber-400", label: "Ejercicio actualizado" },
  exercise_removed: { icon: Trash2, color: "text-red-400", label: "Ejercicio eliminado" },
  level_unlocked: { icon: Unlock, color: "text-green-400", label: "Nivel desbloqueado" },
  level_locked: { icon: Lock, color: "text-red-400", label: "Nivel bloqueado" },
  content_updated: { icon: FileText, color: "text-blue-400", label: "Contenido actualizado" },
};

export default function StudentFeedPage() {
  const { user } = useAuth();
  const [changes, setChanges] = useState<TrainerChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastReadAt, setLastReadAt] = useState<string | null>(null);

  const fetchChanges = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [{ data: changesData }, { data: readingData }] = await Promise.all([
      supabase
        .from("trainer_changes")
        .select("id, change_type, description, created_at, entity_id")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("change_readings")
        .select("last_read_at")
        .eq("student_id", user.id)
        .maybeSingle(),
    ]);

    setChanges(changesData || []);
    setLastReadAt(readingData?.last_read_at || null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchChanges();
  }, [fetchChanges]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("student-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trainer_changes", filter: `student_id=eq.${user.id}` },
        (payload) => {
          setChanges((prev) => [payload.new as TrainerChange, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    await supabase
      .from("change_readings")
      .upsert({ student_id: user.id, last_read_at: now }, { onConflict: "student_id" });
    setLastReadAt(now);
  };

  const unreadCount = lastReadAt
    ? changes.filter((c) => new Date(c.created_at) > new Date(lastReadAt)).length
    : changes.length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Novedades</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cambios recientes de tu entrenador
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4" />
            Marcar todo como leído ({unreadCount})
          </Button>
        )}
      </div>

      {changes.length === 0 ? (
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No tienes cambios recientes. Cuando tu entrenador modifique tu rutina o planes, aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {changes.map((change) => {
            const config = CHANGE_CONFIG[change.change_type] || {
              icon: Bell,
              color: "text-muted-foreground",
              label: change.change_type,
            };
            const Icon = config.icon;
            const isUnread = lastReadAt
              ? new Date(change.created_at) > new Date(lastReadAt)
              : true;

            return (
              <Card
                key={change.id}
                className={`card-glass transition-all ${isUnread ? "neon-border" : "opacity-70"}`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isUnread ? "bg-primary/15" : "bg-secondary"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isUnread ? config.color : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isUnread
                            ? "border-primary/40 text-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {config.label}
                      </Badge>
                      {isUnread && (
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className={`text-sm ${isUnread ? "font-medium" : "text-muted-foreground"}`}>
                      {change.description}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(change.created_at), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
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
