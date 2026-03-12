import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Camera, FileText, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  related_id: string | null;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  transformation: Camera,
  survey: FileText,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read).map(n => n.id);
    if (unread.length === 0) return;
    await supabase.from("notifications").update({ read: true } as any).in("id", unread);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success("Todas marcadas como leídas");
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("user_id", user.id);
    setNotifications([]);
    toast.success("Notificaciones eliminadas");
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Notificaciones</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} sin leer` : "Todo al día"}
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-1" onClick={markAllRead}>
              <CheckCheck className="h-3 w-3" /> Leer todo
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={clearAll}>
              <Trash2 className="h-3 w-3" /> Limpiar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No hay notificaciones aún.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = TYPE_ICONS[n.type] || Bell;
            return (
              <Card
                key={n.id}
                className={`card-glass transition-all ${!n.read ? "border-primary/30" : "opacity-70"}`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${!n.read ? "bg-primary/10" : "bg-muted/30"}`}>
                    <Icon className={`h-4 w-4 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {!n.read && <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">Nueva</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
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
