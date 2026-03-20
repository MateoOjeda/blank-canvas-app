import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Moon, Sun, Dumbbell, Briefcase, Sparkles, Loader2, Clock, AlertCircle } from "lucide-react";

interface SurveyData {
  hora_dormir: string;
  hora_despertar: string;
  dificultad_levantarse: string;
  hora_ideal_despertar: string;
  desayuno_habito: string;
  bano_levantarse: string;
  entrena: boolean;
  tipo_entrenamiento: string;
  horario_entrenamiento: string;
  obligaciones_diarias: string;
  horarios_ocupados: string;
  personas_cargo: string;
  organizacion_comidas: string;
  nuevos_habitos: string;
  tiempo_para_si: string;
  updated_at: string;
}

interface Props {
  studentId: string;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {children}
      </div>
    </div>
  );
}

export default function PersonalDiagnosticTab({ studentId }: Props) {
  const [data, setData] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("seguimiento_personal")
      .select("*")
      .eq("student_id", studentId)
      .maybeSingle()
      .then(({ data: d }) => {
        if (d) {
          const { id, student_id, created_at, ...rest } = d as any;
          setData(rest);
        }
        setLoading(false);
      });
  }, [studentId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (!data) {
    return (
      <Card className="card-glass">
        <CardContent className="py-8 text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">El alumno aún no ha completado la encuesta de Cambio Personal.</p>
        </CardContent>
      </Card>
    );
  }

  const updatedDate = new Date(data.updated_at).toLocaleDateString("es-ES", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Diagnóstico de Cambio Personal</span>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px] border-primary/30 text-primary">
          <Clock className="h-2.5 w-2.5" />
          {updatedDate}
        </Badge>
      </div>

      <Section icon={Moon} title="Hábitos de Sueño">
        <InfoRow label="Hora de dormir" value={data.hora_dormir} />
        <InfoRow label="Hora de despertar" value={data.hora_despertar} />
        <InfoRow label="Dificultad para levantarse" value={data.dificultad_levantarse} />
        <InfoRow label="Horario ideal de despertar" value={data.hora_ideal_despertar} />
      </Section>

      <Section icon={Sun} title="Rutina de Mañana">
        <InfoRow label="Hábitos de desayuno" value={data.desayuno_habito} />
        <InfoRow label="Baño al levantarse" value={data.bano_levantarse} />
      </Section>

      <Section icon={Dumbbell} title="Actividad Física">
        <InfoRow label="¿Entrena?" value={data.entrena ? "Sí" : "No"} />
        <InfoRow label="Tipo de entrenamiento" value={data.tipo_entrenamiento} />
        <InfoRow label="Horarios" value={data.horario_entrenamiento} />
      </Section>

      <Section icon={Briefcase} title="Responsabilidades y Bienestar">
        <InfoRow label="Obligaciones diarias" value={data.obligaciones_diarias} />
        <InfoRow label="Horarios ocupados" value={data.horarios_ocupados} />
        <InfoRow label="Personas/mascotas a cargo" value={data.personas_cargo} />
        <InfoRow label="Organización con comidas" value={data.organizacion_comidas} />
        <InfoRow label="Nuevos hábitos deseados" value={data.nuevos_habitos} />
        <InfoRow label="Tiempo para sí mismo/a" value={data.tiempo_para_si} />
      </Section>
    </div>
  );
}
