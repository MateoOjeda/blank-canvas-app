import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BODY_PARTS } from "@/lib/exercisesByBodyPart";
import type { DayConfig } from "@/services/routines";

interface MuscleConfigCardProps {
  selectedDay: string;
  currentDayConfig: DayConfig;
  onSaveDayConfig: (field: "body_part_1" | "body_part_2", value: string) => void;
}

export const MuscleConfigCard: React.FC<MuscleConfigCardProps> = ({
  selectedDay,
  currentDayConfig,
  onSaveDayConfig,
}) => {
  return (
    <Card className="border border-border/40 bg-card/60 rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Músculos a Entrenar ({selectedDay})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Grupo Principal</Label>
            <Select value={currentDayConfig.body_part_1 || "none"} onValueChange={(v) => onSaveDayConfig("body_part_1", v)}>
              <SelectTrigger className="h-10 border-border/50 bg-secondary/15 hover:bg-secondary/25 text-xs"><SelectValue placeholder="Primario" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Ninguno —</SelectItem>
                {BODY_PARTS.map((bp) => <SelectItem key={bp} value={bp}>{bp}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Grupo Secundario</Label>
            <Select value={currentDayConfig.body_part_2 || "none"} onValueChange={(v) => onSaveDayConfig("body_part_2", v)}>
              <SelectTrigger className="h-10 border-border/50 bg-secondary/15 hover:bg-secondary/25 text-xs"><SelectValue placeholder="Secundario" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Ninguno —</SelectItem>
                {BODY_PARTS.filter((bp) => bp !== currentDayConfig.body_part_1).map((bp) => (
                  <SelectItem key={bp} value={bp}>{bp}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
