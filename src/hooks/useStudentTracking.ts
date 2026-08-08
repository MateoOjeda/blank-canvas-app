import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection, query, where, getDocs, orderBy, limit
} from "firebase/firestore";
import {
  fetchAssessments, fetchInjuriesByStudent, fetchGoalsByStudent,
  fetchNotes, fetchStudentNotes,
  Assessment, Injury, Goal, TrackingNote, StudentNote
} from "@/services/tracking";

export interface ExerciseLogDay {
  log_date: string;
  completed: boolean;
}

interface UseStudentTrackingResult {
  assessments: Assessment[];
  injuries: Injury[];
  goals: Goal[];
  notes: TrackingNote[];
  studentNotes: StudentNote[];
  exerciseLogs: ExerciseLogDay[];
  loading: boolean;
  // Setters for optimistic updates
  setAssessments: React.Dispatch<React.SetStateAction<Assessment[]>>;
  setInjuries: React.Dispatch<React.SetStateAction<Injury[]>>;
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  setNotes: React.Dispatch<React.SetStateAction<TrackingNote[]>>;
  setStudentNotes: React.Dispatch<React.SetStateAction<StudentNote[]>>;
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

  const fetchAll = useCallback(async () => {
    if (!user || !studentId) return;
    setLoading(true);

    try {
      const [a, inj, g, n, sn] = await Promise.all([
        fetchAssessments(user.uid, studentId),
        fetchInjuriesByStudent(studentId),
        fetchGoalsByStudent(studentId),
        fetchNotes(user.uid, studentId),
        fetchStudentNotes(studentId),
      ]);

      // Exercise logs — last 200 entries for calendar/alerts/training tab
      const q = query(
        collection(db, "exercise_logs"),
        where("student_id", "==", studentId),
        where("trainer_id", "==", user.uid),
        orderBy("log_date", "desc"),
        limit(200)
      );
      const snap = await getDocs(q);
      const logs: ExerciseLogDay[] = snap.docs.map((d) => ({
        log_date: d.data().log_date,
        completed: !!d.data().completed,
      }));

      setAssessments(a);
      setInjuries(inj);
      setGoals(g);
      setNotes(n);
      setStudentNotes(sn);
      setExerciseLogs(logs);
    } catch (err) {
      console.error("Error loading student tracking data:", err);
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
    if (studentId) {
      fetchAll();
    }
  }, [studentId, fetchAll]);

  return {
    assessments, injuries, goals, notes, studentNotes, exerciseLogs, loading,
    setAssessments, setInjuries, setGoals, setNotes, setStudentNotes,
  };
}
