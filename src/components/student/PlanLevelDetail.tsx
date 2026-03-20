import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lock, Unlock, Copy, MessageCircle, Check, ArrowLeft, CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LEVELS, LEVEL_LABELS, PLAN_TYPES, formatPrice } from "@/lib/planConstants";

interface PlanLevel {
  id: string;
  plan_type: string;
  level: string;
  content: string;
  unlocked: boolean;
}

interface TrainerInfo {
  mercadopago_alias: string;
  whatsapp_number: string;
  display_name: string;
}

interface Props {
  planType: typeof PLAN_TYPES[number];
  planLevels: PlanLevel[];
  trainerInfo: TrainerInfo | null;
  trainerPrices?: Record<string, number>;
  onBack: () => void;
}

export default function PlanLevelDetail({ planType, planLevels, trainerInfo, trainerPrices, onBack }: Props) {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const Icon = planType.icon;

  const getPrice = (level: string): number => {
    const key = `${planType.key}-${level}`;
    return trainerPrices?.[key] ?? 0;
  };

  const copyAlias = async () => {
    if (!trainerInfo?.mercadopago_alias) return;
    try {
      await navigator.clipboard.writeText(trainerInfo.mercadopago_alias);
      setCopiedAlias(true);
      toast.success("¡Alias copiado al portapapeles!");
      setTimeout(() => setCopiedAlias(false), 2000);
    } catch { toast.error("No se pudo copiar"); }
  };

  const openWhatsApp = (levelLabel: string) => {
    const phone = trainerInfo?.whatsapp_number || "";
    const message = encodeURIComponent(`Hola, acabo de realizar el pago del ${planType.label} - Nivel ${levelLabel}. Adjunto el comprobante.`);
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const levelDesc = planType.levelDescriptions as Record<string, string>;

  if (selectedLevel) {
    const pl = planLevels.find((p) => p.plan_type === planType.key && p.level === selectedLevel);
    const price = getPrice(selectedLevel);

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => { setSelectedLevel(null); setShowPayment(false); }} className="gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a niveles
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
          <div><h2 className="font-display font-bold text-lg">{planType.label}</h2><p className="text-xs text-muted-foreground">{LEVEL_LABELS[selectedLevel]}</p></div>
        </div>
        <Card className={`card-glass ${pl?.unlocked ? "neon-border" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              {pl?.unlocked ? <Unlock className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
              <Badge variant="outline" className={`text-[10px] ${pl?.unlocked ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>{pl?.unlocked ? "Desbloqueado" : "Bloqueado"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">{levelDesc[selectedLevel]}</p>
            {pl?.unlocked ? (
              pl.content ? (
                <div className="text-sm whitespace-pre-wrap leading-relaxed bg-secondary/20 rounded-lg p-4">{pl.content}</div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Tu entrenador aún no ha agregado contenido para este nivel.</p>
              )
            ) : (
              <div className="space-y-4">
                <div className="bg-secondary/30 rounded-lg p-4 text-center space-y-3">
                  <Lock className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Este nivel está bloqueado. Realizá el pago para desbloquearlo.</p>
                  {!showPayment ? (
                    <Button className="gap-2 w-full" size="lg" onClick={() => setShowPayment(true)}>
                      <CreditCard className="h-5 w-5" /> Pagar Plan
                    </Button>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {price > 0 && (
                        <div className="bg-background/60 rounded-lg p-4 space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor del plan</p>
                          <p className="text-2xl font-display font-bold text-primary">{formatPrice(price)}</p>
                        </div>
                      )}
                      {trainerInfo?.mercadopago_alias && (
                        <div className="bg-background/60 rounded-lg p-4 space-y-2">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">CVU / Alias</p>
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-sm font-semibold">{trainerInfo.mercadopago_alias}</span>
                            <Button variant="outline" size="sm" className="gap-1 h-7 px-2" onClick={copyAlias}>
                              {copiedAlias ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                              {copiedAlias ? "¡Copiado!" : "Copiar"}
                            </Button>
                          </div>
                        </div>
                      )}
                      {trainerInfo?.whatsapp_number && (
                        <Button variant="outline" className="gap-2 w-full" onClick={() => openWhatsApp(LEVEL_LABELS[selectedLevel])}>
                          <MessageCircle className="h-4 w-4" /> Enviar Comprobante
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Volver a planes</Button>
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center"><Icon className="h-5 w-5 text-primary" /></div>
        <div><h2 className="font-display font-bold text-lg">{planType.label}</h2><p className="text-xs text-muted-foreground">{planType.description}</p></div>
      </div>
      <div className="space-y-3">
        {LEVELS.map((level) => {
          const pl = planLevels.find((p) => p.plan_type === planType.key && p.level === level);
          return (
            <Card key={level} className={`card-glass cursor-pointer group hover:neon-border transition-all ${pl?.unlocked ? "neon-border" : "opacity-70"}`} onClick={() => { setSelectedLevel(level); setShowPayment(false); }}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${pl?.unlocked ? "bg-primary/15" : "bg-secondary"}`}>
                  {pl?.unlocked ? <Unlock className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{LEVEL_LABELS[level]}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{levelDesc[level]}</p>
                  <Badge variant="outline" className={`text-[10px] mt-1 ${pl?.unlocked ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>{pl?.unlocked ? "Desbloqueado" : "Bloqueado"}</Badge>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
