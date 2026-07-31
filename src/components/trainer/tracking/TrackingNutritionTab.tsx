import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Beef, CheckCircle, Droplets, Flame, Utensils, XCircle } from "lucide-react";
import MealsTab from "@/components/trainer/MealsTab";
import { Assessment, TrackingNote } from "@/services/tracking";
import { format, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

interface Props {
  studentId: string;
  assessments: Assessment[];
  notes: TrackingNote[];
}

// ─── Weekly adherence visualization ──────────────────────────────────────────

function WeeklyAdherenceView({ assessments }: { assessments: Assessment[] }) {
  const today = new Date();
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      const dayKey = format(d, "yyyy-MM-dd");
      const assessment = assessments.find(
        (a) => a.recorded_at.startsWith(dayKey)
      );
      const compliance = assessment?.diet_compliance_pct ?? null;
      return {
        label: format(d, "EEE", { locale: es }),
        date: dayKey,
        compliance,
        hasData: assessment != null,
        good: compliance != null && compliance >= 70,
      };
    });
  }, [assessments]);

  const daysWithData = days.filter((d) => d.hasData);
  const avgCompliance = daysWithData.length > 0
    ? Math.round(daysWithData.reduce((s, d) => s + (d.compliance ?? 0), 0) / daysWithData.length)
    : null;

  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Utensils className="h-4 w-4 text-primary" />
            Adherencia Semanal
          </CardTitle>
          {avgCompliance !== null && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px]",
                avgCompliance >= 80 ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400" :
                avgCompliance >= 60 ? "border-primary/40 text-primary" :
                "border-destructive/40 text-destructive"
              )}
            >
              {avgCompliance}% promedio
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-3">
          {days.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn(
                  "h-10 w-full rounded-lg flex items-center justify-center transition-all",
                  d.hasData
                    ? d.good
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : "bg-destructive/15 border border-destructive/20"
                    : "bg-muted/20 border border-border/20"
                )}
              >
                {d.hasData ? (
                  d.good
                    ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                    : <XCircle className="h-4 w-4 text-destructive/60" />
                ) : (
                  <span className="text-[8px] text-muted-foreground">—</span>
                )}
              </div>
              <span className="text-[9px] font-semibold text-muted-foreground capitalize">{d.label}</span>
              {d.compliance !== null && (
                <span className="text-[8px] font-bold text-foreground">{d.compliance}%</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Nutrition KPI row ────────────────────────────────────────────────────────

function NutritionKpis({ assessments }: { assessments: Assessment[] }) {
  const recent = assessments.slice(0, 4);
  if (recent.length === 0) return null;

  const avg = (key: keyof Assessment) => {
    const values = recent.map((a) => a[key]).filter((v): v is number => v != null);
    return values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : null;
  };

  const kpis = [
    { label: "Agua (avg)", value: avg("water_liters"), unit: "L", icon: Droplets, color: "text-sky-500", bg: "bg-sky-500/10 border-sky-500/20" },
    { label: "Proteína (avg)", value: avg("protein_g"), unit: "g", icon: Beef, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Calorías (avg)", value: avg("calories_kcal"), unit: "kcal", icon: Flame, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Cumplimiento (avg)", value: avg("diet_compliance_pct"), unit: "%", icon: CheckCircle, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.map(({ label, value, unit, icon: Icon, color, bg }) => (
        <Card key={label} className={cn("border rounded-xl shadow-sm bg-card/60", bg)}>
          <CardContent className="p-3 text-center">
            <Icon className={cn("h-4 w-4 mx-auto mb-1", color)} />
            <p className={cn("text-lg font-bold", color)}>
              {value !== null ? `${value}${unit}` : "—"}
            </p>
            <p className="text-[9px] text-muted-foreground mt-0.5 font-semibold uppercase tracking-wide">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Nutrition trend chart ────────────────────────────────────────────────────

function NutritionTrendChart({ assessments }: { assessments: Assessment[] }) {
  const data = useMemo(() => {
    return assessments
      .slice(0, 8)
      .reverse()
      .filter((a) => a.diet_compliance_pct != null)
      .map((a) => ({
        date: format(parseISO(a.recorded_at), "dd MMM", { locale: es }),
        cumplimiento: a.diet_compliance_pct,
        agua: a.water_liters ? Math.round((a.water_liters / 3) * 100) : null, // normalize water to 0–100
      }));
  }, [assessments]);

  if (data.length < 2) return null;

  return (
    <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          Tendencia Nutricional
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={28} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                name === "cumplimiento" ? "Cumplimiento dieta" : "Agua (normalizado)",
              ]}
            />
            <Line
              type="monotone"
              dataKey="cumplimiento"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
              name="cumplimiento"
            />
            <Line
              type="monotone"
              dataKey="agua"
              stroke="hsl(198 93% 60%)"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 3, fill: "hsl(198 93% 60%)" }}
              name="agua"
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="text-[9px] text-muted-foreground text-center mt-1">
          Agua normalizada a escala 0–100 (meta = 3L = 100%)
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TrackingNutritionTab({ studentId, assessments, notes }: Props) {
  const nutritionNotes = notes.filter((n) =>
    /nutri|dieta|comida|agua|proteína|protein/i.test(n.content)
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <NutritionKpis assessments={assessments} />

      {/* Weekly adherence */}
      <WeeklyAdherenceView assessments={assessments} />

      {/* Trend chart */}
      <NutritionTrendChart assessments={assessments} />

      {/* Meal plan */}
      <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Utensils className="h-4 w-4 text-primary" />
            Plan de Alimentación
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <MealsTab studentId={studentId} />
        </CardContent>
      </Card>

      {/* Nutrition notes */}
      {nutritionNotes.length > 0 && (
        <Card className="border border-border/40 bg-card/60 rounded-xl shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Notas de Nutrición</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nutritionNotes.map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-secondary/10 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {format(parseISO(n.created_at), "d MMM yyyy", { locale: es })}
                </p>
                <p className="text-xs text-foreground leading-relaxed">{n.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {assessments.length === 0 && (
        <EmptyState
          type="empty"
          title="Sin datos de nutrición"
          description="Registra evaluaciones para ver las métricas nutricionales del alumno."
        />
      )}
    </div>
  );
}
