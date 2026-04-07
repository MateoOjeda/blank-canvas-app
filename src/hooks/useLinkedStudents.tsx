import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from "firebase/firestore";

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

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Fetch student IDs linked to this trainer
      const qLinks = query(
        collection(db, "trainer_students"), 
        where("trainer_id", "==", user.uid)
      );
      const snapLinks = await getDocs(qLinks);
      
      if (snapLinks.empty) {
        setStudents([]);
        return;
      }

      const ids = snapLinks.docs.map(doc => doc.data().student_id);

      // 2. Fetch profiles for those IDs
      // Firestore 'in' query supports up to 30 elements. 
      // If there are more, we should chunk the query.
      // For this app, 30 is likely enough for a single trainer's view.
      const qProfiles = query(
        collection(db, "profiles"),
        where("user_id", "in", ids)
      );
      const snapProfiles = await getDocs(qProfiles);
      
      const profiles = snapProfiles.docs.map(doc => ({
        ...doc.data()
      } as LinkedStudentProfile));

      setStudents(profiles);
    } catch (err) {
      console.error("Error fetching linked students:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { students, loading, refetch: fetchData };
}
