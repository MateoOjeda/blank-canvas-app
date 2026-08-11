import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Dumbbell } from "lucide-react";
import type { DayConfig, ExerciseType } from "@/services/routines";

interface ExerciseForm {
  name: string;
  sets: string;
  reps: string;
  isToFailure: boolean;
  isDropset: boolean;
  isPiramide: boolean;
  pyramidReps: string;
  exerciseType: ExerciseType;
}

interface BiSerieForm {
  name: string;
  reps: string;
  isToFailure: boolean;
  isDropset: boolean;
}

interface ExerciseFormCardProps {
  form: ExerciseForm;
  setForm: (form: ExerciseForm) => void;
  biSerieEnabled: boolean;
  setBiSerieEnabled: (enabled: boolean) => void;
  biForm: BiSerieForm;
  setBiForm: (form: BiSerieForm) => void;
  availableExercises: string[];
  currentDayConfig: DayConfig;
  onAdd: () => void;
}

export const ExerciseFormCard: React.FC<ExerciseFormCardProps> = ({
  form,
  setForm,
  biSerieEnabled,
  setBiSerieEnabled,
  biForm,
  setBiForm,
  availableExercises,
  currentDayConfig,
  onAdd,
}) => {
  return (
    <Card className="border border-border/40 bg-card/60 rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Dumbbell className="h-4.5 w-4.5 text-primary" />
          Configurar Ejercicio
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Selección de Ejercicio</Label>
          {availableExercises.length > 0 ? (
            <Select value={form.name} onValueChange={(v) => setForm({ ...form, name: v })}>
              <SelectTrigger className="h-11 border-border/50 bg-secondary/15 hover:bg-secondary/25 text-xs"><SelectValue placeholder="Seleccionar ejercicio..." /></SelectTrigger>
              <SelectContent>
                {availableExercises.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input
              placeholder={currentDayConfig.body_part_1 ? "Escribir nombre del ejercicio..." : "Primero asigna un grupo muscular arriba"}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-11 border-border/50 bg-secondary/15 text-xs"
              disabled={!currentDayConfig.body_part_1}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Series</Label>
            <Input type="number" placeholder="4" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} className="h-11 border-border/50 bg-secondary/15 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Repeticiones</Label>
            <Input
              type={form.isToFailure ? "text" : "number"}
              placeholder={form.isToFailure ? "Al Fallo" : "12"}
              value={form.isToFailure || form.isPiramide ? "" : form.reps}
              onChange={(e) => setForm({ ...form, reps: e.target.value })}
              className="h-11 border-border/50 bg-secondary/15 text-xs"
              disabled={form.isToFailure || form.isPiramide}
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-secondary/20 border border-border/40 space-y-3.5">
          <div className="flex items-center justify-between">
            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Configuraciones Avanzadas</Label>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/30 hover:bg-card/60 transition-all">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Al Fallo</span>
                <span className="text-[9px] text-muted-foreground">Llevar la serie al límite muscular</span>
              </div>
              <Switch
                checked={form.isToFailure}
                onCheckedChange={(checked) => setForm({
                  ...form,
                  isToFailure: checked,
                  reps: checked ? "" : form.reps,
                  isDropset: checked ? false : form.isDropset,
                  isPiramide: checked ? false : form.isPiramide
                })}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/30 hover:bg-card/60 transition-all">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Drop Set</span>
                <span className="text-[9px] text-muted-foreground">Reducir peso tras llegar al fallo</span>
              </div>
              <Switch
                checked={form.isDropset}
                onCheckedChange={(checked) => setForm({
                  ...form,
                  isDropset: checked,
                  isToFailure: checked ? false : form.isToFailure,
                  isPiramide: checked ? false : form.isPiramide
                })}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-card/40 border border-border/30 hover:bg-card/60 transition-all">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Pirámide</span>
                <span className="text-[9px] text-muted-foreground">Subir peso y bajar repeticiones</span>
              </div>
              <Switch
                checked={form.isPiramide}
                onCheckedChange={(checked) => setForm({
                  ...form,
                  isPiramide: checked,
                  pyramidReps: checked ? form.pyramidReps : "",
                  isToFailure: checked ? false : form.isToFailure,
                  isDropset: checked ? false : form.isDropset
                })}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
          {form.isPiramide && (
            <div className="pt-1.5 animate-in slide-in-from-top-2">
              <Label className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5 mb-1 block">Esquema de Repeticiones</Label>
              <Input
                placeholder="Ej: 12-10-8-6"
                value={form.pyramidReps}
                onChange={(e) => setForm({ ...form, pyramidReps: e.target.value })}
                className="text-xs h-9 bg-card/50"
              />
            </div>
          )}
        </div>

        {/* BI SERIE Section */}
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-primary tracking-wider uppercase">Vincular Bi Serie</span>
              <span className="text-[9px] text-muted-foreground">Agregar un ejercicio continuo sin descanso</span>
            </div>
            <Switch checked={biSerieEnabled} onCheckedChange={(checked) => {
              setBiSerieEnabled(checked);
              if (!checked) setBiForm({ name: "", reps: "", isToFailure: false, isDropset: false });
            }} className="data-[state=checked]:bg-primary" />
          </div>

          {biSerieEnabled && (
            <div className="space-y-4 pl-3.5 border-l-2 border-primary/30 animate-in slide-in-from-left-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Ejercicio Complementario</Label>
                {availableExercises.length > 0 ? (
                  <Select value={biForm.name} onValueChange={(v) => setBiForm({ ...biForm, name: v })}>
                    <SelectTrigger className="h-10 border-border/50 bg-card/60 text-xs"><SelectValue placeholder="Ejercicio..." /></SelectTrigger>
                    <SelectContent>
                      {availableExercises.map((ex) => <SelectItem key={ex} value={ex}>{ex}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input placeholder="Escribir nombre..." value={biForm.name} onChange={(e) => setBiForm({ ...biForm, name: e.target.value })} className="h-10 border-border/50 bg-card/60 text-xs" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Repeticiones</Label>
                  <Input type="number" value={biForm.reps} onChange={(e) => setBiForm({ ...biForm, reps: e.target.value })} className="h-10 border-border/50 bg-card/60 text-xs" disabled={biForm.isToFailure} />
                </div>
                <div className="flex flex-col gap-2 justify-end pb-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground">Al Fallo</span>
                    <Switch checked={biForm.isToFailure} onCheckedChange={(checked) => setBiForm({ ...biForm, isToFailure: checked, reps: checked ? "" : biForm.reps })} className="scale-75 origin-right data-[state=checked]:bg-primary" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground">Drop Set</span>
                    <Switch checked={biForm.isDropset} onCheckedChange={(checked) => setBiForm({ ...biForm, isDropset: checked })} className="scale-75 origin-right data-[state=checked]:bg-primary" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Button onClick={onAdd} className="w-full h-11 rounded-xl font-bold shadow-sm mt-2" disabled={!currentDayConfig.body_part_1}>
          <Plus className="h-4.5 w-4.5 mr-1.5" /> Agregar Ejercicio
        </Button>
      </CardContent>
    </Card>
  );
};
