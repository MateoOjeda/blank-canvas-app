import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAssessments, fetchInjuriesByStudent, fetchGoalsByStudent,
  fetchNotes, fetchStudentNotes,
  Assessment, Injury, Goal, TrackingNote, StudentNote
} from "@/services/tracking";
import { fetchExerciseLogs, type ExerciseLogDay } from "@/services/exerciseLogs";
import { toast } from "sonner";

export { type ExerciseLogDay } from "@/services/exerciseLogs";

interface UseStudentTrackingResult {
  assessments: Assessment[];
  injuries: Injury[];
  goals: Goal[];
  notes: TrackingNote[];
  studentNotes: StudentNote[];
  exerciseLogs: ExerciseLogDay[];
  loading: boolean;
  permissionDenied: boolean;
  error: string | null;
  // Setters for optimistic updates
  setAssessments: React.Dispatch<React.SetStateAction<Assessment[]>>;
  setInjuries: React.Dispatch<React.SetStateAction<Injury[]>>;
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  setNotes: React.Dispatch<React.SetStateAction<TrackingNote[]>>;
  setStudentNotes: React.Dispatch<React.SetStateAction<StudentNote[]>>;
}

/**
 * Helper to determine if a caught error represents a Firestore permission denial.
 */
function isPermissionError(err: any): boolean {
  return (
    err?.code === "permission-denied" ||
    err?.message?.includes("permission") ||
    err?.toString()?.includes("permission-denied")
  );
}

/**
 * Loads all tracking data for a student in parallel.
 * Uses a single fetch per collection to minimize Firestore reads.
 * Injuries and goals are fetched by student_id (student-owned).
 * Trainer notes are fetched by trainer_id + student_id (trainer-owned).
 * Student notes are fetched by student_id (student-owned).
 */
export function useStudentTracking(studentId: string | null): UseStudentTrackingResult {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [notes, setNotes] = useState<TrackingNote[]>([]);
  const [studentNotes, setStudentNotes] = useState<StudentNote[]>([]);
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLogDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);
    setPermissionDenied(false);
    setError(null);

    let hasPermissionError = false;

    const handleSubQueryError = (err: any, queryName: string) => {
      console.error(`Error fetching ${queryName}:`, err);
      if (isPermissionError(err)) {
        hasPermissionError = true;
      }
    };

    try {
      // Fetch each collection independently so a single Firestore query failure
      // (e.g. missing composite index) doesn't prevent the others from loading.
      const [a, inj, g, n, sn] = await Promise.all([
        fetchAssessments(user.uid, studentId).catch((err) => {
          handleSubQueryError(err, "assessments");
          return [] as typeof assessments;
        }),
        fetchInjuriesByStudent(studentId).catch((err) => {
          handleSubQueryError(err, "injuries");
          return [] as typeof injuries;
        }),
        fetchGoalsByStudent(studentId).catch((err) => {
          handleSubQueryError(err, "goals");
          return [] as typeof goals;
        }),
        fetchNotes(user.uid, studentId).catch((err) => {
          handleSubQueryError(err, "trainer notes");
          return [] as typeof notes;
        }),
        fetchStudentNotes(studentId).catch((err) => {
          handleSubQueryError(err, "student notes");
          return [] as typeof studentNotes;
        }),
      ]);

      setAssessments(a);
      setInjuries(inj);
      setGoals(g);
      setNotes(n);
      setStudentNotes(sn);

      // Exercise logs — isolated query with its own try-catch
      try {
        const logs = await fetchExerciseLogs(studentId, user.uid);
        setExerciseLogs(logs);
      } catch (exerciseErr: any) {
        handleSubQueryError(exerciseErr, "exercise logs");
      }

      if (hasPermissionError) {
        setPermissionDenied(true);
        const permErrMsg = "No tienes permiso para ver el seguimiento de este alumno.";
        setError(permErrMsg);
        toast.error(permErrMsg);
      }
    } catch (err: any) {
      console.error("Error loading student tracking data:", err);
      if (isPermissionError(err)) {
        setPermissionDenied(true);
        const permErrMsg = "No tienes permiso para ver el seguimiento de este alumno.";
        setError(permErrMsg);
        toast.error(permErrMsg);
      } else {
        setError(err?.message || "Error al cargar los datos de seguimiento");
      }
    } finally {
      setLoading(false);
    }
  }, [user, studentId]);

  useEffect(() => {
    setAssessments([]);
    setInjuries([]);
    setGoals([]);
    setNotes([]);
    setStudentNotes([]);
    setExerciseLogs([]);
    setPermissionDenied(false);
    setError(null);
    if (studentId) {
      fetchAll();
    }
  }, [studentId, fetchAll]);

  return {
    assessments, injuries, goals, notes, studentNotes, exerciseLogs, loading,
    permissionDenied, error,
    setAssessments, setInjuries, setGoals, setNotes, setStudentNotes,
  };
}
