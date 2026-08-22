import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchPhotoSessions,
  addPhotoSession,
  updatePhotoSession,
  deletePhotoSession,
  PhotoSession,
  PhotoSessionInput,
} from "@/services/photoSessions";
import type { DocumentSnapshot } from "firebase/firestore";

const PAGE_SIZE = 10;

interface UsePhotoSessionsResult {
  sessions: PhotoSession[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  addSession: (data: PhotoSessionInput) => Promise<PhotoSession>;
  editSession: (
    id: string,
    data: Partial<Pick<PhotoSession, "session_date" | "notes" | "photos">>
  ) => Promise<void>;
  removeSession: (id: string) => Promise<void>;
}

export function usePhotoSessions(studentId: string | null): UsePhotoSessionsResult {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<PhotoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);

  const fetchFirst = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);
    setError(null);
    try {
      const { sessions: data, lastDoc: ld } = await fetchPhotoSessions(
        studentId,
        PAGE_SIZE
      );
      setSessions(data);
      setLastDoc(ld);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err: unknown) {
      console.error("Error fetching photo sessions:", err);
      const error = err as { code?: string } | undefined;
      const msg = error?.code === "failed-precondition"
        ? "Índice Firestore no desplegado para sesiones de fotos."
        : error?.code === "permission-denied"
          ? "Sin permiso para ver las sesiones de fotos."
          : "Error al cargar sesiones de fotos.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user, studentId]);

  const loadMore = useCallback(async () => {
    if (!user || !studentId || !lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const { sessions: data, lastDoc: ld } = await fetchPhotoSessions(
        studentId,
        PAGE_SIZE,
        lastDoc
      );
      setSessions((prev) => [...prev, ...data]);
      setLastDoc(ld);
      setHasMore(data.length === PAGE_SIZE);
    } catch (err) {
      console.error("Error loading more photo sessions:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [user, studentId, lastDoc, loadingMore]);

  useEffect(() => {
    setSessions([]);
    setLastDoc(null);
    setHasMore(true);
    if (studentId) fetchFirst();
  }, [studentId, fetchFirst]);

  const addSession = useCallback(
    async (data: PhotoSessionInput): Promise<PhotoSession> => {
      const id = await addPhotoSession(data);
      const session: PhotoSession = { id, ...data };
      // Insert in chronological order (newest first)
      setSessions((prev) => [session, ...prev].sort(
        (a, b) => b.session_date.localeCompare(a.session_date)
      ));
      return session;
    },
    []
  );

  const editSession = useCallback(
    async (
      id: string,
      data: Partial<Pick<PhotoSession, "session_date" | "notes" | "photos">>
    ) => {
      await updatePhotoSession(id, data);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s))
      );
    },
    []
  );

  const removeSession = useCallback(async (id: string) => {
    await deletePhotoSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return {
    sessions,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    addSession,
    editSession,
    removeSession,
  };
}
