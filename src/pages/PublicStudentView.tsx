import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Dumbbell, Calendar, User, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PublicStudentView() {
  const { studentId } = useParams<{ studentId: string }>();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [routine, setRoutine] = useState<any[]>([]);
  const [dayConfigs, setDayConfigs] = useState<any>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!studentId) return;
      try {
        setLoading(true);
        // Fetch Profile
        const profileSnap = await getDoc(doc(db, "profiles", studentId));
        if (!profileSnap.exists()) {
          setError("No se encontró el perfil del alumno.");
          setLoading(false);
          return;
        }
        setProfile(profileSnap.data());

        // Fetch Exercises
        const qEx = query(collection(db, "exercises"), where("student_id", "==", studentId));
        const exSnap = await getDocs(qEx);
        setRoutine(exSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch Day Configs
        const qDay = query(collection(db, "routine_day_config"), where("student_id", "==", studentId));
        const daySnap = await getDocs(qDay);
        const configs: any = {};
        daySnap.docs.forEach(d => {
          const data = d.data();
          configs[data.day] = data;
        });
        setDayConfigs(configs);

      } catch (err) {
        console.error(err);
        setError("Error al cargar los datos.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground animate-pulse font-medium">Cargando tu entrenamiento...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <User className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">¡Ups! Algo salió mal</h1>
        <p className="text-muted-foreground max-w-sm">{error || "No pudimos encontrar la información solicitada."}</p>
      </div>
    );
  }

  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      {/* Header Premium */}
      <div className="relative overflow-hidden bg-secondary/30 border-b border-white/5 py-12 px-4 shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/10 rounded-full blur-3xl -ml-24 -mb-24" />
        
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center space-y-4">
          <div className="h-24 w-24 rounded-full border-4 border-primary/20 p-1 bg-background shadow-xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="h-full w-full rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {profile.display_name?.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight uppercase" style={{ fontFamily: 'Orbitron' }}>{profile.display_name}</h1>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Alumno de CipriFitness</Badge>
              <Badge variant="outline" className="bg-secondary/50 text-muted-foreground border-white/5">Vista Pública</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        {/* Routine Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Dumbbell className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Tu Rutina de Entrenamiento</h2>
          </div>

          <div className="grid gap-6">
            {days.map(day => {
              const exercises = routine.filter(ex => ex.day === day);
              const config = dayConfigs[day];
              
              if (exercises.length === 0 && (!config?.body_part_1)) return null;

              return (
                <Card key={day} className="border-white/5 bg-white/[0.02] overflow-hidden shadow-lg hover:border-primary/30 transition-all duration-300 group">
                  <CardHeader className="bg-secondary/20 py-4 px-6 border-b border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        <CardTitle className="text-lg font-bold uppercase tracking-widest">{day}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        {config?.body_part_1 && <Badge className="bg-primary/20 text-primary border-0 font-bold">{config.body_part_1}</Badge>}
                        {config?.body_part_2 && <Badge className="bg-accent/20 text-accent border-0 font-bold">{config.body_part_2}</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {exercises.length > 0 ? (
                      <div className="divide-y divide-white/5">
                        {exercises.map((ex, idx) => (
                          <div key={ex.id} className="p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                            <div className="flex gap-4 items-center">
                              <span className="text-xs font-black text-muted-foreground/30 w-4">{idx + 1}</span>
                              <div className="space-y-0.5">
                                <p className="font-bold text-sm uppercase tracking-tight">{ex.name}</p>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> {ex.sets} Series</span>
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-accent" /> {ex.reps} Reps</span>
                                  {ex.weight > 0 && <span className="bg-secondary px-1.5 py-0.5 rounded text-white">{ex.weight} KG</span>}
                                </div>
                              </div>
                            </div>
                            {ex.exercise_type !== "NORMAL" && (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-black">{ex.exercise_type}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-white/[0.01]">
                        <p className="text-xs font-bold text-muted-foreground uppercase italic opacity-50">Día de descanso o sin ejercicios asignados</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-12 text-center opacity-30 border-t border-white/5">
          <p className="text-[10px] font-black uppercase tracking-[0.3em]">CipriFitness Training System</p>
        </div>
      </div>
    </div>
  );
}
