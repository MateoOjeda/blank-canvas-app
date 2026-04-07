import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  addDoc, 
  deleteDoc,
  doc
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, UtensilsCrossed, Loader2, Utensils } from "lucide-react";
import { toast } from "sonner";
import { MealCard } from "@/components/MealCard";

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

  // Fixed: Allow up to 6 options regardless of level for trainer flexibility
  const maxOptions = 6;

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      let q = query(
        collection(db, "student_meals"),
        where("student_id", "==", studentId),
        orderBy("created_at", "desc")
      );

      // If a trainer is looking at a student (user.uid !== studentId), 
      // we could filter by trainer_id if needed, but for now we follow the logic:
      // If we are looking for our own meals (as a student), we don't filter by trainer_id
      if (user.uid !== studentId) {
        q = query(
          collection(db, "student_meals"),
          where("student_id", "==", studentId),
          where("trainer_id", "==", user.uid),
          orderBy("created_at", "desc")
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Meal));
      setMeals(data);
    } catch (err) {
      console.error("Error fetching meals:", err);
    } finally {
      setLoading(false);
    }
  }, [user, studentId]);

  useEffect(() => { fetchMeals(); }, [fetchMeals]);

  const handleAdd = async () => {
    if (!user || !newTitle.trim()) return;
    setAdding(true);

    const mealData = {
      ingredients: newIngredients.trim(),
      options: newOptions.filter(o => o.name.trim() || o.description.trim())
    };

    try {
      await addDoc(collection(db, "student_meals"), {
        trainer_id: user.uid,
        student_id: studentId,
        title: newTitle.trim(),
        content: JSON.stringify(mealData),
        meal_type: "general",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      toast.success("Comida agregada");
      setNewTitle("");
      setNewIngredients("");
      setNewOptions([{ name: "Opción 1", description: "" }]);
      fetchMeals();
    } catch (err) {
      toast.error("Error al guardar comida");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "student_meals", id));
      setMeals((prev) => prev.filter((m) => m.id !== id));
      toast.success("Comida eliminada");
    } catch (err) {
      toast.error("Error al eliminar comida");
    }
  };

  const parseMealContent = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data && typeof data === "object") {
        return {
          ingredients: data.ingredients || "",
          options: (data.options as any[] || []).slice(0, maxOptions)
        };
      }
    } catch (e) {
      // Not JSON, return as ingredients for backward compatibility
      return { ingredients: content, options: [] };
    }
    return { ingredients: "", options: [] };
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
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 text-primary border-primary/30 bg-primary/10 hover:bg-primary/20" onClick={() => {
                    const nextId = newOptions.length + 1;
                    setNewOptions([...newOptions, { name: `Opción ${nextId}`, description: "" }]);
                  }}>
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

      <div className={cn(
        "space-y-6",
        readOnly && "grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0"
      )}>
        {meals.length === 0 ? (
          <Card className="card-glass p-12 flex flex-col items-center justify-center text-center col-span-full">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-medium uppercase tracking-widest text-xs">No hay comidas en el plan actual</p>
          </Card>
        ) : (
          meals.map((meal) => {
            const { ingredients, options } = parseMealContent(meal.content);
            return (
              <div key={meal.id} className="relative group">
                <MealCard
                  title={meal.title}
                  ingredients={ingredients}
                  options={options}
                  date={new Date(meal.created_at).toLocaleDateString()}
                />
                {!readOnly && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity" 
                    onClick={() => handleDelete(meal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
