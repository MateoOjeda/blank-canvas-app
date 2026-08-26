import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Dumbbell, Apple, TrendingUp, Eye, Pencil } from "lucide-react";
import { PLAN_LEVEL_OPTIONS, getLevelColor } from "@/lib/constants";
import type { LinkedStudent } from "@/services/alumnos";

interface StudentDetailPanelProps {
  student: LinkedStudent | null;
  onDeleteClick: (student: LinkedStudent) => void;
}

export function StudentDetailPanel({ student, onDeleteClick }: StudentDetailPanelProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="border border-border/50 bg-card rounded-2xl h-full flex flex-col shadow-sm relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!student ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center flex-1 h-full min-h-[500px] text-center p-8 z-10"
            >
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 mb-4">
                <Users className="h-10 w-10 text-primary/60" />
              </div>
              <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Detalle del Alumno</p>
              <p className="text-muted-foreground text-xs mt-1">Selecciona un alumno de la lista para ver su información</p>
            </motion.div>
          ) : (
            <motion.div 
              key={student.user_id}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[75vh] flex-1 z-10 hide-scrollbar"
            >
              {/* Profile header */}
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5 pb-6 border-b border-border/40 relative pr-10">
                <div 
                  className="cursor-pointer transition-transform hover:scale-102"
                  onClick={() => navigate(`/trainer/students/${student.user_id}`)}
                >
                  <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-sm">
                    <AvatarImage src={student.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                      {student.avatar_initials || (student.display_name || "??").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 space-y-1">
                  <h2 
                    className="text-2xl font-bold tracking-tight text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/trainer/students/${student.user_id}`)}
                  >
                    {student.display_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${student.paymentStatus === "pagado" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"}`}>
                      {student.paymentStatus === "pagado" ? "✓ Pagado" : "⏳ Pendiente"}
                    </Badge>
                    {student.groupName && (
                      <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[9px] font-bold px-2 py-0.5 border-none shadow-none rounded-md">
                        Grupo: {student.groupName}
                      </Badge>
                    )}
                    {(student.age || student.weight) && (
                      <div className="flex items-center gap-1.5">
                        {student.age && (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground text-[9px] font-bold px-2 py-0.5 border border-border/50 rounded-md">
                            {student.age} años
                          </Badge>
                        )}
                        {student.weight && (
                          <Badge variant="secondary" className="bg-muted text-muted-foreground text-[9px] font-bold px-2 py-0.5 border border-border/50 rounded-md">
                            {student.weight} kg
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost" size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors absolute top-0 right-0"
                  onClick={() => onDeleteClick(student)}
                  title="Eliminar alumno permanentemente"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Bento Grid layout for plans */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Routine section */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/30 flex flex-col justify-between hover:bg-muted/50 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Dumbbell className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Entrenamiento</h3>
                    </div>
                    {student.planEntrenamiento && student.planEntrenamiento !== "none" ? (
                      <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getLevelColor(student.planEntrenamiento)}`}>
                        {PLAN_LEVEL_OPTIONS.find(o => o.value === student.planEntrenamiento)?.label || student.planEntrenamiento}
                      </Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin rutina asignada</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl font-semibold border-border" onClick={() => navigate(`/trainer/students/${student.user_id}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Ver
                    </Button>
                    <Button size="sm" className="bg-primary hover:bg-primary/95 text-primary-foreground flex-1 h-9 text-xs rounded-xl font-semibold shadow-sm" onClick={() => navigate(`/trainer/groups/student/${student.user_id}/routine`)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                    </Button>
                  </div>
                </div>

                {/* Meals routine section */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/30 flex flex-col justify-between hover:bg-muted/50 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Apple className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Alimentación</h3>
                    </div>
                    {student.planAlimentacion && student.planAlimentacion !== "none" ? (
                      <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getLevelColor(student.planAlimentacion)}`}>
                        {PLAN_LEVEL_OPTIONS.find(o => o.value === student.planAlimentacion)?.label || student.planAlimentacion}
                      </Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin dieta asignada</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl font-semibold border-border" onClick={() => navigate(`/trainer/students/${student.user_id}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Ver
                    </Button>
                    <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white flex-1 h-9 text-xs rounded-xl font-semibold shadow-sm" onClick={() => navigate(`/trainer/students/${student.user_id}`)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                    </Button>
                  </div>
                </div>

                {/* Cambio Físico section */}
                <div className="p-5 rounded-xl border border-border/40 bg-muted/30 flex flex-col justify-between hover:bg-muted/50 transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                        <TrendingUp className="h-4.5 w-4.5" />
                      </div>
                      <h3 className="font-bold text-xs text-foreground uppercase tracking-wider">Cambio Físico</h3>
                    </div>
                    {student.planCambioFisico && student.planCambioFisico !== "none" ? (
                      <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${getLevelColor(student.planCambioFisico)}`}>
                        {PLAN_LEVEL_OPTIONS.find(o => o.value === student.planCambioFisico)?.label || student.planCambioFisico}
                      </Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sin cambio físico asignado</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-6">
                    <Button variant="outline" size="sm" className="flex-1 h-9 text-xs rounded-xl font-semibold border-border" onClick={() => navigate(`/trainer/students/${student.user_id}`)}>
                      <Eye className="h-3.5 w-3.5 mr-1.5" /> Ver
                    </Button>
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white flex-1 h-9 text-xs rounded-xl font-semibold shadow-sm" onClick={() => navigate(`/trainer/students/${student.user_id}`)}>
                      <Pencil className="h-3.5 w-3.5 mr-1.5" /> Editar
                    </Button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
