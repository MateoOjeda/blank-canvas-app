import { db } from "@/lib/firebase";
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
} from "firebase/firestore";

// ─── Shared ───────────────────────────────────────────────────────────────────

/** Habit fields inside a tracking_assessments document */
export interface HabitsMap {
  sleep: boolean;
  water: boolean;
  fruits: boolean;
  vegetables: boolean;
  walking: boolean;
  cardio: boolean;
  stretching: boolean;
  supplements: boolean;
  alcohol: boolean;  // true = consumed (negative)
  smoking: boolean;  // true = consumed (negative)
}

export const HABIT_KEYS: (keyof HabitsMap)[] = [
  "sleep", "water", "fruits", "vegetables",
  "walking", "cardio", "stretching", "supplements",
  "alcohol", "smoking",
];

export const HABIT_LABELS: Record<keyof HabitsMap, string> = {
  sleep: "Sueño",
  water: "Agua",
  fruits: "Frutas",
  vegetables: "Verduras",
  walking: "Caminata",
  cardio: "Cardio",
  stretching: "Elongación",
  supplements: "Suplementos",
  alcohol: "Alcohol",
  smoking: "Tabaco",
};

/** true = positive habit (checked = good); false = negative (checked = bad) */
export const HABIT_POSITIVE: Record<keyof HabitsMap, boolean> = {
  sleep: true, water: true, fruits: true, vegetables: true,
  walking: true, cardio: true, stretching: true, supplements: true,
  alcohol: false, smoking: false,
};

// ─── Assessment (Physical + Nutrition + Habits + Mood — merged) ───────────────

export interface Assessment {
  id: string;
  trainer_id: string;
  student_id: string;
  recorded_at: string; // ISO datetime
  // Physical
  weight?: number | null;
  body_fat?: number | null;
  muscle_mass?: number | null;
  arm?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  thigh?: number | null;
  calf?: number | null;
  // Nutrition
  water_liters?: number | null;
  protein_g?: number | null;
  calories_kcal?: number | null;
  free_meals?: number | null;
  diet_compliance_pct?: number | null;
  // Habits
  habits?: Partial<HabitsMap>;
  // Mood
  mood?: 1 | 2 | 3 | 4 | 5 | null;
  notes?: string;
}

export async function fetchAssessments(
  trainerId: string,
  studentId: string
): Promise<Assessment[]> {
  const q = query(
    collection(db, "tracking_assessments"),
    where("trainer_id", "==", trainerId),
    where("student_id", "==", studentId),
    orderBy("recorded_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Assessment));
}

export async function addAssessment(
  data: Omit<Assessment, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "tracking_assessments"), data);
  return ref.id;
}

export async function deleteAssessment(id: string): Promise<void> {
  await deleteDoc(doc(db, "tracking_assessments", id));
}

// ─── Injuries ─────────────────────────────────────────────────────────────────

export type InjuryStatus = "activa" | "recuperada";

export interface Injury {
  id: string;
  trainer_id: string;
  student_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  location: string;
  zone?: string;
  pain_level: number; // 1–10
  intensity?: string;
  status: InjuryStatus;
  observations?: string;
  notes?: string;
}

export async function fetchInjuries(
  trainerId: string,
  studentId: string
): Promise<Injury[]> {
  const q = query(
    collection(db, "tracking_injuries"),
    where("trainer_id", "==", trainerId),
    where("student_id", "==", studentId),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Injury));
}

/** Fetch all injuries for a student regardless of who created them */
export async function fetchInjuriesByStudent(
  studentId: string
): Promise<Injury[]> {
  const q = query(
    collection(db, "tracking_injuries"),
    where("student_id", "==", studentId),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Injury));
}

export async function addInjury(
  data: Omit<Injury, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "tracking_injuries"), data);
  return ref.id;
}

export async function updateInjury(
  id: string,
  data: Partial<Pick<Injury, "status" | "pain_level" | "observations" | "notes" | "updated_at">>
): Promise<void> {
  await updateDoc(doc(db, "tracking_injuries", id), data);
}

export async function deleteInjury(id: string): Promise<void> {
  await deleteDoc(doc(db, "tracking_injuries", id));
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export type GoalStatus = "en_progreso" | "logrado" | "abandonado";
export type GoalPriority = "alta" | "media" | "baja";

export interface Goal {
  id: string;
  trainer_id: string;
  student_id: string;
  created_by?: string;
  created_at: string;
  goal: string;
  category?: string;
  priority: GoalPriority;
  start_date: string;
  target_date: string;
  progress_pct: number; // 0–100
  status: GoalStatus;
}

export async function fetchGoals(
  trainerId: string,
  studentId: string
): Promise<Goal[]> {
  const q = query(
    collection(db, "tracking_goals"),
    where("trainer_id", "==", trainerId),
    where("student_id", "==", studentId),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
}

/** Fetch all goals for a student regardless of who created them */
export async function fetchGoalsByStudent(
  studentId: string
): Promise<Goal[]> {
  const q = query(
    collection(db, "tracking_goals"),
    where("student_id", "==", studentId),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal));
}

export async function addGoal(
  data: Omit<Goal, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "tracking_goals"), data);
  return ref.id;
}

export async function updateGoal(
  id: string,
  data: Partial<Pick<Goal, "progress_pct" | "status">>
): Promise<void> {
  await updateDoc(doc(db, "tracking_goals", id), data);
}

export async function deleteGoal(id: string): Promise<void> {
  await deleteDoc(doc(db, "tracking_goals", id));
}

// ─── Trainer Notes (trainer-owned) ──────────────────────────────────────────

export type NoteVisibility = "privada" | "publica";

export interface TrackingNote {
  id: string;
  trainer_id: string;
  student_id: string;
  created_at: string;
  content: string;
  visibility: NoteVisibility;
}

export async function fetchNotes(
  trainerId: string,
  studentId: string
): Promise<TrackingNote[]> {
  const q = query(
    collection(db, "tracking_notes"),
    where("trainer_id", "==", trainerId),
    where("student_id", "==", studentId),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TrackingNote));
}

export async function addNote(
  data: Omit<TrackingNote, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "tracking_notes"), data);
  return ref.id;
}

export async function deleteNote(id: string): Promise<void> {
  await deleteDoc(doc(db, "tracking_notes", id));
}

// ─── Student Notes (student-owned) ──────────────────────────────────────────

export interface StudentNote {
  id: string;
  student_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  content: string;
}

export async function fetchStudentNotes(
  studentId: string
): Promise<StudentNote[]> {
  const q = query(
    collection(db, "student_notes"),
    where("student_id", "==", studentId),
    orderBy("created_at", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentNote));
}

export async function addStudentNote(
  data: Omit<StudentNote, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, "student_notes"), data);
  return ref.id;
}

export async function updateStudentNote(
  id: string,
  data: Partial<Pick<StudentNote, "content" | "updated_at">>
): Promise<void> {
  await updateDoc(doc(db, "student_notes", id), data);
}

export async function deleteStudentNote(id: string): Promise<void> {
  await deleteDoc(doc(db, "student_notes", id));
}
