import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  studentId: string;
}

interface WeightEntry {
  weight: number;
  recorded_at: string;
}

export default function WeightProgressChart({ studentId }: Props) {
  const [data, setData] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("weight_history")
      .select("weight, recorded_at")
      .eq("student_id", studentId)
      .order("recorded_at", { ascending: true })
      .then(({ data: d }) => {
        setData(d || []);
        setLoading(false);
      });
  }, [studentId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  if (data.length === 0) {
    return (
      <Card className="card-glass">
        <CardContent className="py-8 text-center space-y-2">
          <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">Sin registros de peso aún.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    date: format(parseISO(d.recorded_at), "dd MMM", { locale: es }),
    peso: Number(d.weight),
    fullDate: format(parseISO(d.recorded_at), "d 'de' MMMM yyyy", { locale: es }),
  }));

  const latest = data[data.length - 1];
  const first = data[0];
  const diff = Number(latest.weight) - Number(first.weight);

  return (
    <Card className="card-glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolución de Peso
          </CardTitle>
          <Badge variant="outline" className={`text-xs ${diff <= 0 ? "border-primary/40 text-primary" : "border-warning/40 text-warning"}`}>
            {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis
              domain={["dataMin - 1", "dataMax + 1"]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
                color: "hsl(var(--foreground))",
              }}
              formatter={(value: number) => [`${value} kg`, "Peso"]}
              labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ""}
            />
            <Line
              type="monotone"
              dataKey="peso"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", r: 4 }}
              activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
