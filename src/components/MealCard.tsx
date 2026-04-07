import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, ClipboardList, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MealOption {
  name: string;
  description: string;
}

interface MealCardProps {
  title: string;
  ingredients?: string;
  options?: MealOption[];
  date?: string;
  className?: string;
}

export function MealCard({ title, ingredients, options, date, className }: MealCardProps) {
  return (
    <Card className={cn(
      "card-premium overflow-hidden shadow-2xl transition-all duration-500 hover:scale-[1.01] hover:border-primary/30",
      className
    )}>
      <CardHeader className="relative p-6 pb-2">
        <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
          <Utensils className="h-24 w-24 -rotate-12" />
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
            <Utensils className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-display font-bold tracking-tight uppercase leading-none mb-1 text-foreground">
              {title}
            </CardTitle>
            {date && (
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                Planificado para {date}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-4 space-y-6">
        {/* Ingredients Section */}
        {ingredients && (
          <div className="space-y-3 p-4 rounded-2xl bg-muted/30 border border-border/50 relative overflow-hidden group transition-colors hover:bg-muted/40">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Ingredientes</span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap pl-1 font-medium">
              {ingredients}
            </p>
            <div className="absolute -bottom-2 -right-2 opacity-[0.03] scale-150 transition-transform group-hover:rotate-12 duration-500">
               <Sparkles className="h-12 w-12" />
            </div>
          </div>
        )}

        {/* Options / Preparation Section */}
        {options && options.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Info className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-black text-primary uppercase tracking-[0.2em]">Opciones / Preparación</span>
            </div>
            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="relative pl-6 py-1 group">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/40 via-primary/10 to-transparent rounded-full" />
                  <div className="absolute left-[-4px] top-2 h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/40 group-hover:scale-125 transition-transform" />
                  <div className="space-y-1.5">
                    <h5 className="text-[13px] font-black text-foreground uppercase tracking-tight flex items-center gap-2">
                      {opt.name}
                      <CheckCircle2 className="h-3 w-3 text-primary opacity-50" />
                    </h5>
                    {opt.description && (
                      <p className="text-[12px] text-muted-foreground leading-snug font-medium italic">
                        {opt.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!ingredients && (!options || options.length === 0)) && (
          <div className="flex flex-col items-center justify-center py-8 opacity-40">
             <Info className="h-8 w-8 mb-2" />
             <p className="text-xs font-bold uppercase tracking-widest text-center">Sin detalles adicionales</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
