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
  nutritionLevel?: string;
  readOnly?: boolean;
}

export default function MealsTab({ studentId, nutritionLevel = "principiante", readOnly = false }: MealsTabProps) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newIngredients, setNewIngredients] = useState("");
  const [newOptions, setNewOptions] = useState<{name: string, description: string}[]>([{ name: "Opción 1", description: "" }]);
  const [adding, setAdding] = useState(false);

  // Determine max options based on level
  const maxOptions = nutritionLevel === "principiante" ? 4 :
                     nutritionLevel === "intermedio" ? 2 :
                     nutritionLevel === "avanzado" ? 1 : 1;

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

    const mealData = {
      ingredients: newIngredients.trim(),
      options: newOptions.filter(o => o.name.trim() || o.description.trim())
    };

    const { error } = await supabase.from("student_meals").insert({
      trainer_id: user.id,
      student_id: studentId,
      title: newTitle.trim(),
      content: JSON.stringify(mealData),
      meal_type: "general",
    });

    if (error) {
      toast.error("Error al guardar comida");
    } else {
      toast.success("Comida agregada");
      setNewTitle("");
      setNewIngredients("");
      setNewOptions([{ name: "Opción 1", description: "" }]);
      fetchMeals();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("student_meals").delete().eq("id", id);
    setMeals((prev) => prev.filter((m) => m.id !== id));
    toast.success("Comida eliminada");
  };

  const renderMealContent = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data && typeof data === "object" && data.options) {
        const displayOptions = (data.options as any[]).slice(0, maxOptions);
        return (
          <div className="space-y-3 mt-3">
            {data.ingredients && (
               <div>
                  <p className="text-xs font-semibold text-primary mb-1">Ingredientes:</p>
                  <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{data.ingredients}</p>
               </div>
            )}
            {displayOptions.length > 0 && (
               <div>
                  <p className="text-xs font-semibold text-primary mb-2">Opciones:</p>
                  <div className="space-y-3 pl-3 border-l-2 border-primary/20">
                    {displayOptions.map((opt, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs font-bold text-foreground">{opt.name}</p>
                        <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{opt.description}</p>
                      </div>
                    ))}
                  </div>
               </div>
            )}
          </div>
        );
      }
    } catch (e) {
      // Not JSON, render as plain text for backward compatibility
    }
    return <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-2">{content}</p>;
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className={readOnly ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"}>
      {!readOnly && (
        <Card className="card-glass neon-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nueva Comida
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-2">Título de la comida</p>
              <Input placeholder="Ej: Desayuno, Almuerzo..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="bg-secondary/50 border-border" />
            </div>
            
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Ingredientes comunes</p>
              <Textarea placeholder="Ej: 100g pollo, 50g arroz..." value={newIngredients} onChange={(e) => setNewIngredients(e.target.value)} rows={2} className="text-sm bg-secondary/50 border-border resize-none" />
            </div>

            <div className="p-4 rounded-xl shadow-inner bg-secondary/30 space-y-4 border border-border/50 mt-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Variantes (Máx: {maxOptions})</p>
                {newOptions.length < maxOptions && (
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 text-primary border-primary/30 bg-primary/10 hover:bg-primary/20" onClick={() => setNewOptions([...newOptions, { name: `Opción ${newOptions.length + 1}`, description: "" }])}>
                    <Plus className="h-3 w-3 mr-1" /> Añadir variante
                  </Button>
                )}
              </div>
               
              <div className="space-y-3">
                 {newOptions.map((opt, index) => (
                   <div key={index} className="grid gap-2 p-3 bg-background rounded-lg border border-border relative group">
                     <div className="flex justify-between items-center pr-6">
                        <Input className="h-7 text-xs font-semibold bg-transparent border-none px-0 focus-visible:ring-0 shadow-none border-b border-border/50 rounded-none w-full max-w-[150px]" value={opt.name} onChange={(e) => {
                          const updated = [...newOptions];
                          updated[index].name = e.target.value;
                          setNewOptions(updated);
                        }} placeholder="Nombre de opción" />
                        
                        {newOptions.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive absolute right-2 top-2 opacity-50 group-hover:opacity-100 transition-opacity" onClick={() => setNewOptions(newOptions.filter((_, i) => i !== index))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                     </div>
                     <Textarea placeholder="Pasos de preparación o descripción..." value={opt.description} onChange={(e) => {
                          const updated = [...newOptions];
                          updated[index].description = e.target.value;
                          setNewOptions(updated);
                     }} rows={2} className="text-xs resize-none shadow-none mt-1 bg-transparent border-dashed border-border/60" />
                   </div>
                 ))}
              </div>
            </div>

            <Button size="sm" onClick={handleAdd} disabled={adding || !newTitle.trim()} className="w-full mt-4">
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />} 
              {adding ? "Guardando..." : "Guardar Comida"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="card-glass">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UtensilsCrossed className="h-5 w-5 text-primary" />
            Listado de Comidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {meals.length === 0 ? (
            <div className="text-center py-8">
              <UtensilsCrossed className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay comidas en el plan actual</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meals.map((meal) => (
                <div key={meal.id} className="p-4 rounded-xl bg-secondary/30 border border-border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] transition-all hover:bg-secondary/40">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-bold text-foreground truncate">{meal.title}</h4>
                      <p className="text-[10px] text-muted-foreground hidden sm:block">Añadida el {new Date(meal.created_at).toLocaleDateString()}</p>
                    </div>
                    {!readOnly && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(meal.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {renderMealContent(meal.content)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
