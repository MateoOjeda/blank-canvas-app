export const BODY_PARTS = [
  "Espalda",
  "Bíceps",
  "Tríceps",
  "Pecho",
  "Hombros",
  "Piernas",
  "Glúteos",
  "Abdomen",
  "Cardio",
] as const;

export type BodyPart = (typeof BODY_PARTS)[number];

export const EXERCISES_BY_BODY_PART: Record<BodyPart, string[]> = {
  Espalda: [
    "Dominadas", "Remo con barra", "Remo con mancuerna", "Jalón al pecho",
    "Remo en polea baja", "Peso muerto", "Pull-over", "Remo T-bar",
  ],
  Bíceps: [
    "Curl con barra", "Curl con mancuernas", "Curl martillo", "Curl concentrado",
    "Curl en polea", "Curl predicador", "Curl 21s",
  ],
  Tríceps: [
    "Press francés", "Extensión en polea", "Fondos en paralelas", "Patada de tríceps",
    "Press cerrado", "Extensión sobre cabeza", "Dips en banco",
  ],
  Pecho: [
    "Press banca plano", "Press banca inclinado", "Press banca declinado",
    "Aperturas con mancuernas", "Cruces en polea", "Flexiones", "Press con mancuernas",
  ],
  Hombros: [
    "Press militar", "Elevaciones laterales", "Elevaciones frontales",
    "Pájaros", "Face pull", "Press Arnold", "Encogimientos de hombros",
  ],
  Piernas: [
    "Sentadillas", "Prensa de piernas", "Extensión de cuádriceps",
    "Curl femoral", "Sentadilla búlgara", "Zancadas", "Peso muerto rumano",
    "Sentadilla hack", "Gemelos en máquina",
  ],
  Glúteos: [
    "Hip thrust", "Sentadilla sumo", "Patada de glúteo", "Abducción en máquina",
    "Peso muerto sumo", "Step-up", "Puente de glúteos",
  ],
  Abdomen: [
    "Crunch", "Plancha", "Elevación de piernas", "Russian twist",
    "Ab wheel", "Crunch en polea", "Plancha lateral",
  ],
  Cardio: [
    "Caminata en cinta", "Correr", "Bicicleta estática", "Elíptica",
    "Remo (cardio)", "Saltar la cuerda", "HIIT",
  ],
};
