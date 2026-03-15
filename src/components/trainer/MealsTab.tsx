import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, UtensilsCrossed, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Meal {
  id: string;
  title: string;
  content: string;
  meal_type: string;
  created_at: string;
}

interface MealsTabProps {
  studentId: string;
}

export default function MealsTab({ studentId }: MealsTabProps) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("student_meals")
      .select("id, title, content, meal_type, created_at")
      .eq("trainer_id", user.id)
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    if (!error) setMeals(data || []);
    setLoading(false);
  }, [user, studentId]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const handleAdd = async () => {
    if (!user || !newTitle.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("student_meals").insert({
      trainer_id: user.id,
      student_id: studentId,
      title: newTitle.trim(),
      content: newContent.trim(),
      meal_type: "general",
    });
    if (error) {
      toast.error("Error al guardar comida");
    } else {
      toast.success("Comida agregada");
      setNewTitle("");
      setNewContent("");
      fetchMeals();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("student_meals").delete().eq("id", id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
    toast.success("Comida eliminada");
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <Card className="card-glass">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          Plan de Comidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-secondary/30 space-y-3">
          <p className="text-sm font-semibold">Agregar comida</p>
          <Input placeholder="Título (ej: Desayuno, Almuerzo...)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Textarea placeholder="Detalle de la comida..." value={newContent} onChange={(e) => setNewContent(e.target.value)} rows={3} />
          <Button size="sm" onClick={handleAdd} disabled={adding || !newTitle.trim()} className="gap-2">
            <Plus className="h-4 w-4" /> {adding ? "Guardando..." : "Agregar"}
          </Button>
        </div>
        {meals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin comidas asignadas</p>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <div key={meal.id} className="p-4 rounded-lg bg-secondary/30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{meal.title}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(meal.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
                {meal.content && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{meal.content}</p>}
                <p className="text-[10px] text-muted-foreground">{new Date(meal.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
