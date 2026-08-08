import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, ArrowRight, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import PhotoSessionsPanel from "@/components/trainer/tracking/PhotoSessionsPanel";

interface Transformation {
  id: string;
  before_photo_url: string | null;
  before_weight: number | null;
  before_date: string | null;
  after_photo_url: string | null;
  after_weight: number | null;
  after_date: string | null;
}

export default function TransformationPage() {
  const { user } = useAuth();
  const [legacyTransformation, setLegacyTransformation] = useState<Transformation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      const q = query(
        collection(db, "body_transformations"),
        where("student_id", "==", user.uid),
        orderBy("created_at", "desc"),
        limit(1)
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        setLegacyTransformation({ id: snap.docs[0].id, ...snap.docs[0].data() } as Transformation);
      }
    } catch (err) {
      console.error("Error fetching legacy transformation:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded-lg" />
        </div>
        <LoadingSkeleton type="card" count={2} />
      </div>
    );
  }

  const formatDate = (d: string | null) => d ? format(new Date(d), "dd MMM yyyy", { locale: es }) : "—";

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Mi Transformación</h1>
          <p className="text-sm text-muted-foreground mt-1">Registra y administra tus sesiones de fotos de progreso (Frente, Espalda y Perfiles)</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-full w-fit">
          <Camera className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Fotos de Progreso</span>
        </div>
      </div>

      {/* Main Student Photo Sessions Panel (student mode: readOnly = false) */}
      {user && (
        <PhotoSessionsPanel
          studentId={user.uid}
          readOnly={false}
        />
      )}

      {/* Legacy Transformation card if available */}
      {legacyTransformation && (legacyTransformation.before_photo_url || legacyTransformation.after_photo_url) && (
        <div className="space-y-3 pt-6 border-t border-border/40">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Registro Histórico Anterior
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {legacyTransformation.before_photo_url && (
              <Card className="border border-border/40 bg-card/60 rounded-xl overflow-hidden">
                <CardHeader className="p-3 border-b border-border/40">
                  <CardTitle className="text-xs font-bold">Antes ({formatDate(legacyTransformation.before_date)})</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <img src={legacyTransformation.before_photo_url} alt="Antes" className="w-full h-48 object-cover rounded-lg" />
                  {legacyTransformation.before_weight && (
                    <p className="text-xs text-muted-foreground mt-2">Peso: {legacyTransformation.before_weight} kg</p>
                  )}
                </CardContent>
              </Card>
            )}
            {legacyTransformation.after_photo_url && (
              <Card className="border border-border/40 bg-card/60 rounded-xl overflow-hidden">
                <CardHeader className="p-3 border-b border-border/40">
                  <CardTitle className="text-xs font-bold">Después ({formatDate(legacyTransformation.after_date)})</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <img src={legacyTransformation.after_photo_url} alt="Después" className="w-full h-48 object-cover rounded-lg" />
                  {legacyTransformation.after_weight && (
                    <p className="text-xs text-muted-foreground mt-2">Peso: {legacyTransformation.after_weight} kg</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
