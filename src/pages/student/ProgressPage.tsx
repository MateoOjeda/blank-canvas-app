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
import { Target, Zap, Weight, TrendingUp, Dumbbell, Loader2, ClipboardList } from "lucide-react";
import { fetchStudentPendingSurveys } from "@/services/surveys";
import { useNavigate } from "react-router-dom";

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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasPendingSurveys, setHasPendingSurveys] = useState(false);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch Exercises
      const qEx = query(collection(db, "exercises"), where("student_id", "==", user.uid));
      const snapEx = await getDocs(qEx);
      const exData = snapEx.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));

      // Fetch Profile
      const profSnap = await getDoc(doc(db, "profiles", user.uid));
      
      // Fetch Plan Levels
      const qLevels = query(
        collection(db, "plan_levels"), 
        where("student_id", "==", user.uid), 
        where("unlocked", "==", true)
      );
      const snapLevels = await getDocs(qLevels);

      // Fetch Surveys
      const surveysData = await fetchStudentPendingSurveys(user.uid);

      setExercises(exData);
      if (profSnap.exists()) {
        setProfile(profSnap.data() as Profile);
      }
      setUnlockedCount(snapLevels.size);
      setHasPendingSurveys(surveysData && surveysData.length > 0);
    } catch (err) {
      console.error("Error fetching progress data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const completedToday = exercises.filter((e) => e.completed).length;
  const totalExercises = exercises.length;
  const completionRate = totalExercises > 0 ? Math.round((completedToday / totalExercises) * 100) : 0;

  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
  const dayStats = days.map((day) => {
    const dayExercises = exercises.filter((e) => e.day === day);
    const done = dayExercises.filter((e) => e.completed).length;
    return { day: day.substring(0, 3), total: dayExercises.length, done };
  });

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 pb-32 animate-in fade-in duration-750">
      {/* PROFILE HEADER SECTION */}
      <div className="relative pt-12 mb-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-64 bg-gradient-to-b from-primary/10 to-transparent rounded-[100%] opacity-50 -z-10" />
        
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <div className="h-32 w-32 rounded-full border-4 border-background shadow-2xl overflow-hidden bg-muted flex items-center justify-center">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name || ""} className="h-full w-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-muted-foreground">{profile?.display_name?.slice(0, 2).toUpperCase() || "?"}</span>
              )}
            </div>
            <div className="absolute bottom-1 right-1 h-8 w-8 bg-primary rounded-full border-4 border-background flex items-center justify-center shadow-lg">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-display font-black tracking-tight uppercase leading-none">{profile?.display_name || "Mi Progreso"}</h1>
            <div className="flex flex-col items-center gap-2">
              <p className="text-primary font-black text-[10px] uppercase tracking-[0.2em] opacity-80 whitespace-nowrap">Seguimiento de Desempeño</p>
              {hasPendingSurveys && (
                <Badge 
                  className="bg-amber-500/20 text-amber-500 border-amber-500/30 rounded-full text-[10px] font-black px-3 py-1 flex items-center gap-1.5 animate-bounce shadow-lg shadow-amber-500/10 cursor-pointer hover:bg-amber-500/30 transition-colors"
                  onClick={() => navigate("/student/surveys")}
                >
                  <ClipboardList className="h-3 w-3" />
                  ENCUESTAS PENDIENTES
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Ejercicios", value: totalExercises, sub: "Asignados", icon: Dumbbell, color: "text-blue-500" },
          { label: "Check-ins", value: completedToday, sub: "Completados", icon: Zap, color: "text-amber-500" },
          { label: "Peso", value: profile?.weight ? `${profile.weight} kg` : "—", sub: "Actual", icon: Weight, color: "text-emerald-500" },
          { label: "Nivel", value: `${unlockedCount}/12`, sub: "Evolución", icon: TrendingUp, color: "text-primary" }
        ].map((stat, i) => (
          <Card key={i} className="card-premium border-border/40 bg-card group hover:bg-card/80 transition-all duration-300 overflow-hidden">
            <CardContent className="p-5 flex flex-col items-center justify-center text-center relative">
              <div className={cn("mb-3 p-3 rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform duration-500", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-2xl font-black tracking-tighter uppercase text-foreground">{stat.value}</p>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1 opacity-60">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

        {/* Completion by day */}
        <Card className="card-premium border-border/40 bg-card/40 shadow-xl rounded-[2.5rem] overflow-hidden">
          <div className="p-6 border-b border-border/40 bg-muted/30">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Consistencia Semanal
            </h3>
          </div>
          <CardContent className="p-6 sm:p-8">
            <div className="grid grid-cols-7 gap-3 sm:gap-6">
              {dayStats.map((ds) => {
                const pct = ds.total > 0 ? Math.round((ds.done / ds.total) * 100) : 0;
                return (
                  <div key={ds.day} className="flex flex-col items-center gap-3 group">
                    <div className="relative w-full h-32 bg-muted/40 rounded-2xl overflow-hidden shadow-inner border border-border/40">
                      <div
                        className="absolute bottom-0 w-full bg-primary/10 transition-all duration-1000 ease-out"
                        style={{ height: `${pct}%` }}
                      />
                      <div
                        className="absolute bottom-0 w-full bg-primary shadow-lg shadow-primary/40 transition-all duration-1000 ease-out"
                        style={{ height: `${ds.total > 0 ? (ds.done / ds.total) * 100 : 0}%` }}
                      />
                      {pct === 100 && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 animate-bounce">
                          <Zap className="h-3 w-3 text-amber-400 fill-amber-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{ds.day}</p>
                      <p className={cn(
                        "text-[10px] font-bold mt-0.5 font-display",
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
          <div className="absolute inset-0 bg-primary/20 blur-[100px] opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
          <Card className="card-premium border-primary/20 bg-primary/5 py-12 relative overflow-hidden rounded-[3rem] shadow-2xl shadow-primary/10">
            <CardContent className="p-0 text-center relative z-10 space-y-6">
              <div className="h-20 w-20 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-primary/20 shadow-2xl shadow-primary/10 transition-transform duration-700 group-hover:rotate-[360deg]">
                <Zap className="h-10 w-10 text-primary fill-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-6xl font-display font-black tracking-tighter text-foreground leading-none">{completionRate}%</p>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.4em] font-display">Tasa de Efectividad</p>
              </div>
              <p className="text-sm text-muted-foreground max-w-[240px] mx-auto font-medium leading-relaxed italic px-4">
                {completionRate >= 80 ? "¡Estás en la zona elite! Mantén ese ritmo imparable. 🏆" : "Cada repetición cuenta para tu objetivo. ¡Sigue presionando! 💪"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
