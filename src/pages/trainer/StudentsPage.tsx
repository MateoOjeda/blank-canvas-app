import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface LinkedStudent {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  weight: number | null;
  age: number | null;
  linked_at: string;
}

interface SearchResult {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  const fetchLinkedStudents = useCallback(async () => {
    if (!user) return;
    const { data: links } = await supabase
      .from("trainer_students")
      .select("student_id, created_at")
      .eq("trainer_id", user.id);

    if (!links || links.length === 0) {
      setLinkedStudents([]);
      setLoading(false);
      return;
    }

    const studentIds = links.map((l) => l.student_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_initials, weight, age")
      .in("user_id", studentIds);

    const merged: LinkedStudent[] = (profiles || []).map((p) => ({
      ...p,
      linked_at: links.find((l) => l.student_id === p.user_id)?.created_at || "",
    }));

    setLinkedStudents(merged);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLinkedStudents();
  }, [fetchLinkedStudents]);

  const handleSearch = async () => {
    if (!user || searchQuery.trim().length < 2) return;
    setSearching(true);

    // Get already linked student ids
    const { data: links } = await supabase
      .from("trainer_students")
      .select("student_id")
      .eq("trainer_id", user.id);

    const linkedIds = (links || []).map((l) => l.student_id);
    // Also exclude the trainer themselves
    const excludeIds = [...linkedIds, user.id];

    // Get users with student role
    const { data: studentRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "student");

    const studentUserIds = (studentRoles || [])
      .map((r) => r.user_id)
      .filter((id) => !excludeIds.includes(id));

    if (studentUserIds.length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_initials")
      .in("user_id", studentUserIds)
      .ilike("display_name", `%${searchQuery.trim()}%`);

    setSearchResults(profiles || []);
    setSearching(false);
  };

  const linkStudent = async (studentId: string) => {
    if (!user) return;
    setLinking(studentId);

    const { error } = await supabase.from("trainer_students").insert({
      trainer_id: user.id,
      student_id: studentId,
    });

    if (error) {
      toast.error("Error al vincular alumno");
    } else {
      toast.success("Alumno vinculado correctamente");
      setSearchResults((prev) => prev.filter((s) => s.user_id !== studentId));
      fetchLinkedStudents();
    }
    setLinking(null);
  };

  const unlinkStudent = async (studentId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("trainer_students")
      .delete()
      .eq("trainer_id", user.id)
      .eq("student_id", studentId);

    if (error) {
      toast.error("Error al desvincular alumno");
    } else {
      toast.success("Alumno desvinculado");
      fetchLinkedStudents();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-wide neon-text">Mis Alumnos</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestiona y supervisa a tus alumnos</p>
        </div>
        <Button
          onClick={() => setShowSearch(!showSearch)}
          variant={showSearch ? "secondary" : "default"}
          size="sm"
          className="gap-2"
        >
          {showSearch ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showSearch ? "Cerrar" : "Agregar alumno"}
        </Button>
      </div>

      {/* Stats */}
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

      {/* Search Section */}
      {showSearch && (
        <Card className="card-glass border-primary/20">
          <CardContent className="p-4 space-y-4">
            <h2 className="font-semibold text-sm text-primary">Buscar alumno registrado</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Nombre del alumno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={searching || searchQuery.trim().length < 2} size="sm">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((s) => (
                  <div
                    key={s.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-primary/20">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {s.avatar_initials || s.display_name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{s.display_name}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 border-primary/30 text-primary hover:bg-primary/10"
                      disabled={linking === s.user_id}
                      onClick={() => linkStudent(s.user_id)}
                    >
                      {linking === s.user_id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserPlus className="h-3 w-3" />
                      )}
                      Vincular
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                No se encontraron alumnos con ese nombre
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Linked Students List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : linkedStudents.length === 0 ? (
          <Card className="card-glass">
            <CardContent className="p-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Aún no tienes alumnos vinculados. Usa el botón "Agregar alumno" para buscar y vincular.
              </p>
            </CardContent>
          </Card>
        ) : (
          linkedStudents.map((student) => (
            <Card key={student.user_id} className="card-glass hover:neon-border transition-all duration-300">
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-12 w-12 border-2 border-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {student.avatar_initials || student.display_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{student.display_name}</h3>
                  <p className="text-xs text-muted-foreground">
                    Vinculado: {new Date(student.linked_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  {student.weight && (
                    <div className="text-center">
                      <p className="font-bold">{student.weight} kg</p>
                      <p className="text-[10px] text-muted-foreground">Peso</p>
                    </div>
                  )}
                  {student.age && (
                    <div className="text-center">
                      <p className="font-bold">{student.age}</p>
                      <p className="text-[10px] text-muted-foreground">Edad</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 text-primary text-xs">
                    Activo
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => unlinkStudent(student.user_id)}
                    title="Desvincular alumno"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
