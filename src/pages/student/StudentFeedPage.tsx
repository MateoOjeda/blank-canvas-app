import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
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
    <div className="container-responsive space-y-8 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold tracking-tight neon-text uppercase">Novedades</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Entérate de los últimos cambios de tu entrenador.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="btn-premium-outline h-10 px-6 gap-2 rounded-2xl shrink-0" 
            onClick={markAllRead}
          >
            <CheckCheck className="h-4 w-4" />
            <span className="uppercase tracking-tighter font-bold text-xs">Marcar leídos ({unreadCount})</span>
          </Button>
        )}
      </div>

      {changes.length === 0 ? (
        <Card className="card-premium border-white/5 bg-white/5 py-16">
          <CardContent className="p-0 text-center space-y-4">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-primary blur-2xl opacity-10 animate-pulse" />
              <Bell className="h-16 w-16 text-muted-foreground/30 mx-auto relative" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
              No tienes cambios recientes. Cuando tu entrenador actualice algo, lo verás aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
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
                className={cn(
                  "card-premium transition-all duration-500 overflow-hidden group",
                  isUnread ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/5" : "border-white/5 bg-white/5 opacity-60 grayscale-[0.5]"
                )}
              >
                <CardContent className="p-5 flex items-start gap-5">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-110",
                    isUnread ? "bg-primary/20 border-primary/20 text-primary shadow-inner" : "bg-white/5 border-white/5 text-muted-foreground"
                  )}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-3 py-0.5 border-0 rounded-full",
                          isUnread ? "badge-info-tag" : "bg-white/10 text-muted-foreground"
                        )}
                      >
                        {config.label}
                      </Badge>
                      {isUnread && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/20 rounded-full animate-in fade-in zoom-in duration-500">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Nuevo</span>
                        </div>
                      )}
                    </div>
                    <p className={cn(
                      "text-[15px] leading-relaxed tracking-tight",
                      isUnread ? "font-bold text-white/90" : "font-medium text-muted-foreground/80"
                    )}>
                      {change.description}
                    </p>
                    <p className="text-[10px] font-black text-muted-foreground/50 mt-3 uppercase tracking-widest">
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
