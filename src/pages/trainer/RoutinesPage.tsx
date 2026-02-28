import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Dumbbell, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: string;
  completed: boolean;
}

export default function RoutinesPage() {
  const { user } = useAuth();
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [selectedStudent, setSelectedStudent] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [form, setForm] = useState({ name: "", sets: "", reps: "", weight: "", day: "" });

  // Auto-select first student
  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0].user_id);
    }
  }, [students, selectedStudent]);

  const fetchExercises = useCallback(async () => {
    if (!user || !selectedStudent) return;
    setLoadingExercises(true);
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .eq("trainer_id", user.id)
      .eq("student_id", selectedStudent);
    setExercises(data || []);
    setLoadingExercises(false);
  }, [user, selectedStudent]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleAdd = async () => {
    if (!user || !selectedStudent) return;
    if (!form.name || !form.sets || !form.reps || !form.day) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }
    const { error } = await supabase.from("exercises").insert({
      trainer_id: user.id,
      student_id: selectedStudent,
      name: form.name,
      sets: parseInt(form.sets),
      reps: parseInt(form.reps),
      weight: parseFloat(form.weight) || 0,
      day: form.day,
    });
    if (error) {
      toast.error("Error al agregar ejercicio");
    } else {
      toast.success("Ejercicio agregado");
      setForm({ name: "", sets: "", reps: "", weight: "", day: "" });
      fetchExercises();
    }
  };

  const handleRemove = async (exerciseId: string) => {
    const { error } = await supabase.from("exercises").delete().eq("id", exerciseId);
    if (error) toast.error("Error al eliminar");
    else fetchExercises();
  };

  const student = students.find((s) => s.user_id === selectedStudent);

  if (loadingStudents) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Creador de Rutinas</h1>
          <p className="text-muted-foreground text-sm mt-1">Asigna ejercicios a tus alumnos</p>
        </div>
        <Card className="card-glass">
          <CardContent className="p-8 text-center">
            <Dumbbell className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Primero vincula alumnos en la sección "Mis Alumnos" para poder asignarles rutinas.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Creador de Rutinas</h1>
        <p className="text-muted-foreground text-sm mt-1">Asigna ejercicios a tus alumnos</p>
      </div>

      <div className="max-w-xs">
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Alumno</Label>
        <Select value={selectedStudent} onValueChange={setSelectedStudent}>
          <SelectTrigger className="bg-secondary/50 border-border">
            <SelectValue placeholder="Seleccionar alumno" />
          </SelectTrigger>
          <SelectContent>
            {students.map((s) => (
              <SelectItem key={s.user_id} value={s.user_id}>{s.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="card-glass neon-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nuevo Ejercicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Ejercicio</Label>
              <Input
                placeholder="Ej: Press Banca"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-secondary/50 border-border"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Series</Label>
                <Input type="number" placeholder="4" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} className="bg-secondary/50 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Reps</Label>
                <Input type="number" placeholder="10" value={form.reps} onChange={(e) => setForm({ ...form, reps: e.target.value })} className="bg-secondary/50 border-border" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Peso (kg)</Label>
                <Input type="number" placeholder="60" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className="bg-secondary/50 border-border" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Día</Label>
              <Select value={form.day} onValueChange={(v) => setForm({ ...form, day: v })}>
                <SelectTrigger className="bg-secondary/50 border-border">
                  <SelectValue placeholder="Seleccionar día" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Ejercicio
            </Button>
          </CardContent>
        </Card>

        {/* Exercise List */}
        <Card className="card-glass">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Ejercicios de {student?.display_name || "—"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingExercises ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : exercises.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sin ejercicios asignados</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {DAYS.map((day) => {
                  const dayExercises = exercises.filter((e) => e.day === day);
                  if (dayExercises.length === 0) return null;
                  return (
                    <div key={day}>
                      <Badge variant="outline" className="mb-2 border-primary/30 text-primary text-[10px]">{day}</Badge>
                      {dayExercises.map((ex) => (
                        <div key={ex.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 mb-1">
                          <div>
                            <p className="font-medium text-sm">{ex.name}</p>
                            <p className="text-xs text-muted-foreground">{ex.sets}×{ex.reps} — {ex.weight}kg</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {ex.completed && <Badge className="bg-primary/20 text-primary text-[10px]">✓</Badge>}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(ex.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
