import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Save, Loader2, Palette, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useAppTheme } from "@/hooks/useAppTheme";

export default function UserSettingsDialog() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [mercadopagoAlias, setMercadopagoAlias] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const { currentTheme, setTheme, themes } = useAppTheme();
  
  const isTrainer = role === "trainer";

  useEffect(() => {
    if (!user || !open || !isTrainer) return;
    supabase
      .from("profiles")
      .select("mercadopago_alias, whatsapp_number")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setMercadopagoAlias(data.mercadopago_alias || "");
          setWhatsappNumber(data.whatsapp_number || "");
        }
      });
  }, [user, open, isTrainer]);

  const handleSaveBilling = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ mercadopago_alias: mercadopagoAlias.trim(), whatsapp_number: whatsappNumber.trim() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Error al guardar");
    else { toast.success("Configuración guardada"); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Configuración">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Configuración</DialogTitle>
        </DialogHeader>

        {isTrainer ? (
          <Tabs defaultValue="appearance" className="flex flex-col h-full overflow-hidden mt-2">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="appearance" className="gap-2 text-xs"><Palette className="w-3.5 h-3.5" /> Apariencia</TabsTrigger>
              <TabsTrigger value="billing" className="gap-2 text-xs"><CreditCard className="w-3.5 h-3.5" /> Cobros</TabsTrigger>
            </TabsList>
            
            <TabsContent value="appearance" className="flex-1 overflow-y-auto pt-4 space-y-4">
              <AppearanceSettings currentTheme={currentTheme} setTheme={setTheme} themes={themes} />
            </TabsContent>
            
            <TabsContent value="billing" className="pt-4 space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Alias de Mercado Pago</Label>
                  <Input placeholder="ej: mi.alias.mp" value={mercadopagoAlias} onChange={(e) => setMercadopagoAlias(e.target.value)} maxLength={100} />
                  <p className="text-[11px] text-muted-foreground">Tus alumnos podrán copiar este alias para realizarte pagos.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Número de WhatsApp</Label>
                  <Input placeholder="ej: 5491112345678" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} maxLength={20} />
                  <p className="text-[11px] text-muted-foreground">Con código de país, sin + ni espacios. Se usará para el botón de comprobante.</p>
                </div>
                <Button onClick={handleSaveBilling} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar configuración
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="pt-4 flex-1 overflow-y-auto">
            <AppearanceSettings currentTheme={currentTheme} setTheme={setTheme} themes={themes} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AppearanceSettings({ currentTheme, setTheme, themes }: any) {
  return (
    <div className="space-y-3 pb-2">
      <div className="mb-4">
        <Label className="text-sm font-semibold">Tus Preferencias Visuales</Label>
        <p className="text-[11px] text-muted-foreground mt-1">
          Elige entre 15 paletas distintas para sobrescribir los colores predeterminados en toda la app. 
          El tema seleccionado se guardará en tu perfil localmente.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-3 pb-2">
        {themes.map((t: any) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              currentTheme === t.id 
                ? 'border-primary bg-primary/10 shadow-sm neon-border' 
                : 'border-border bg-card/50 hover:bg-secondary/50'
            }`}
          >
            <div 
              className="w-5 h-5 rounded-full shadow flex-shrink-0 border border-black/10" 
              style={{ backgroundColor: t.isDefault ? '#4f4f4f' : t.color }}
            />
            <span className="text-xs font-medium truncate">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
