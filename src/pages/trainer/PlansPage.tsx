import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Lock, Unlock, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { PLAN_TYPES, LEVELS, LEVEL_LABELS, DEFAULT_PRICES, formatPrice } from "@/lib/planConstants";

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
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) setSelectedStudent(students[0].user_id);
  }, [students, selectedStudent]);

  const fetchPlanLevels = useCallback(async () => {
    if (!user || !selectedStudent) return;
    setLoadingLevels(true);
    const { data } = await supabase
      .from("plan_levels")
      .select("id, plan_type, level, content, unlocked")
      .eq("trainer_id", user.id)
      .eq("student_id", selectedStudent);

    // Auto-create missing plan_levels for this student
    if (!data || data.length === 0) {
      const rows = PLAN_TYPES.flatMap((pt) =>
        LEVELS.map((level) => ({
          trainer_id: user.id,
          student_id: selectedStudent,
          plan_type: pt.key,
          level,
          content: "",
          unlocked: false,
        }))
      );
      const { data: inserted } = await supabase
        .from("plan_levels")
        .insert(rows)
        .select("id, plan_type, level, content, unlocked");
      setPlanLevels(inserted || []);
    } else if (data.length < PLAN_TYPES.length * LEVELS.length) {
      // Fill in any missing combinations
      const existing = new Set(data.map((d) => `${d.plan_type}-${d.level}`));
      const missing = PLAN_TYPES.flatMap((pt) =>
        LEVELS.filter((level) => !existing.has(`${pt.key}-${level}`)).map((level) => ({
          trainer_id: user.id,
          student_id: selectedStudent,
          plan_type: pt.key,
          level,
          content: "",
          unlocked: false,
        }))
      );
      if (missing.length > 0) {
        const { data: inserted } = await supabase
          .from("plan_levels")
          .insert(missing)
          .select("id, plan_type, level, content, unlocked");
        setPlanLevels([...data, ...(inserted || [])]);
      } else {
        setPlanLevels(data);
      }
    } else {
      setPlanLevels(data);
    }
    setLoadingLevels(false);
  }, [user, selectedStudent]);

  useEffect(() => { fetchPlanLevels(); }, [fetchPlanLevels]);

  const toggleUnlock = async (id: string, current: boolean) => {
    const { error } = await supabase.from("plan_levels").update({ unlocked: !current }).eq("id", id);
    if (error) { toast.error("Error al actualizar"); return; }
    const level = planLevels.find((p) => p.id === id);
    setPlanLevels((prev) => prev.map((p) => (p.id === id ? { ...p, unlocked: !current } : p)));
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
  };

  const updateContent = (id: string, content: string) => {
    setPlanLevels((prev) => prev.map((p) => (p.id === id ? { ...p, content } : p)));
  };

  const saveContent = async (id: string) => {
    setSaving(id);
    const level = planLevels.find((p) => p.id === id);
    if (!level) return;
    const { error } = await supabase.from("plan_levels").update({ content: level.content }).eq("id", id);
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
        <p className="text-muted-foreground text-sm mt-1">Editá contenido, precios y desbloquea niveles por alumno</p>
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
        <div className="space-y-4">
          {PLAN_TYPES.map((pt) => {
            const Icon = pt.icon;
            const isExpanded = expandedPlan === pt.key;
            const levels = planLevels.filter((p) => p.plan_type === pt.key);
            const unlockedCount = levels.filter((l) => l.unlocked).length;

            return (
              <Card key={pt.key} className="card-glass overflow-hidden">
                <CardHeader
                  className="cursor-pointer hover:bg-secondary/20 transition-colors"
                  onClick={() => setExpandedPlan(isExpanded ? null : pt.key)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{pt.label}</CardTitle>
                        <Badge variant="outline" className="text-[10px] mt-0.5">
                          {unlockedCount}/3 desbloqueados
                        </Badge>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-4 pt-0">
                    {LEVELS.map((level) => {
                      const pl = levels.find((p) => p.level === level);
                      if (!pl) return null;
                      const price = DEFAULT_PRICES[level];

                      return (
                        <div key={pl.id} className={`rounded-lg border p-4 space-y-3 transition-all ${pl.unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/10"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {pl.unlocked ? <Unlock className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                              <div>
                                <span className="text-sm font-semibold">{LEVEL_LABELS[level]}</span>
                                <span className="text-xs text-accent font-bold ml-2">{formatPrice(price)}</span>
                              </div>
                            </div>
                            <Switch checked={pl.unlocked} onCheckedChange={() => toggleUnlock(pl.id, pl.unlocked)} />
                          </div>
                          <Textarea
                            placeholder={`Contenido de ${pt.shortLabel} - ${LEVEL_LABELS[level]}...`}
                            value={pl.content}
                            onChange={(e) => updateContent(pl.id, e.target.value)}
                            className="bg-secondary/30 border-border min-h-[100px] text-sm"
                          />
                          <Button size="sm" variant="outline" className="gap-2" onClick={() => saveContent(pl.id)} disabled={saving === pl.id}>
                            {saving === pl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Guardar contenido
                          </Button>
                        </div>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
