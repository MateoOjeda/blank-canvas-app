import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchRecoveryLogs,
  addRecoveryLog,
  deleteRecoveryLog,
  RecoveryLog,
  RecoveryLogInput,
} from "@/services/recovery";

interface UseStudentRecoveryResult {
  logs: RecoveryLog[];
  loading: boolean;
  addLog: (data: RecoveryLogInput) => Promise<RecoveryLog>;
  removeLog: (id: string) => Promise<void>;
  setLogs: React.Dispatch<React.SetStateAction<RecoveryLog[]>>;
}

export function useStudentRecovery(studentId: string | null): UseStudentRecoveryResult {
  const { user } = useAuth();
  const [logs, setLogs] = useState<RecoveryLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);
    try {
      const data = await fetchRecoveryLogs(user.uid, studentId);
      setLogs(data);
    } catch (err) {
      console.error("Error fetching recovery logs:", err);
    } finally {
      setLoading(false);
    }
  }, [user, studentId]);

  useEffect(() => {
    setLogs([]);
    if (studentId) fetchAll();
  }, [studentId, fetchAll]);

  const addLog = useCallback(
    async (data: RecoveryLogInput): Promise<RecoveryLog> => {
      const id = await addRecoveryLog(data);
      const log: RecoveryLog = { id, ...data };
      setLogs((prev) => [log, ...prev]);
      return log;
    },
    []
  );

  const removeLog = useCallback(async (id: string) => {
    await deleteRecoveryLog(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  return { logs, loading, addLog, removeLog, setLogs };
}
