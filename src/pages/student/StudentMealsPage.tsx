import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Loader2 } from "lucide-react";
import MealsTab from "@/components/trainer/MealsTab";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

export default function StudentMealsPage() {
  const { user } = useAuth();
  const [nutritionLevel, setNutritionLevel] = useState<string>("principiante");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLevel() {
      if (!user) return;
      
      try {
        const q = query(
          collection(db, "plan_levels"),
          where("student_id", "==", user.uid),
          where("plan_type", "==", "nutricion"),
          where("unlocked", "==", true),
          limit(1)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setNutritionLevel(snap.docs[0].data().level);
        }
      } catch (err) {
        console.error("Error fetching nutrition level:", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLevel();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 sm:p-6 pb-32 animate-in fade-in duration-750">
      <div className="mb-10 text-center sm:text-left relative">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 mb-3 relative z-10">
          <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter uppercase italic">
            Mis <span className="text-primary italic-none">Comidas</span>
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full w-fit mx-auto sm:mx-0">
            <Sparkles className="h-3 w-3 text-primary animate-pulse" />
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Plan Nutricional</span>
          </div>
        </div>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto sm:mx-0 font-medium leading-relaxed">
          Sigue tu plan de alimentación diseñado para maximizar tus resultados y mantener tu energía al máximo.
        </p>
      </div>

      {user && (
        <MealsTab studentId={user.uid} nutritionLevel={nutritionLevel} readOnly={true} />
      )}
    </div>
  );
}
