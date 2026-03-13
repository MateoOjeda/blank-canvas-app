import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TrainerSettingsDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [mercadopagoAlias, setMercadopagoAlias] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from("profiles")
      .select("mercadopago_alias, whatsapp_number")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setMercadopagoAlias((data as any).mercadopago_alias || "");
          setWhatsappNumber((data as any).whatsapp_number || "");
        }
      });
  }, [user, open]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        mercadopago_alias: mercadopagoAlias.trim(),
        whatsapp_number: whatsappNumber.trim(),
      } as any)
      .eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error("Error al guardar");
    else {
      toast.success("Configuración guardada");
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="Configuración">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Configuración de Cobro</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label className="text-sm">Alias de Mercado Pago</Label>
            <Input
              placeholder="ej: mi.alias.mp"
              value={mercadopagoAlias}
              onChange={(e) => setMercadopagoAlias(e.target.value)}
              maxLength={100}
            />
            <p className="text-[11px] text-muted-foreground">Tus alumnos podrán copiar este alias para realizarte pagos.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Número de WhatsApp</Label>
            <Input
              placeholder="ej: 5491112345678"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              maxLength={20}
            />
            <p className="text-[11px] text-muted-foreground">Con código de país, sin + ni espacios. Se usará para el botón de comprobante.</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
