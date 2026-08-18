import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { chunkArray } from "@/lib/chunking";

export interface LinkedStudentProfile {
  user_id: string;
  display_name: string;
  avatar_initials: string | null;
  avatar_url: string | null;
  weight: number | null;
  age: number | null;
}

export async function fetchLinkedStudentProfiles(
  trainerId: string
): Promise<LinkedStudentProfile[]> {
  const qLinks = query(
    collection(db, "trainer_students"),
    where("trainer_id", "==", trainerId)
  );
  const snapLinks = await getDocs(qLinks);

  if (snapLinks.empty) return [];

  const ids = snapLinks.docs.map(d => d.data().student_id);
  const chunks = chunkArray(ids, 30);

  const profilesSnaps = await Promise.all(
    chunks.map(chunk =>
      getDocs(query(collection(db, "profiles"), where("user_id", "in", chunk)))
    )
  );

  return profilesSnaps.flatMap(snap =>
    snap.docs.map(d => ({ ...d.data() } as LinkedStudentProfile))
  );
}
