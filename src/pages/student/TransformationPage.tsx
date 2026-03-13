import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, ImageIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const [transformation, setTransformation] = useState<Transformation | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);
  const [beforeWeight, setBeforeWeight] = useState("");
  const [afterWeight, setAfterWeight] = useState("");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("body_transformations")
      .select("*")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single() as any;
    
    if (data) {
      setTransformation(data);
      if (data.before_weight) setBeforeWeight(String(data.before_weight));
      if (data.after_weight) setAfterWeight(String(data.after_weight));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const uploadPhoto = async (type: "before" | "after", file: File) => {
    if (!user) return;
    setUploading(type);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${type}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("transformations")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Error al subir la foto");
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("transformations").getPublicUrl(path);
    const photoUrl = urlData.publicUrl;
    const weight = type === "before" ? parseFloat(beforeWeight) || null : parseFloat(afterWeight) || null;

    if (transformation) {
      const updateData: any = {
        [`${type}_photo_url`]: photoUrl,
        [`${type}_weight`]: weight,
        [`${type}_date`]: new Date().toISOString(),
      };
      await supabase.from("body_transformations").update(updateData).eq("id", transformation.id) as any;
    } else {
      const insertData: any = {
        student_id: user.id,
        [`${type}_photo_url`]: photoUrl,
        [`${type}_weight`]: weight,
        [`${type}_date`]: new Date().toISOString(),
      };
      await supabase.from("body_transformations").insert(insertData) as any;
    }

    // Notify linked trainers
    const { data: links } = await supabase
      .from("trainer_students")
      .select("trainer_id")
      .eq("student_id", user.id);

    if (links && links.length > 0) {
      const notifications = links.map((link) => ({
        user_id: link.trainer_id,
        type: "transformation",
        title: "Foto de progreso actualizada",
        message: `Un alumno ha subido su foto "${type === "before" ? "Antes" : "Después"}"`,
        related_id: user.id,
      }));
      await supabase.from("notifications").insert(notifications) as any;
    }

    toast.success("Foto guardada correctamente");
    setUploading(null);
    fetchData();
  };

  const handleFileChange = (type: "before" | "after") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no puede superar 5MB");
        return;
      }
      uploadPhoto(type, file);
    }
  };

  const saveWeight = async (type: "before" | "after") => {
    if (!transformation) return;
    const weight = type === "before" ? parseFloat(beforeWeight) : parseFloat(afterWeight);
    if (!weight) return;
    await supabase.from("body_transformations")
      .update({ [`${type}_weight`]: weight } as any)
      .eq("id", transformation.id);
    toast.success("Peso actualizado");
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const formatDate = (d: string | null) => d ? format(new Date(d), "dd MMM yyyy", { locale: es }) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Evolución Visual</h1>
        <p className="text-muted-foreground text-sm mt-1">Sube tus fotos de progreso para comparar tu antes y después</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Before */}
        <Card className="card-glass neon-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Antes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-[3/4] rounded-lg bg-secondary/30 overflow-hidden flex items-center justify-center">
              {transformation?.before_photo_url ? (
                <img src={transformation.before_photo_url} alt="Antes" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Sin foto</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={beforeWeight}
                    onChange={(e) => setBeforeWeight(e.target.value)}
                    placeholder="Peso"
                    className="bg-secondary/50 border-border h-8 text-sm"
                  />
                  {transformation && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => saveWeight("before")}>
                      OK
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {formatDate(transformation?.before_date || null)}
              </div>
            </div>
            <label className="block">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange("before")} />
              <Button variant="outline" className="w-full" asChild disabled={uploading === "before"}>
                <span className="cursor-pointer">
                  {uploading === "before" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                  {transformation?.before_photo_url ? "Cambiar foto" : "Subir foto Antes"}
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>

        {/* After */}
        <Card className="card-glass neon-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" /> Después
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-[3/4] rounded-lg bg-secondary/30 overflow-hidden flex items-center justify-center">
              {transformation?.after_photo_url ? (
                <img src={transformation.after_photo_url} alt="Después" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Sin foto</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Peso (kg)</Label>
                <div className="flex gap-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={afterWeight}
                    onChange={(e) => setAfterWeight(e.target.value)}
                    placeholder="Peso"
                    className="bg-secondary/50 border-border h-8 text-sm"
                  />
                  {transformation && (
                    <Button size="sm" variant="outline" className="h-8" onClick={() => saveWeight("after")}>
                      OK
                    </Button>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {formatDate(transformation?.after_date || null)}
              </div>
            </div>
            <label className="block">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange("after")} />
              <Button variant="outline" className="w-full" asChild disabled={uploading === "after"}>
                <span className="cursor-pointer">
                  {uploading === "after" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Camera className="h-4 w-4 mr-2" />}
                  {transformation?.after_photo_url ? "Cambiar foto" : "Subir foto Después"}
                </span>
              </Button>
            </label>
          </CardContent>
        </Card>
      </div>

      {transformation?.before_photo_url && transformation?.after_photo_url && (
        <Card className="card-glass neon-border neon-glow">
          <CardContent className="p-6 text-center">
            <div className="flex items-center justify-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">{transformation.before_weight || "—"} kg</p>
                <p className="text-xs text-muted-foreground">{formatDate(transformation.before_date)}</p>
              </div>
              <ArrowRight className="h-6 w-6 text-primary" />
              <div className="text-left">
                <p className="text-2xl font-bold text-primary">{transformation.after_weight || "—"} kg</p>
                <p className="text-xs text-muted-foreground">{formatDate(transformation.after_date)}</p>
              </div>
            </div>
            {transformation.before_weight && transformation.after_weight && (
              <p className="text-sm text-muted-foreground mt-3">
                Diferencia: <span className="font-bold text-primary">
                  {(transformation.after_weight - transformation.before_weight).toFixed(1)} kg
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
