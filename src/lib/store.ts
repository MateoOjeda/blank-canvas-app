import { useState } from "react";

export type DayOfWeek = "Lunes" | "Martes" | "Miércoles" | "Jueves" | "Viernes" | "Sábado" | "Domingo";

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
  day: DayOfWeek;
  completed: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string;
  age: number;
  weight: number;
  exercises: Exercise[];
  plans: Plan[];
  completedRoutines: number[];
}

const defaultPlans: Plan[] = [
  { id: "p1", name: "Plan Nutricional", description: "Dieta personalizada según tus objetivos", icon: "Apple", enabled: false },
  { id: "p2", name: "Plan de Fuerza", description: "Rutinas enfocadas en ganancia muscular", icon: "Dumbbell", enabled: true },
  { id: "p3", name: "Plan Cardio", description: "Entrenamiento cardiovascular intensivo", icon: "Heart", enabled: false },
  { id: "p4", name: "Plan Flexibilidad", description: "Estiramientos y movilidad articular", icon: "Stretch", enabled: false },
];

const initialStudents: Student[] = [
  {
    id: "s1",
    name: "Carlos López",
    email: "carlos@email.com",
    avatar: "CL",
    age: 28,
    weight: 78,
    exercises: [
      { id: "e1", name: "Press Banca", sets: 4, reps: 10, weight: 60, day: "Lunes", completed: false },
      { id: "e2", name: "Sentadilla", sets: 4, reps: 8, weight: 80, day: "Lunes", completed: false },
      { id: "e3", name: "Peso Muerto", sets: 3, reps: 6, weight: 100, day: "Miércoles", completed: false },
      { id: "e4", name: "Dominadas", sets: 3, reps: 10, weight: 0, day: "Miércoles", completed: true },
      { id: "e5", name: "Press Militar", sets: 3, reps: 10, weight: 40, day: "Viernes", completed: false },
      { id: "e6", name: "Curl Bíceps", sets: 3, reps: 12, weight: 15, day: "Viernes", completed: false },
    ],
    plans: [
      { ...defaultPlans[0], enabled: true },
      { ...defaultPlans[1], enabled: true },
      { ...defaultPlans[2], enabled: false },
      { ...defaultPlans[3], enabled: false },
    ],
    completedRoutines: [12, 15, 10, 18, 14, 20, 16],
  },
  {
    id: "s2",
    name: "María García",
    email: "maria@email.com",
    avatar: "MG",
    age: 24,
    weight: 62,
    exercises: [
      { id: "e7", name: "Hip Thrust", sets: 4, reps: 12, weight: 70, day: "Martes", completed: true },
      { id: "e8", name: "Zancadas", sets: 3, reps: 12, weight: 20, day: "Martes", completed: false },
      { id: "e9", name: "Prensa", sets: 4, reps: 10, weight: 120, day: "Jueves", completed: false },
      { id: "e10", name: "Extensión Cuádriceps", sets: 3, reps: 15, weight: 30, day: "Jueves", completed: false },
    ],
    plans: [
      { ...defaultPlans[0], enabled: false },
      { ...defaultPlans[1], enabled: true },
      { ...defaultPlans[2], enabled: true },
      { ...defaultPlans[3], enabled: true },
    ],
    completedRoutines: [8, 10, 14, 12, 16, 11, 9],
  },
  {
    id: "s3",
    name: "Andrés Martínez",
    email: "andres@email.com",
    avatar: "AM",
    age: 32,
    weight: 90,
    exercises: [
      { id: "e11", name: "Press Banca Inclinado", sets: 4, reps: 8, weight: 70, day: "Lunes", completed: false },
      { id: "e12", name: "Remo con Barra", sets: 4, reps: 10, weight: 60, day: "Lunes", completed: false },
      { id: "e13", name: "Sentadilla Frontal", sets: 3, reps: 8, weight: 70, day: "Miércoles", completed: false },
    ],
    plans: [
      { ...defaultPlans[0], enabled: true },
      { ...defaultPlans[1], enabled: true },
      { ...defaultPlans[2], enabled: true },
      { ...defaultPlans[3], enabled: false },
    ],
    completedRoutines: [5, 8, 12, 10, 7, 15, 13],
  },
];

export function useAppState() {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [currentStudentId, setCurrentStudentId] = useState<string>("s1");

  const currentStudent = students.find((s) => s.id === currentStudentId) || students[0];

  const addExercise = (studentId: string, exercise: Omit<Exercise, "id" | "completed">) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, exercises: [...s.exercises, { ...exercise, id: `e${Date.now()}`, completed: false }] }
          : s
      )
    );
  };

  const removeExercise = (studentId: string, exerciseId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
          : s
      )
    );
  };

  const toggleExerciseComplete = (studentId: string, exerciseId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              exercises: s.exercises.map((e) =>
                e.id === exerciseId ? { ...e, completed: !e.completed } : e
              ),
            }
          : s
      )
    );
  };

  const togglePlan = (studentId: string, planId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? {
              ...s,
              plans: s.plans.map((p) =>
                p.id === planId ? { ...p, enabled: !p.enabled } : p
              ),
            }
          : s
      )
    );
  };

  return {
    students,
    currentStudent,
    currentStudentId,
    setCurrentStudentId,
    addExercise,
    removeExercise,
    toggleExerciseComplete,
    togglePlan,
  };
}

export const DAYS: DayOfWeek[] = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
export const WEEK_LABELS = ["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7"];
