import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  onSnapshot,
  limit
} from "firebase/firestore";
import { Loader2, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import PlanCard from "@/components/student/PlanCard";
import PlanLevelDetail from "@/components/student/PlanLevelDetail";
import { PLAN_TYPES } from "@/lib/planConstants";

interface GlobalPlan {
  id: string;
  plan_type: string;
  level: string;
  price: number;
  content: string;
  active: boolean;
}

interface PlanLevel {
  id: string;
  plan_type: string;
  level: string;
  unlocked: boolean;
}

interface TrainerInfo {
  mercadopago_alias: string;
  whatsapp_number: string;
  display_name: string;
}

export default function MyPlansPage() {
  const { user } = useAuth();
  const [globalPlans, setGlobalPlans] = useState<GlobalPlan[]>([]);
  const [planLevels, setPlanLevels] = useState<PlanLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [trainerInfo, setTrainerInfo] = useState<TrainerInfo | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Get student's linked trainer
      const qLinks = query(collection(db, "trainer_students"), where("student_id", "==", user.uid), limit(1));
      const snapLinks = await getDocs(qLinks);

      if (snapLinks.empty) {
        setLoading(false);
        return;
      }

      const trainerId = snapLinks.docs[0].data().trainer_id;

      // Fetch Global Plans
      const qGlobal = query(collection(db, "global_plans"), where("trainer_id", "==", trainerId));
      const snapGlobal = await getDocs(qGlobal);
      setGlobalPlans(snapGlobal.docs.map(d => ({ id: d.id, ...d.data() } as GlobalPlan)));

      // Fetch Plan Levels for student
      const qLevels = query(
        collection(db, "plan_levels"), 
        where("student_id", "==", user.uid), 
        where("trainer_id", "==", trainerId)
      );
      const snapLevels = await getDocs(qLevels);
      setPlanLevels(snapLevels.docs.map(d => ({ id: d.id, ...d.data() } as PlanLevel)));

      // Fetch Trainer Profile
      const profSnap = await getDoc(doc(db, "profiles", trainerId));
      if (profSnap.exists()) {
        setTrainerInfo(profSnap.data() as TrainerInfo);
      }
    } catch (err) {
      console.error("Error fetching plans data:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates with onSnapshot
  useEffect(() => {
    if (!user) return;
    
    // Listen for global_plans (ideally scoped by trainer, but for now we listen and re-fetch)
    const unsubGlobal = onSnapshot(collection(db, "global_plans"), () => fetchData());
    const unsubLevels = onSnapshot(
      query(collection(db, "plan_levels"), where("student_id", "==", user.uid)), 
      () => fetchData()
    );

    return () => {
      unsubGlobal();
      unsubLevels();
    };
  }, [user, fetchData]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Build merged plan levels
  const mergedLevels = globalPlans.length > 0 
    ? globalPlans.map((gp) => {
        const studentLevel = planLevels.find((pl) => pl.plan_type === gp.plan_type && pl.level === gp.level);
        return {
          id: gp.id,
          plan_type: gp.plan_type,
          level: gp.level,
          content: gp.content,
          unlocked: studentLevel?.unlocked ?? false,
          price: gp.price,
          active: gp.active,
        };
      })
    : planLevels.map((pl) => ({
        id: pl.id,
        plan_type: pl.plan_type,
        level: pl.level,
        content: "Contenido del plan disponible de manera predeterminada.",
        unlocked: pl.unlocked,
        price: 0,
        active: true,
      }));

  if (mergedLevels.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">Mis Planes</h1>
          <p className="text-muted-foreground text-sm mt-1">Planes asignados por tu entrenador</p>
        </div>
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aún no tienes planes asignados. Tu entrenador los configurará pronto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activePlanType = PLAN_TYPES.find((pt) => pt.key === selectedPlan);

  if (activePlanType) {
    const trainerPrices: Record<string, number> = {};
    globalPlans.forEach((gp) => {
      trainerPrices[`${gp.plan_type}-${gp.level}`] = gp.price;
    });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">Mis Planes</h1>
          <p className="text-muted-foreground text-sm mt-1">Contenido desbloqueado por tu entrenador</p>
        </div>
        <PlanLevelDetail
          planType={activePlanType}
          planLevels={mergedLevels}
          trainerInfo={trainerInfo}
          trainerPrices={trainerPrices}
          onBack={() => setSelectedPlan(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">Mis Planes</h1>
        <p className="text-muted-foreground text-sm mt-1">Seleccioná un plan para ver los niveles disponibles</p>
      </div>
      <div className="space-y-3">
        {PLAN_TYPES.map((pt) => {
          const levels = mergedLevels.filter((p) => p.plan_type === pt.key && p.active);
          return (
            <PlanCard
              key={pt.key}
              label={pt.label}
              description={pt.description}
              icon={pt.icon}
              planLevels={levels}
              onClick={() => setSelectedPlan(pt.key)}
            />
          );
        })}
      </div>
    </div>
  );
}
