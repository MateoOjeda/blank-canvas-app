import { Apple, Dumbbell, TrendingUp } from "lucide-react";

export const PLAN_TYPES = [
  {
    key: "nutricion",
    label: "Plan de Alimentación",
    shortLabel: "Alimentación",
    icon: Apple,
    description: "Guías nutricionales adaptadas a tu nivel",
    levelDescriptions: {
      principiante: "Guía básica de alimentación con porciones generales y hábitos saludables.",
      intermedio: "Guía con cantidades aproximadas, distribución de macros y recetas sugeridas.",
      avanzado: "Plan estricto con pesos exactos, macros calculados y periodización nutricional.",
    },
  },
  {
    key: "entrenamiento",
    label: "Plan de Rutina",
    shortLabel: "Rutina",
    icon: Dumbbell,
    description: "Rutinas de entrenamiento personalizadas",
    levelDescriptions: {
      principiante: "Ejercicios básicos con técnica supervisada y volumen moderado.",
      intermedio: "Biseries, descargas programadas y progresión de cargas.",
      avanzado: "Métodos avanzados, alta exigencia y técnicas de intensidad.",
    },
  },
  {
    key: "cambios_fisicos",
    label: "Cambio Físico",
    shortLabel: "Cambio Físico",
    icon: TrendingUp,
    description: "Plan integral: alimentación + rutina combinados",
    isCombined: true,
    levelDescriptions: {
      principiante: "Combinación de alimentación básica y rutina para principiantes.",
      intermedio: "Plan combinado intermedio con nutrición detallada y rutinas progresivas.",
      avanzado: "Transformación completa con plan estricto de alimentación y entrenamiento avanzado.",
    },
  },
] as const;

export const LEVELS = ["principiante", "intermedio", "avanzado"] as const;

export const LEVEL_LABELS: Record<string, string> = {
  principiante: "Inicial",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export const DEFAULT_PRICES: Record<string, number> = {
  principiante: 15000,
  intermedio: 25000,
  avanzado: 40000,
};

export const formatPrice = (price: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
