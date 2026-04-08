import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit, deleteDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Crown, 
  CreditCard, 
  Clock, 
  Bell,
  CheckCircle2, 
  XCircle,
  Plus,
  Edit,
  Trash2,
  Unlock,
  Lock,
  FileText,
  Loader2,
  ArrowUpCircle,
  ExternalLink,
  ChevronRight,
  ClipboardList,
  Flame // Added since Dumbbell use it
} from "lucide-react";
import { formatDistanceToNow, addDays, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { fetchStudentPendingSurveys } from "@/services/surveys";
import { TakeSurveyDialog } from "@/components/student/TakeSurveyDialog";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";
import { toast } from "sonner";

interface TrainerChange {
  id: string;
  change_type: string;
  description: string;
  created_at: string;
  entity_id?: string;
}

interface PendingSurvey {
  id: string;
  survey_id: string;
  survey?: {
    title: string;
  };
}

const CHANGE_CONFIG: Record<string, { icon: React.ElementType; label: string }> = {
  exercise_added: { icon: Plus, label: "Nuevo ejercicio" },
  exercise_updated: { icon: Edit, label: "Ejercicio actualizado" },
  exercise_removed: { icon: Trash2, label: "Ejercicio eliminado" },
  level_unlocked: { icon: Unlock, label: "Nivel desbloqueado" },
  level_locked: { icon: Lock, label: "Nivel bloqueado" },
  content_updated: { icon: FileText, label: "Contenido actualizado" },
};

export default function StudentDashboardPage() {
  const { user, displayName } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [notifications, setNotifications] = useState<TrainerChange[]>([]);
  const [pendingSurveys, setPendingSurveys] = useState<PendingSurvey[]>([]);
  const [activeSurvey, setActiveSurvey] = useState<PendingSurvey | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch Profile
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      setProfile(profileSnap.data());

      // Fetch trainer link
      const linksQuery = query(collection(db, "trainer_students"), where("student_id", "==", user.uid));
      const linksSnap = await getDocs(linksQuery);
      setStudentData(linksSnap.docs.length > 0 ? linksSnap.docs[0].data() : null);

      // Fetch trainer changes (notifications)
      const changesQuery = query(
        collection(db, "trainer_changes"), 
        where("student_id", "==", user.uid),
        orderBy("created_at", "desc"),
        limit(10)
      );
      const changesSnap = await getDocs(changesQuery);
      const rawChanges = changesSnap.docs.map(d => ({ id: d.id, ...d.data() } as TrainerChange));

      // Filter notifications using read state from localStorage
      const readIdsStr = localStorage.getItem(`read_notifications_${user.uid}`);
      const readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
      const activeNotifications = rawChanges.filter((n: any) => !readIds.includes(n.id));
      
      setNotifications(activeNotifications);

      // Pending surveys
      const surveysData = await fetchStudentPendingSurveys(user.uid);
      setPendingSurveys(surveysData || []);
    } catch (err) {
      console.error("Error fetching student dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasPlan = studentData?.plan_type || studentData?.plan_entrenamiento || studentData?.plan_alimentacion;
  const isPaid = studentData?.payment_status === "pagado";
  
  // Logic for next payment (mocking 30 days cycle from creation if no date exists)
  const nextPaymentDate = studentData?.routine_next_change_date 
    ? new Date(studentData.routine_next_change_date)
    : addDays(new Date(studentData?.created_at || new Date()), 30);
  
  const daysRemaining = Math.max(0, differenceInDays(nextPaymentDate, new Date()));

  return (
    <div className="container-responsive pb-24 space-y-8 animate-in fade-in duration-500">
      {/* PROFILE HEADER SECTION */}
      <div className="relative pt-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-64 bg-gradient-to-b from-primary/10 to-transparent rounded-[100%] opacity-50 -z-10" />
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <ProfilePhotoUpload 
              avatarUrl={profile?.avatar_url} 
              initials={displayName?.slice(0, 2).toUpperCase() || "??"} 
              onUploaded={(url) => setProfile(prev => ({ ...prev, avatar_url: url }))}
            />
            {isPaid && (
              <div className="absolute -bottom-1 -left-1 h-6 w-6 bg-primary rounded-full border-2 border-background flex items-center justify-center shadow-lg">
                <Crown className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-display font-black tracking-tight uppercase leading-none">{displayName}</h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em]">{hasPlan ? "Alumno Activo" : "Sin Plan Asignado"}</p>
              {pendingSurveys.length > 0 && (
                <Badge 
                  className="bg-amber-500/20 text-amber-500 border-amber-500/30 rounded-full text-[10px] font-black px-3 py-1 flex items-center gap-1.5 animate-bounce shadow-lg shadow-amber-500/10 cursor-pointer hover:bg-amber-500/30 transition-colors"
                  onClick={() => navigate("/student/surveys")}
                >
                  <ClipboardList className="h-3 w-3" />
                  TENER ENCUESTAS PENDIENTES
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* ROUTINE CHANGE ALERT */}
      {studentData?.routine_next_change_date && daysRemaining <= 7 && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <Card className="bg-amber-500/10 border-amber-500/20 shadow-lg shadow-amber-500/5 rounded-3xl">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                  <Clock className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight text-amber-500 leading-none mb-1">Cambio de Rutina Próximo</h4>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                    Tu entrenador renovará tu plan en {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
                  </p>
                </div>
              </div>
              <Badge className="bg-amber-500 text-black border-none font-black text-[10px] px-3 h-7 flex items-center">
                {daysRemaining <= 1 ? "PRONTO" : `${daysRemaining} DÍAS`}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PLAN & PAYMENT SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="card-premium border-white/5 bg-white/[0.02] shadow-xl hover:scale-[1.02] transition-transform duration-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground uppercase tracking-widest text-[10px] font-black">
                  <CreditCard className="h-3 w-3" />
                  <span>Estado de Suscripción</span>
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">
                    {isPaid ? "Mes Abonado" : "Pago Pendiente"}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {isPaid ? (
                      <Badge className="bg-primary/20 text-primary border-primary/20 rounded-full text-[10px] font-black px-2 py-0.5">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> AL DÍA
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/20 rounded-full text-[10px] font-black px-2 py-0.5">
                        <XCircle className="h-3 w-3 mr-1" /> PENDIENTE
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className={cn(
                "h-14 w-14 rounded-3xl flex items-center justify-center shadow-inner",
                isPaid ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              )}>
                <CreditCard className="h-7 w-7" />
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              className="w-full mt-6 btn-premium-outline h-10 gap-2 border-white/10 hover:border-primary/50 group"
              onClick={() => navigate("/student/plans")}
            >
              <ArrowUpCircle className="h-4 w-4 text-primary group-hover:scale-125 transition-transform" />
              <span className="uppercase font-black text-xs">Mejorar Plan</span>
            </Button>
          </CardContent>
        </Card>

        {isPaid ? (
          <Card className="card-premium border-white/5 bg-white/[0.02] shadow-xl hover:scale-[1.02] transition-transform duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-muted-foreground uppercase tracking-widest text-[10px] font-black">
                    <Clock className="h-3 w-3" />
                    <span>Próximo Vencimiento</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      {daysRemaining} Días
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 font-bold">
                      Faltan para tu próxima renovación
                    </p>
                  </div>
                </div>
                <div className="h-14 w-14 rounded-3xl bg-secondary/10 flex items-center justify-center text-secondary shadow-inner">
                  <Clock className="h-7 w-7" />
                </div>
              </div>
              
              <div className="mt-8 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-1000" 
                  style={{ width: `${Math.max(0, Math.min(100, (daysRemaining / 30) * 100))}%` }} 
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-premium border-destructive/20 bg-destructive/5 shadow-xl hover:scale-[1.02] transition-transform duration-300 flex flex-col justify-center">
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 bg-destructive/20 rounded-full flex items-center justify-center mx-auto text-destructive">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-tight text-destructive">Renovar mes</h3>
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-tight">
                  Tu suscripción ha vencido. <br />Contacta a tu entrenador para renovar.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* PLAN DETAILS LIST */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">Planes Activados</span>
          <div className="h-[1px] w-full bg-white/5" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {studentData?.plan_entrenamiento && (
            <Card className="bg-white/5 border-white/5 rounded-[1.5rem] p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                <Dumbbell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase">Entrenamiento</p>
                <p className="font-bold text-sm truncate uppercase tracking-tight">{studentData.plan_entrenamiento}</p>
              </div>
            </Card>
          )}
          {studentData?.plan_alimentacion && (
            <Card className="bg-white/5 border-white/5 rounded-[1.5rem] p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center text-accent border border-accent/20">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase">Nutrición</p>
                <p className="font-bold text-sm truncate uppercase tracking-tight">{studentData.plan_alimentacion}</p>
              </div>
            </Card>
          )}
          {!studentData?.plan_entrenamiento && !studentData?.plan_alimentacion && (
            <Card className="bg-white/5 border-white/5 rounded-[1.5rem] p-6 text-center col-span-full border-dashed">
              <p className="text-xs font-bold text-muted-foreground uppercase italic opacity-50">No tienes planes asignados actualmente</p>
            </Card>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS SECTION */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
              <Bell className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-display font-black tracking-tight uppercase">Novedades</h2>
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[9px] font-black uppercase text-muted-foreground hover:text-primary h-7 px-2"
                onClick={async () => {
                  const readIdsStr = localStorage.getItem(`read_notifications_${user?.uid}`);
                  const readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
                  const newReadIds = [...new Set([...readIds, ...notifications.map(n => n.id)])];
                  localStorage.setItem(`read_notifications_${user?.uid}`, JSON.stringify(newReadIds));
                  setNotifications([]);
                  toast.success("Notificaciones marcadas como leídas");
                }}
              >
                Limpiar todo
              </Button>
            )}
            <Badge variant="outline" className="rounded-full text-[9px] font-black uppercase text-muted-foreground border-white/10 px-3">
              Recientes
            </Badge>
          </div>
        </div>

        {notifications.length === 0 && pendingSurveys.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-[2rem] opacity-40">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-xs font-bold uppercase tracking-widest">Sin novedades por ahora</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingSurveys.map((survey) => (
              <Card 
                key={`survey-${survey.id}`} 
                className="card-premium border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all rounded-[2rem] p-5 cursor-pointer group"
                onClick={() => setActiveSurvey(survey)}
              >
                <CardContent className="p-0 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0 border border-primary/20">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Nueva Encuesta</span>
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </div>
                    <p className="text-[14px] font-bold text-white/90 leading-tight uppercase tracking-tight">
                      Tu entrenador te ha asignado la encuesta: {survey.survey?.title}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-10 w-10 text-primary hover:bg-primary/20">
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            ))}

            {notifications.map((change) => {
              const config = CHANGE_CONFIG[change.change_type] || { icon: Bell, label: "Aviso" };
              const Icon = config.icon;

              const handleDelete = async (e: React.MouseEvent) => {
                e.stopPropagation();
                try {
                  await deleteDoc(doc(db, "trainer_changes", change.id));
                  // Also mark as read in localStorage just in case it takes time to reflect
                  const readIdsStr = localStorage.getItem(`read_notifications_${user?.uid}`);
                  const readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
                  localStorage.setItem(`read_notifications_${user?.uid}`, JSON.stringify([...new Set([...readIds, change.id])]));
                  
                  setNotifications((prev) => prev.filter((n) => n.id !== change.id));
                  toast.success("Notificación eliminada");
                } catch (err) {
                  toast.error("Error al eliminar la notificación");
                }
              };

              const handleNavigate = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (change.change_type.startsWith("exercise")) {
                  navigate("/student/routines");
                } else if (change.change_type.startsWith("level") || change.change_type === "content_updated") {
                  navigate("/student/plans");
                }
              };

              return (
                <Card 
                  key={change.id} 
                  className="card-premium border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all rounded-[2rem] p-5 group relative"
                >
                  <CardContent className="p-0 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 pr-16">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">{config.label}</span>
                        <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">
                          {formatDistanceToNow(new Date(change.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <p className="text-[14px] font-bold text-white/90 leading-tight uppercase tracking-tight">
                        {change.description}
                      </p>
                    </div>

                    <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-white/5"
                        onClick={handleNavigate}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {activeSurvey && (
        <TakeSurveyDialog
          open={!!activeSurvey}
          onOpenChange={(v) => !v && setActiveSurvey(null)}
          surveyId={activeSurvey.survey_id}
          assignmentId={activeSurvey.id}
          onCompleted={() => {
            setActiveSurvey(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

const Dumbbell = (props: any) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6.5 6.5h11" />
    <path d="M6.5 17.5h11" />
    <path d="m3 21 18-18" />
    <path d="m3 3 18 18" />
  </svg>
);
