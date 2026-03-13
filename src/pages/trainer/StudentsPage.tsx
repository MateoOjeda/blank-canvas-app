import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, UserPlus, X, Loader2, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface LinkedStudent {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
  weight: number | null;
  age: number | null;
  linked_at: string;
  highestLevel: string;
  unlockedCount: number;
  planType: string;
  linkId: string;
}

interface SearchResult {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
}

const PLAN_TYPE_OPTIONS = ["Estándar", "Personalizado", "Premium", "Grupal"];

export default function StudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LinkedStudent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLinkedStudents = useCallback(async () => {
    if (!user) return;
    const { data: links } = await supabase
      .from("trainer_students")
      .select("id, student_id, created_at, plan_type")
      .eq("trainer_id", user.id);

    if (!links || links.length === 0) {
      setLinkedStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = links.map((l) => l.student_id);

    const [profilesRes, levelsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, avatar_initials, avatar_url, weight, age").in("user_id", studentIds),
      supabase.from("plan_levels").select("student_id, level, unlocked").eq("trainer_id", user.id).in("student_id", studentIds),
    ]);

    const profiles = profilesRes.data || [];
    const levels = levelsRes.data || [];

    const getHighest = (sid: string): string => {
      const unlocked = levels.filter((l) => l.student_id === sid && l.unlocked);
      if (unlocked.find((l) => l.level === "avanzado")) return "Avanzado";
      if (unlocked.find((l) => l.level === "intermedio")) return "Intermedio";
      if (unlocked.find((l) => l.level === "principiante")) return "Principiante";
      return "Sin desbloquear";
    };

    const merged: LinkedStudent[] = profiles.map((p: any) => {
      const link = links.find((l) => l.student_id === p.user_id);
      return {
        ...p,
        linked_at: link?.created_at || "",
        highestLevel: getHighest(p.user_id),
        unlockedCount: levels.filter((l) => l.student_id === p.user_id && l.unlocked).length,
        planType: (link as any)?.plan_type || "Estándar",
        linkId: link?.id || "",
      };
    });

    setLinkedStudents(merged);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  const handleSearch = async () => {
    if (!user || searchQuery.trim().length < 2) return;
    setSearching(true);
    const { data: links } = await supabase.from("trainer_students").select("student_id").eq("trainer_id", user.id);
    const linkedIds = (links || []).map((l) => l.student_id);
    const excludeIds = [...linkedIds, user.id];
    const { data: studentRoles } = await supabase.from("user_roles").select("user_id").eq("role", "student");
    const studentUserIds = (studentRoles || []).map((r) => r.user_id).filter((id) => !excludeIds.includes(id));
    if (studentUserIds.length === 0) { setSearchResults([]); setSearching(false); return; }
    const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_initials").in("user_id", studentUserIds).ilike("display_name", `%${searchQuery.trim()}%`);
    setSearchResults(profiles || []);
    setSearching(false);
  };

  const linkStudent = async (studentId: string) => {
    if (!user) return;
    setLinking(studentId);
    const { error } = await supabase.from("trainer_students").insert({ trainer_id: user.id, student_id: studentId });
    if (error) toast.error("Error al vincular alumno");
    else {
      toast.success("Alumno vinculado correctamente");
      setSearchResults((prev) => prev.filter((s) => s.user_id !== studentId));
      fetchLinkedStudents();
    }
    setLinking(null);
  };

  const updatePlanType = async (linkId: string, planType: string) => {
    const { error } = await supabase.from("trainer_students").update({ plan_type: planType } as any).eq("id", linkId);
    if (error) toast.error("Error al actualizar tipo de plan");
    else {
      setLinkedStudents((prev) => prev.map((s) => s.linkId === linkId ? { ...s, planType } : s));
      toast.success("Tipo de plan actualizado");
    }
  };

  const confirmDeleteStudent = async () => {
    if (!user || !deleteTarget) return;
    setDeleting(true);
    const sid = deleteTarget.user_id;
    await Promise.all([
      supabase.from("exercise_logs").delete().eq("student_id", sid).eq("trainer_id", user.id),
      supabase.from("exercises").delete().eq("student_id", sid).eq("trainer_id", user.id),
      supabase.from("plan_levels").delete().eq("student_id", sid).eq("trainer_id", user.id),
      supabase.from("trainer_changes").delete().eq("student_id", sid).eq("trainer_id", user.id),
    ]);
    const { error } = await supabase.from("trainer_students").delete().eq("trainer_id", user.id).eq("student_id", sid);
    if (error) toast.error("Error al eliminar alumno");
    else {
      toast.success("Alumno eliminado permanentemente");
      fetchLinkedStudents();
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Alumnos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona y supervisa a tus alumnos</p>
        </div>
        <Button onClick={() => setShowSearch(!showSearch)} variant={showSearch ? "secondary" : "default"} size="sm" className="gap-2">
          {showSearch ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showSearch ? "Cerrar" : "Agregar alumno"}
        </Button>
      </div>

      <Card className="card-glass">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{linkedStudents.length}</p>
            <p className="text-xs text-muted-foreground">Alumnos vinculados</p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      {showSearch && (
        <Card className="card-glass border-primary/20">
          <CardContent className="p-4 space-y-4">
            <h2 className="font-semibold text-sm text-primary">Buscar alumno registrado</h2>
            <div className="flex gap-2">
              <Input placeholder="Nombre del alumno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1" />
              <Button onClick={handleSearch} disabled={searching || searchQuery.trim().length < 2} size="sm">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((s) => (
                  <div key={s.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {s.avatar_initials || s.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{s.display_name}</span>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1 border-primary/30 text-primary hover:bg-primary/10" disabled={linking === s.user_id} onClick={() => linkStudent(s.user_id)}>
                      {linking === s.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                      Vincular
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
              <p className="text-xs text-muted-foreground text-center py-2">No se encontraron alumnos con ese nombre</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Student List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : linkedStudents.length === 0 ? (
          <Card className="card-glass">
            <CardContent className="p-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Aún no tienes alumnos vinculados.</p>
            </CardContent>
          </Card>
        ) : (
          linkedStudents.map((student) => (
            <Card
              key={student.user_id}
              className="card-glass hover:neon-border transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/trainer/students/${student.user_id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarImage src={student.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {student.avatar_initials || student.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{student.display_name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px] border-accent/40 text-accent">
                      {student.planType}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {student.highestLevel}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{student.unlockedCount}/12</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Select
                    value={student.planType}
                    onValueChange={(v) => { updatePlanType(student.linkId, v); }}
                  >
                    <SelectTrigger
                      className="h-7 text-[10px] w-28 bg-secondary/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAN_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(student); }}
                    title="Eliminar alumno"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar alumno permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar a <strong>{deleteTarget?.display_name}</strong> de forma permanente?
              Esta acción eliminará todos los ejercicios, planes, registros y seguimiento asociados.
              <span className="block mt-2 font-semibold text-destructive">Esta acción no se puede deshacer.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteStudent}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sí, eliminar permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
