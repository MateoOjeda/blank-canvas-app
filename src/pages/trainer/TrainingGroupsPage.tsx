import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLinkedStudents } from "@/hooks/useLinkedStudents";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Users, Loader2, Dumbbell, UserPlus, X, Eye, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { BODY_PARTS, EXERCISES_BY_BODY_PART, type BodyPart } from "@/lib/exercisesByBodyPart";
import { assignGroupRoutineToStudent } from "@/services/routineManager";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface TrainingGroup { id: string; name: string; trainer_id: string; created_at: string; }
interface GroupMember { id: string; group_id: string; student_id: string; }
interface GroupExercise { id: string; group_id: string; name: string; sets: number; reps: number; weight: number; day: string; body_part: string; is_to_failure: boolean; }

export default function TrainingGroupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { students, loading: loadingStudents } = useLinkedStudents();
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [exercises, setExercises] = useState<GroupExercise[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [exForm, setExForm] = useState({ name: "", sets: "", reps: "", day: "", bodyPart: "", bodyPart2: "", isToFailure: false });
  const [deleteTarget, setDeleteTarget] = useState<TrainingGroup | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showInlineRoutine, setShowInlineRoutine] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("training_groups").select("*").eq("trainer_id", user.id).order("created_at", { ascending: false });
    setGroups((data as TrainingGroup[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchGroups(); }, [fetchGroups]);

  const fetchGroupDetail = useCallback(async (groupId: string) => {
    if (!user) return;
    setLoadingDetail(true);
    const [membersRes, exercisesRes] = await Promise.all([
      supabase.from("training_group_members").select("*").eq("group_id", groupId),
      supabase.from("group_exercises").select("*").eq("group_id", groupId).order("day"),
    ]);
    setMembers((membersRes.data as GroupMember[]) || []);
    setExercises((exercisesRes.data as GroupExercise[]) || []);
    setLoadingDetail(false);
  }, [user]);

  useEffect(() => { if (selectedGroupId) fetchGroupDetail(selectedGroupId); }, [selectedGroupId, fetchGroupDetail]);

  const createGroup = async () => {
    if (!user || !newGroupName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("training_groups").insert({ trainer_id: user.id, name: newGroupName.trim() });
    if (error) toast.error("Error al crear grupo");
    else { toast.success("Grupo creado"); setNewGroupName(""); fetchGroups(); }
    setCreating(false);
  };

  const deleteGroup = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from("group_exercises").delete().eq("group_id", deleteTarget.id);
    await supabase.from("training_group_members").delete().eq("group_id", deleteTarget.id);
    const { error } = await supabase.from("training_groups").delete().eq("id", deleteTarget.id);
    if (error) toast.error("Error al eliminar grupo");
    else { toast.success("Grupo eliminado"); if (selectedGroupId === deleteTarget.id) setSelectedGroupId(null); fetchGroups(); }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const toggleStudentSelection = (id: string) => {
    setSelectedStudentIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const addMembers = async () => {
    if (!user || !selectedGroupId || selectedStudentIds.size === 0) return;
    const studentIds = Array.from(selectedStudentIds);
    const inserts = studentIds.map((sid) => ({ group_id: selectedGroupId, student_id: sid }));
    const { error } = await supabase.from("training_group_members").insert(inserts);
    if (error) { toast.error("Error al agregar miembros"); return; }

    // Auto-archive individual routines and assign group routine
    for (const sid of studentIds) {
      try {
        await assignGroupRoutineToStudent(user.id, sid, selectedGroupId);
      } catch (e) {
        console.error("Error assigning group routine to student", sid, e);
      }
    }

    toast.success(`${inserts.length} alumno(s) agregado(s). Rutinas grupales asignadas.`);
    setSelectedStudentIds(new Set());
    setShowAddMembers(false);
    fetchGroupDetail(selectedGroupId);
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("training_group_members").delete().eq("id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Miembro eliminado del grupo");
  };

  const bodyPart1 = exForm.bodyPart as BodyPart;
  const bodyPart2 = exForm.bodyPart2 as BodyPart;
  const availableExercises = [
    ...(bodyPart1 ? EXERCISES_BY_BODY_PART[bodyPart1] || [] : []),
    ...(bodyPart2 && bodyPart2 !== bodyPart1 ? EXERCISES_BY_BODY_PART[bodyPart2] || [] : []),
  ];
  const combinedBodyPart = [exForm.bodyPart, exForm.bodyPart2].filter(Boolean).join(" y ");

  const addExercise = async () => {
    if (!user || !selectedGroupId) return;
    if (!exForm.name || !exForm.sets || !exForm.day || !exForm.bodyPart) { toast.error("Completa todos los campos obligatorios"); return; }
    if (!exForm.isToFailure && !exForm.reps) { toast.error("Completa las repeticiones o activa 'Al Fallo'"); return; }
    const { error } = await supabase.from("group_exercises").insert({
      group_id: selectedGroupId, trainer_id: user.id, name: exForm.name,
      sets: parseInt(exForm.sets), reps: exForm.isToFailure ? 0 : parseInt(exForm.reps),
      weight: 0, day: exForm.day, body_part: combinedBodyPart || exForm.bodyPart, is_to_failure: exForm.isToFailure,
    });
    if (error) toast.error("Error al agregar ejercicio");
    else { toast.success("Ejercicio agregado al grupo"); setExForm({ name: "", sets: "", reps: "", day: "", bodyPart: "", bodyPart2: "", isToFailure: false }); fetchGroupDetail(selectedGroupId); }
  };

  const removeExercise = async (id: string) => {
    await supabase.from("group_exercises").delete().eq("id", id);
    setExercises((prev) => prev.filter((e) => e.id !== id));
    toast.success("Ejercicio eliminado");
  };

  const selectedGroup = groups.find((g) => g.id === selectedGroupId);
  const memberStudentIds = new Set(members.map((m) => m.student_id));
  const availableStudentsForGroup = students.filter((s) => !memberStudentIds.has(s.user_id));

  if (loading || loadingStudents) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-bold tracking-tight neon-text uppercase">
          Grupos de Entrenamiento
        </h1>
        <p className="text-muted-foreground text-sm">
          Crea grupos y asigna rutinas compartidas
        </p>
      </div>

      <Card className="card-glass">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <Input placeholder="Nombre del grupo (ej: Principiantes Mañana)" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createGroup()} className="flex-1" />
            <Button onClick={createGroup} disabled={creating || !newGroupName.trim()} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Crear</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mis Grupos</h2>
          {groups.length === 0 ? (
            <Card className="card-glass"><CardContent className="p-6 text-center"><Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Sin grupos creados</p></CardContent></Card>
          ) : groups.map((g) => (
            <Card key={g.id} className={`card-glass cursor-pointer transition-all duration-300 ${selectedGroupId === g.id ? "neon-border" : "hover:neon-border"}`} onClick={() => setSelectedGroupId(g.id)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="h-4 w-4 text-primary" /></div>
                  <span className="font-medium text-sm">{g.name}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(g); }}><Trash2 className="h-3.5 w-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedGroup ? (
          <div className="lg:col-span-2 space-y-4">
            {loadingDetail ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : (
              <>
                <Card className="card-glass">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Miembros de "{selectedGroup.name}"</CardTitle>
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowAddMembers(!showAddMembers)}>
                        {showAddMembers ? <X className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
                        {showAddMembers ? "Cerrar" : "Agregar"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {showAddMembers && (
                      <div className="p-3 rounded-lg bg-secondary/30 space-y-3">
                        <p className="text-xs font-semibold text-primary">Selecciona alumnos para agregar</p>
                        {availableStudentsForGroup.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Todos tus alumnos ya están en este grupo</p>
                        ) : (
                          <>
                            <div className="space-y-2 max-h-40 overflow-y-auto">
                              {availableStudentsForGroup.map((s) => (
                                <label key={s.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40 cursor-pointer">
                                  <Checkbox checked={selectedStudentIds.has(s.user_id)} onCheckedChange={() => toggleStudentSelection(s.user_id)} />
                                  <span className="text-sm">{s.display_name}</span>
                                </label>
                              ))}
                            </div>
                            <Button size="sm" onClick={addMembers} disabled={selectedStudentIds.size === 0} className="gap-1"><UserPlus className="h-3 w-3" /> Agregar ({selectedStudentIds.size})</Button>
                          </>
                        )}
                      </div>
                    )}
                    {members.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Sin miembros</p>
                    ) : (
                      <div className="space-y-1">
                        {members.map((m) => {
                          const student = students.find((s) => s.user_id === m.student_id);
                          return (
                            <div key={m.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                              <span className="text-sm">{student?.display_name || m.student_id}</span>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeMember(m.id)}><X className="h-3.5 w-3.5" /></Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="card-glass neon-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" />Rutina del Grupo</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button variant="outline" className="flex-1 h-auto flex flex-col items-center justify-center gap-3 hover:bg-secondary/50 group py-6" onClick={() => setShowInlineRoutine(!showInlineRoutine)}>
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Eye className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold text-center leading-tight">Ver rutina del grupo</span>
                      </Button>

                      <Button variant="outline" className="flex-1 h-auto flex flex-col items-center justify-center gap-3 hover:bg-secondary/50 group py-6" onClick={() => navigate(`/trainer/routines/group/${selectedGroupId}`)}>
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Edit3 className="h-5 w-5 text-accent" />
                        </div>
                        <span className="font-semibold text-center leading-tight">Editar rutina del grupo</span>
                      </Button>
                    </div>

                    {showInlineRoutine && (
                      <div className="pt-6 border-t border-border animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between mb-4">
                           <h3 className="font-semibold text-sm">Vista previa de la rutina</h3>
                        </div>
                        {exercises.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4 bg-secondary/20 rounded-lg">Sin ejercicios asignados al grupo</p>
                        ) : (
                          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                            {DAYS.map((day) => {
                              const dayExs = exercises.filter((e) => e.day === day);
                              if (dayExs.length === 0) return null;
                              return (
                                <div key={day}>
                                  <Badge variant="outline" className="mb-2 border-primary/30 text-primary text-[10px]">{day}</Badge>
                                  {dayExs.map((ex) => (
                                    <div key={ex.id} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/30 mb-1">
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm">{ex.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {ex.body_part && <span className="text-primary">{ex.body_part} · </span>}
                                          {ex.sets}×{ex.is_to_failure ? <span className="text-amber-400 font-semibold">Al Fallo</span> : ex.reps}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center py-16">
            <p className="text-muted-foreground text-sm">Selecciona un grupo para ver su detalle</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar grupo "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán todos los miembros y ejercicios del grupo. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteGroup} disabled={deleting}>{deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
