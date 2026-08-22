import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  deleteDoc,
  doc,
  limit,
  type Query,
  type DocumentData,
} from "firebase/firestore";

export interface Meal {
  id: string;
  title: string;
  content: string;
  meal_type: string;
  created_at: string;
}

export async function fetchStudentMeals(
  studentId: string,
  trainerId?: string
): Promise<Meal[]> {
  let q: Query<DocumentData>;
  if (trainerId && trainerId !== studentId) {
    q = query(
      collection(db, "student_meals"),
      where("student_id", "==", studentId),
      where("trainer_id", "==", trainerId),
      orderBy("created_at", "desc")
    );
  } else {
    q = query(
      collection(db, "student_meals"),
      where("student_id", "==", studentId),
      orderBy("created_at", "desc")
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Meal));
}

export async function fetchNutritionLevel(studentId: string): Promise<string> {
  const q = query(
    collection(db, "plan_levels"),
    where("student_id", "==", studentId),
    where("plan_type", "==", "nutricion"),
    where("unlocked", "==", true),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    return snap.docs[0].data().level;
  }
  return "principiante";
}

export async function addStudentMeal(
  trainerId: string,
  studentId: string,
  data: { title: string; ingredients: string; options: Array<{ name: string; description: string }> }
): Promise<void> {
  const mealData = {
    ingredients: data.ingredients.trim(),
    options: data.options.filter(o => o.name.trim() || o.description.trim()),
  };
  await addDoc(collection(db, "student_meals"), {
    trainer_id: trainerId,
    student_id: studentId,
    title: data.title.trim(),
    content: JSON.stringify(mealData),
    meal_type: "general",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function deleteStudentMeal(mealId: string): Promise<void> {
  await deleteDoc(doc(db, "student_meals", mealId));
}
