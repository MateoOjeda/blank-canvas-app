import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, ClipboardList, ChevronDown, ChevronUp, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { PLAN_TYPES, LEVELS, LEVEL_LABELS, DEFAULT_PRICES, formatPrice } from "@/lib/planConstants";

interface GlobalPlan {
  id: string;
  plan_type: string;
  level: string;
  price: number;
  content: string;
  active: boolean;
}

export default function PlansPage() {
  const { user } = useAuth();
  const [globalPlans, setGlobalPlans] = useState<GlobalPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const fetchGlobalPlans = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("global_plans")
      .select("id, plan_type, level, price, content, active")
      .eq("trainer_id", user.id);

    let existing = data || [];

    // Auto-create missing global plan rows
    const missing: { trainer_id: string; plan_type: string; level: string; price: number; content: string; active: boolean }[] = [];
    for (const pt of PLAN_TYPES) {
      for (const level of LEVELS) {
        if (!existing.find((e) => e.plan_type === pt.key && e.level === level)) {
          missing.push({
            trainer_id: user.id,
            plan_type: pt.key,
            level,
            price: DEFAULT_PRICES[level],
            content: "",
            active: true,
          });
        }
      }
    }
    if (missing.length > 0) {
      const { data: inserted } = await supabase
        .from("global_plans")
        .insert(missing as any)
        .select("id, plan_type, level, price, content, active");
      if (inserted) existing = [...existing, ...inserted];
    }

    setGlobalPlans(existing);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGlobalPlans();
  }, [fetchGlobalPlans]);

  const updateField = (id: string, field: keyof GlobalPlan, value: any) => {
    setGlobalPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const savePlan = async (id: string) => {
    setSaving(id);
    const plan = globalPlans.find((p) => p.id === id);
    if (!plan) return;

    const { error } = await supabase
      .from("global_plans")
      .update({ price: plan.price, content: plan.content, active: plan.active })
      .eq("id", id);

    if (error) {
      toast.error("Error al guardar plan");
    } else {
      toast.success("Plan guardado — se actualiza para todos los alumnos automáticamente");
    }
    setSaving(null);
  };

  const toggleActive = async (id: string, current: boolean) => {
    updateField(id, "active", !current);
    const { error } = await supabase.from("global_plans").update({ active: !current }).eq("id", id);
    if (error) {
      toast.error("Error al actualizar");
      updateField(id, "active", current);
    } else {
      toast.success(!current ? "Plan activado" : "Plan desactivado");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Gestión de Planes</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Editá contenido y precios. Los cambios se reflejan automáticamente en todos los alumnos.
        </p>
      </div>

      <div className="space-y-4">
        {PLAN_TYPES.map((pt) => {
          const Icon = pt.icon;
          const isExpanded = expandedPlan === pt.key;
          const levels = globalPlans.filter((p) => p.plan_type === pt.key);
          const activeCount = levels.filter((l) => l.active).length;

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
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activeCount} nivel{activeCount !== 1 ? "es" : ""} activo{activeCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                  {LEVELS.map((level) => {
                    const pl = levels.find((p) => p.level === level);
                    if (!pl) return null;

                    return (
                      <div
                        key={pl.id}
                        className={`rounded-lg border p-4 space-y-3 transition-all ${
                          pl.active ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/10 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">{LEVEL_LABELS[level]}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                pl.active
                                  ? "border-green-400/50 text-green-600 bg-green-500/10"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {pl.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <Switch checked={pl.active} onCheckedChange={() => toggleActive(pl.id, pl.active)} />
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-accent" />
                          <Label className="text-xs text-muted-foreground">Precio:</Label>
                          <Input
                            type="number"
                            value={pl.price}
                            onChange={(e) => updateField(pl.id, "price", parseFloat(e.target.value) || 0)}
                            className="h-8 w-32 text-sm bg-secondary/30 border-border"
                            placeholder="Precio"
                          />
                          <span className="text-xs text-muted-foreground">{formatPrice(pl.price)}</span>
                        </div>

                        {/* Content */}
                        <Textarea
                          placeholder={`Contenido de ${pt.shortLabel} - ${LEVEL_LABELS[level]}...`}
                          value={pl.content}
                          onChange={(e) => updateField(pl.id, "content", e.target.value)}
                          className="bg-secondary/30 border-border min-h-[100px] text-sm"
                        />

                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => savePlan(pl.id)}
                          disabled={saving === pl.id}
                        >
                          {saving === pl.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                          Guardar
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
    </div>
  );
}
