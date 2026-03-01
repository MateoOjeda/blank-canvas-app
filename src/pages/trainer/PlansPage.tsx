import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Apple, Dumbbell, TrendingUp, User, ClipboardList, Loader2, Save, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

const PLAN_TYPES = [
  { key: "nutricion", label: "Plan de Nutrición", icon: Apple },
  { key: "entrenamiento", label: "Plan de Entrenamiento", icon: Dumbbell },
  { key: "cambios_fisicos", label: "Cambios Físicos", icon: TrendingUp },
  { key: "cambios_personales", label: "Cambios Personales", icon: User },
];

const LEVELS = ["principiante", "intermedio", "avanzado"];
const LEVEL_LABELS: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

interface PlanLevel {
  id: string;
  plan_type: string;
  level: string;
  content: string;
  unlocked: boolean;
}

export default function PlansPage() {
  const { user } = useAuth();
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [planLevels, setPlanLevels] = useState<PlanLevel[]>([]);
  const [loadingLevels, setLoadingLevels] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0].user_id);
    }
  }, [students, selectedStudent]);

  const fetchPlanLevels = useCallback(async () => {
    if (!user || !selectedStudent) return;
    setLoadingLevels(true);
    const { data } = await supabase
      .from("plan_levels")
      .select("id, plan_type, level, content, unlocked")
      .eq("trainer_id", user.id)
      .eq("student_id", selectedStudent);
    setPlanLevels(data || []);
    setLoadingLevels(false);
  }, [user, selectedStudent]);

  useEffect(() => {
    fetchPlanLevels();
  }, [fetchPlanLevels]);

  const toggleUnlock = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("plan_levels")
      .update({ unlocked: !current })
      .eq("id", id);
    if (error) toast.error("Error al actualizar");
    else {
      const level = planLevels.find((p) => p.id === id);
      setPlanLevels((prev) => prev.map((p) => (p.id === id ? { ...p, unlocked: !current } : p)));
      // Log change
      if (level) {
        const typeLabel = PLAN_TYPES.find((pt) => pt.key === level.plan_type)?.label || level.plan_type;
        await supabase.from("trainer_changes").insert({
          trainer_id: user!.id,
          student_id: selectedStudent,
          change_type: !current ? "level_unlocked" : "level_locked",
          description: `${typeLabel} - ${LEVEL_LABELS[level.level]} ${!current ? "desbloqueado" : "bloqueado"}`,
          entity_id: id,
        });
      }
      toast.success(!current ? "Nivel desbloqueado" : "Nivel bloqueado");
    }
  };

  const updateContent = (id: string, content: string) => {
    setPlanLevels((prev) => prev.map((p) => (p.id === id ? { ...p, content } : p)));
  };

  const saveContent = async (id: string) => {
    setSaving(id);
    const level = planLevels.find((p) => p.id === id);
    if (!level) return;
    const { error } = await supabase
      .from("plan_levels")
      .update({ content: level.content })
      .eq("id", id);
    if (error) {
      toast.error("Error al guardar");
    } else {
      const typeLabel = PLAN_TYPES.find((pt) => pt.key === level.plan_type)?.label || level.plan_type;
      await supabase.from("trainer_changes").insert({
        trainer_id: user!.id,
        student_id: selectedStudent,
        change_type: "content_updated",
        description: `Contenido actualizado: ${typeLabel} - ${LEVEL_LABELS[level.level]}`,
        entity_id: id,
      });
      toast.success("Contenido guardado");
    }
    setSaving(null);
  };

  if (loadingStudents) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Gestión de Planes</h1>
          <p className="text-muted-foreground text-sm mt-1">Contenido y niveles por alumno</p>
        </div>
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <ClipboardList className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Vincula alumnos primero para gestionar sus planes.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Gestión de Planes</h1>
        <p className="text-muted-foreground text-sm mt-1">Contenido y niveles por alumno</p>
      </div>

      <div className="max-w-xs">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Alumno</Label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue placeholder="Seleccionar alumno" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingLevels ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="nutricion" className="space-y-4">
          <TabsList className="bg-secondary/50 w-full justify-start overflow-x-auto">
            {PLAN_TYPES.map((pt) => (
              <TabsTrigger key={pt.key} value={pt.key} className="gap-2 text-xs">
                <pt.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{pt.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {PLAN_TYPES.map((pt) => (
            <TabsContent key={pt.key} value={pt.key} className="space-y-4">
              {LEVELS.map((level) => {
                const pl = planLevels.find((p) => p.plan_type === pt.key && p.level === level);
                if (!pl) return null;
                return (
                  <Card key={pl.id} className={`card-glass transition-all ${pl.unlocked ? "neon-border" : "opacity-70"}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${pl.unlocked ? "bg-primary/15" : "bg-secondary"}`}>
                            {pl.unlocked ? <Unlock className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          <div>
                            <CardTitle className="text-sm">{LEVEL_LABELS[level]}</CardTitle>
                            <Badge variant="outline" className={`text-[10px] ${pl.unlocked ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
                              {pl.unlocked ? "Desbloqueado" : "Bloqueado"}
                            </Badge>
                          </div>
                        </div>
                        <Switch checked={pl.unlocked} onCheckedChange={() => toggleUnlock(pl.id, pl.unlocked)} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        placeholder={`Escribe el contenido de ${pt.label} - ${LEVEL_LABELS[level]}...`}
                        value={pl.content}
                        onChange={(e) => updateContent(pl.id, e.target.value)}
                        className="bg-secondary/30 border-border min-h-[100px] text-sm"
                      />
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => saveContent(pl.id)} disabled={saving === pl.id}>
                        {saving === pl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                        Guardar
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
