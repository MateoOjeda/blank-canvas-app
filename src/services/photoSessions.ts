import { db, storage } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PhotoPosition = "front" | "back" | "left" | "right";

export interface PhotoSessionPhotos {
  front?: string;
  back?: string;
  left?: string;
  right?: string;
  extra?: string[];
}

export interface PhotoSessionSnapshot {
  weight?: number | null;
  body_fat?: number | null;
  muscle_mass?: number | null;
  arm?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  thigh?: number | null;
  calf?: number | null;
}

export interface PhotoSession {
  id: string;
  trainer_id: string;
  student_id: string;
  created_at: string;    // ISO — when the record was created
  session_date: string;  // ISO date — user-chosen date for the session
  notes?: string;
  photos: PhotoSessionPhotos;
  snapshot?: PhotoSessionSnapshot;
}

export type PhotoSessionInput = Omit<PhotoSession, "id">;

// ─── Firestore CRUD ───────────────────────────────────────────────────────────

export async function fetchPhotoSessions(
  studentId: string,
  pageSize = 10,
  lastDoc?: DocumentSnapshot
): Promise<{ sessions: PhotoSession[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, "photo_sessions"),
    where("student_id", "==", studentId),
    orderBy("session_date", "desc"),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(
      collection(db, "photo_sessions"),
      where("student_id", "==", studentId),
      orderBy("session_date", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }

  const snap = await getDocs(q);
  const sessions = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PhotoSession));
  const newLastDoc = snap.docs[snap.docs.length - 1] ?? null;

  return { sessions, lastDoc: newLastDoc };
}

export async function addPhotoSession(
  data: PhotoSessionInput
): Promise<string> {
  const ref = await addDoc(collection(db, "photo_sessions"), data);
  return ref.id;
}

export async function updatePhotoSession(
  id: string,
  data: Partial<Pick<PhotoSession, "session_date" | "notes" | "photos">>
): Promise<void> {
  await updateDoc(doc(db, "photo_sessions", id), data);
}

export async function deletePhotoSession(id: string): Promise<void> {
  await deleteDoc(doc(db, "photo_sessions", id));
}

// ─── Firebase Storage helpers ─────────────────────────────────────────────────

/**
 * Uploads a photo for a given session and position.
 * Returns the download URL.
 */
export async function uploadSessionPhoto(
  sessionId: string,
  position: PhotoPosition | "extra",
  file: File,
  extraIndex?: number
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path =
    position === "extra"
      ? `photo_sessions/${sessionId}/extra_${extraIndex ?? Date.now()}.${ext}`
      : `photo_sessions/${sessionId}/${position}.${ext}`;

  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

/**
 * Deletes a photo from Storage by its download URL.
 * Silently fails if the file does not exist.
 */
export async function deleteStoragePhoto(url: string): Promise<void> {
  try {
    const photoRef = ref(storage, url);
    await deleteObject(photoRef);
  } catch {
    // Ignore "object not found" errors
  }
}
