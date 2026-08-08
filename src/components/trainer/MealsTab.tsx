import { useState, useEffect, useCallback, memo } from "react";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, UtensilsCrossed, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { MealCard } from "@/components/MealCard";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

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

export default function MealsTab({ studentId, readOnly = false }: MealsTabProps) {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteMealId, setDeleteMealId] = useState<string | null>(null);

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

  const handleAdd = useCallback(async (title: string, ingredients: string, options: { name: string; description: string }[]) => {
    if (!user) return;

    const mealData = {
      ingredients,
      options: options.filter(o => o.name.trim() || o.description.trim())
    };

    try {
      await addDoc(collection(db, "student_meals"), {
        trainer_id: user.uid,
        student_id: studentId,
        title,
        content: JSON.stringify(mealData),
        meal_type: "general",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      toast.success("Comida agregada");
      fetchMeals();
    } catch (err) {
      toast.error("Error al guardar comida");
      throw err;
    }
  }, [user, studentId, fetchMeals]);

  const handleDelete = async (id: string) => {
    setDeleteMealId(id);
  };

  const confirmDelete = async () => {
    if (!deleteMealId) return;
    try {
      await deleteDoc(doc(db, "student_meals", deleteMealId));
      setMeals((prev) => prev.filter((m) => m.id !== deleteMealId));
      toast.success("Comida eliminada");
    } catch (err) {
      toast.error("Error al eliminar comida");
    } finally {
      setDeleteMealId(null);
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
      return { ingredients: content, options: [] };
    }
    return { ingredients: "", options: [] };
  };

  if (loading) {
    return <LoadingSkeleton type="list" count={3} />;
  }

  return (
    <div className={readOnly ? "space-y-4" : "grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"}>
      {!readOnly && (
        <NewMealForm onAdd={handleAdd} maxOptions={maxOptions} />
      )}

      <div className={cn(
        "space-y-6",
        readOnly && "grid grid-cols-1 md:grid-cols-2 gap-6 space-y-0",
        "col-span-full"
      )}>
        {meals.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              type="empty"
              title="Sin comidas asignadas"
              description="No hay comidas o pautas nutricionales creadas para este plan."
            />
          </div>
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

      {/* CONFIRM DELETE MEAL DIALOG */}
      <AlertDialog open={!!deleteMealId} onOpenChange={(open) => !open && setDeleteMealId(null)}>
        <AlertDialogContent className="max-w-md border border-border/40 bg-card/95 shadow-xl rounded-2xl">
          <AlertDialogHeader className="pb-3 border-b border-border/40">
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Eliminar Comida
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground/80 mt-2 leading-relaxed">
              ¿Estás seguro de que deseas eliminar esta pauta de comida? Esta acción se sincronizará inmediatamente en el plan del alumno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 border-t border-border/40 flex justify-end gap-2">
            <AlertDialogCancel className="h-9 px-4 rounded-xl text-xs font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-9 px-4 rounded-xl text-xs font-bold shadow-sm">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface NewMealFormProps {
  onAdd: (title: string, ingredients: string, options: { name: string; description: string }[]) => Promise<void>;
  maxOptions: number;
}

const NewMealForm = memo(function NewMealForm({ onAdd, maxOptions }: NewMealFormProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newIngredients, setNewIngredients] = useState("");
  const [newOptions, setNewOptions] = useState<{name: string, description: string}[]>([{ name: "Opción 1", description: "" }]);
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await onAdd(newTitle.trim(), newIngredients.trim(), newOptions);
      setNewTitle("");
      setNewIngredients("");
      setNewOptions([{ name: "Opción 1", description: "" }]);
    } catch (err) {
      // Error handled in parent
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="border border-border/40 bg-card/60 rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="p-4 border-b border-border/40 bg-muted/20">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Plus className="h-4.5 w-4.5 text-primary" />
          Nueva Comida del Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="meal-title-input" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Título de la comida</Label>
          <Input 
            id="meal-title-input"
            placeholder="Ej: Desayuno, Almuerzo, Colación..." 
            value={newTitle} 
            onChange={(e) => setNewTitle(e.target.value)} 
            className="h-11 text-xs border-border/50 bg-secondary/15 hover:bg-secondary/25 focus-visible:ring-primary/20" 
          />
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="meal-ingredients-input" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-0.5">Ingredientes Base / Comunes</Label>
          <Textarea 
            id="meal-ingredients-input"
            placeholder="Ej: 100g de pechuga de pollo, 60g de arroz integral, ensalada verde..." 
            value={newIngredients} 
            onChange={(e) => setNewIngredients(e.target.value)} 
            rows={2} 
            className="text-xs border-border/50 bg-secondary/15 hover:bg-secondary/25 resize-none focus-visible:ring-primary/20" 
          />
        </div>

        <div className="p-4 rounded-xl bg-secondary/20 border border-border/40 space-y-3.5 mt-2">
          <div className="flex items-center justify-between">
            <Label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Variantes o Alternativas (Máx: {maxOptions})</Label>
            {newOptions.length < maxOptions && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-6 text-[9px] px-2 text-primary border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-md font-bold" 
                onClick={() => {
                  const nextId = newOptions.length + 1;
                  setNewOptions([...newOptions, { name: `Opción ${nextId}`, description: "" }]);
                }}
              >
                <Plus className="h-3 w-3 mr-1" /> Añadir variante
              </Button>
            )}
          </div>
           
          <div className="space-y-2.5">
             {newOptions.map((opt, index) => (
               <div key={index} className="grid gap-2 p-3 bg-card/60 rounded-xl border border-border/30 relative group/opt">
                 <div className="flex justify-between items-center pr-6">
                    <Input 
                      className="h-7 text-xs font-semibold bg-transparent border-none px-0 focus-visible:ring-0 shadow-none border-b border-border/40 rounded-none w-full max-w-[150px]" 
                      value={opt.name} 
                      onChange={(e) => {
                        const updated = [...newOptions];
                        updated[index].name = e.target.value;
                        setNewOptions(updated);
                      }} 
                      placeholder="Nombre de opción" 
                    />
                    
                    {newOptions.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md absolute right-2 top-2 opacity-50 group-hover/opt:opacity-100 transition-opacity" 
                        onClick={() => setNewOptions(newOptions.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                 </div>
                 <Textarea 
                   placeholder="Instrucciones de preparación alternativas para esta opción..." 
                   value={opt.description} 
                   onChange={(e) => {
                     const updated = [...newOptions];
                     updated[index].description = e.target.value;
                     setNewOptions(updated);
                   }} 
                   rows={2} 
                   className="text-xs resize-none shadow-none mt-1 bg-transparent border-dashed border-border/50 focus-visible:ring-primary/20" 
                 />
               </div>
             ))}
          </div>
        </div>

        <Button onClick={handleAdd} disabled={adding || !newTitle.trim()} className="w-full h-11 rounded-xl font-bold shadow-sm mt-2">
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />} 
          {adding ? "Guardando comida..." : "Guardar Comida en el Plan"}
        </Button>
      </CardContent>
    </Card>
  );
});
