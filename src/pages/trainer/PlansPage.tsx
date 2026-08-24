import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { type GlobalPlan } from "@/services/planes";
import { useGlobalPlans } from "@/hooks/useGlobalPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, ChevronDown, ChevronUp, DollarSign, Apple, Dumbbell, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { LEVELS, LEVEL_LABELS, formatPrice } from "@/lib/planConstants";
import { cn } from "@/lib/utils";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";

const PLAN_TYPES_CONFIG = [
  { key: "nutricion", label: "Plan de Alimentación", shortLabel: "Alimentación", icon: Apple },
  { key: "entrenamiento", label: "Plan de Rutina", shortLabel: "Rutina", icon: Dumbbell },
] as const;

export default function PlansPage() {
  const { user } = useAuth();
  
  const { 
    plans: queryPlans, 
    cambioFisico: queryCambioFisico, 
    isLoading: loading,
    savePlan,
    togglePlan 
  } = useGlobalPlans(user?.uid);

  const [globalPlans, setGlobalPlans] = useState<GlobalPlan[]>([]);
  const [cambioFisico, setCambioFisico] = useState<GlobalPlan | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (queryPlans) {
      setGlobalPlans(queryPlans);
    }
  }, [queryPlans]);

  useEffect(() => {
    if (queryCambioFisico) {
      setCambioFisico(queryCambioFisico);
    }
  }, [queryCambioFisico]);

  const updateField = (id: string, field: keyof GlobalPlan, value: any) => {
    setGlobalPlans((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const handleSave = async (id: string) => {
    setSaving(id);
    const plan = globalPlans.find((p) => p.id === id) || (cambioFisico?.id === id ? cambioFisico : null);
    if (!plan) { setSaving(null); return; }
    try {
      await savePlan(plan);
      toast.success("Plan guardado — se actualiza para todos los alumnos automáticamente");
    } catch { toast.error("Error al guardar plan"); }
    setSaving(null);
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    updateField(id, "active", !current);
    try {
      await togglePlan({ id, active: !current });
      toast.success(!current ? "Plan activado" : "Plan desactivado");
    } catch {
      toast.error("Error al actualizar");
      updateField(id, "active", current);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto pb-24 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
          <div className="space-y-2">
            <div className="h-7 w-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-4 w-72 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
        <LoadingSkeleton type="card" count={2} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Gestión de Planes</h1>
          <p className="text-sm text-muted-foreground mt-1">Edita contenido y precios de planes globales. Los cambios se sincronizan en tiempo real.</p>
        </div>
      </div>

      <div className="space-y-4">
        {PLAN_TYPES_CONFIG.map((pt) => {
          const Icon = pt.icon;
          const isExpanded = expandedPlan === pt.key;
          const levels = globalPlans.filter((p) => p.plan_type === pt.key);
          const activeCount = levels.filter((l) => l.active).length;

          return (
            <Card key={pt.key} className="border border-border/50 bg-card rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4 border-b border-border/50" onClick={() => setExpandedPlan(isExpanded ? null : pt.key)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-primary" /></div>
                    <div>
                      <CardTitle className="text-sm font-bold text-foreground">{pt.label}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{activeCount} nivel{activeCount !== 1 ? "es" : ""} activo{activeCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardHeader>
              {isExpanded && (
                <CardContent className="space-y-4 p-4">
                  {LEVELS.map((level) => {
                    const pl = levels.find((p) => p.level === level);
                    if (!pl) return null;
                    return (
                      <div key={pl.id} className={cn(
                        "rounded-2xl border p-4 space-y-4 transition-all duration-200",
                        pl.active 
                          ? "border-primary/30 bg-primary/5 shadow-sm" 
                          : "border-border/50 bg-muted/20 opacity-70"
                      )}>
                        <div className="flex items-center justify-between pb-1 border-b border-border/30">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{LEVEL_LABELS[level]}</span>
                            <Badge variant="outline" className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded-md border-none",
                              pl.active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                            )}>
                              {pl.active ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>
                          <Switch checked={pl.active} onCheckedChange={() => handleToggleActive(pl.id, pl.active)} className="data-[state=checked]:bg-primary" />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Precio de Suscripción</Label>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                              <Input 
                                type="number" 
                                value={pl.price} 
                                onChange={(e) => updateField(pl.id, "price", parseFloat(e.target.value) || 0)} 
                                className="pl-9 h-10 text-xs font-semibold bg-secondary/10 border-border/50 rounded-lg focus-visible:ring-primary/20" 
                              />
                            </div>
                          </div>
                          <div className="pt-5 text-right sm:text-left">
                            <span className="text-xs text-muted-foreground">Valor mensual: </span>
                            <span className="text-sm font-bold text-foreground">{formatPrice(pl.price)}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Contenido del Plan</Label>
                          <Textarea 
                            placeholder={`Describe los detalles y alcances de ${pt.shortLabel} - ${LEVEL_LABELS[level]}...`} 
                            value={pl.content} 
                            onChange={(e) => updateField(pl.id, "content", e.target.value)} 
                            className="bg-secondary/10 border-border/50 min-h-[100px] text-xs rounded-xl focus-visible:ring-primary/20 resize-none" 
                          />
                        </div>

                        <Button size="sm" variant="outline" className="gap-1.5 h-8.5 rounded-lg text-xs font-semibold hover:bg-muted/10 border-border" onClick={() => handleSave(pl.id)} disabled={saving === pl.id}>
                          {saving === pl.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar Nivel
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}

        {/* Cambio Físico */}
        {cambioFisico && (
          <Card className="border border-border/50 bg-card rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors p-4 border-b border-border/50" onClick={() => setExpandedPlan(expandedPlan === "cambios_fisicos" ? null : "cambios_fisicos")}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><TrendingUp className="h-5 w-5 text-primary" /></div>
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Cambio Físico</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">Plan integral: alimentación + rutina</p>
                  </div>
                </div>
                {expandedPlan === "cambios_fisicos" ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </div>
            </CardHeader>
            {expandedPlan === "cambios_fisicos" && (
              <CardContent className="space-y-4 p-4">
                <div className={cn(
                  "rounded-2xl border p-4 space-y-4 transition-all duration-200",
                  cambioFisico.active 
                    ? "border-primary/30 bg-primary/5 shadow-sm" 
                    : "border-border/50 bg-muted/20 opacity-70"
                )}>
                  <div className="flex items-center justify-between pb-1 border-b border-border/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">Estado del Plan</span>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold px-2 py-0.5 rounded-md border-none",
                        cambioFisico.active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      )}>
                        {cambioFisico.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <Switch checked={cambioFisico.active} onCheckedChange={async (v) => {
                      setCambioFisico({ ...cambioFisico, active: v });
                      try { await togglePlan({ id: cambioFisico.id, active: v }); } catch { setCambioFisico({ ...cambioFisico, active: !v }); }
                    }} className="data-[state=checked]:bg-primary" />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Precio de Suscripción</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                        <Input 
                          type="number" 
                          value={cambioFisico.price} 
                          onChange={(e) => setCambioFisico({ ...cambioFisico, price: parseFloat(e.target.value) || 0 })} 
                          className="pl-9 h-10 text-xs font-semibold bg-secondary/10 border-border/50 rounded-lg focus-visible:ring-primary/20" 
                        />
                      </div>
                    </div>
                    <div className="pt-5 text-right sm:text-left">
                      <span className="text-xs text-muted-foreground">Valor mensual: </span>
                      <span className="text-sm font-bold text-foreground">{formatPrice(cambioFisico.price)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Qué incluye el cambio físico</Label>
                    <Textarea 
                      placeholder="Describe qué incluye el plan de cambio físico..." 
                      value={cambioFisico.content} 
                      onChange={(e) => setCambioFisico({ ...cambioFisico, content: e.target.value })} 
                      className="bg-secondary/10 border-border/50 min-h-[120px] text-xs rounded-xl focus-visible:ring-primary/20 resize-none" 
                    />
                  </div>

                  <Button size="sm" variant="outline" className="gap-1.5 h-8.5 rounded-lg text-xs font-semibold hover:bg-muted/10 border-border" onClick={() => handleSave(cambioFisico.id)} disabled={saving === cambioFisico.id}>
                    {saving === cambioFisico.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
