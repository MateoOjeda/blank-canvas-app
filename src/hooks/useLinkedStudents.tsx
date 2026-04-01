import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface LinkedStudentProfile {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
  weight: number | null;
  age: number | null;
}

export function useLinkedStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState<LinkedStudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data: links } = await supabase
      .from("trainer_students")
      .select("student_id")
      .eq("trainer_id", user.id);

    if (!links || links.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const ids = links.map((l) => l.student_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_initials, avatar_url, weight, age")
      .in("user_id", ids);

    setStudents(profiles || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { students, loading, refetch: fetch };
}
