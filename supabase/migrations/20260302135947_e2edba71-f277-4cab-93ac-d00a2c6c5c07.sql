
CREATE TABLE public.seguimiento_personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Sueño
  hora_dormir text NOT NULL DEFAULT '',
  hora_despertar text NOT NULL DEFAULT '',
  dificultad_levantarse text NOT NULL DEFAULT '',
  hora_ideal_despertar text NOT NULL DEFAULT '',
  
  -- Rutina mañana
  desayuno_habito text NOT NULL DEFAULT '',
  bano_levantarse text NOT NULL DEFAULT '',
  
  -- Actividad física
  entrena boolean NOT NULL DEFAULT false,
  tipo_entrenamiento text NOT NULL DEFAULT '',
  horario_entrenamiento text NOT NULL DEFAULT '',
  
  -- Responsabilidades
  obligaciones_diarias text NOT NULL DEFAULT '',
  horarios_ocupados text NOT NULL DEFAULT '',
  personas_cargo text NOT NULL DEFAULT '',
  
  -- Organización y bienestar
  organizacion_comidas text NOT NULL DEFAULT '',
  nuevos_habitos text NOT NULL DEFAULT '',
  tiempo_para_si text NOT NULL DEFAULT '',
  
  UNIQUE(student_id)
);

ALTER TABLE public.seguimiento_personal ENABLE ROW LEVEL SECURITY;

-- Students can manage their own survey
CREATE POLICY "Students can insert own survey"
  ON public.seguimiento_personal FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own survey"
  ON public.seguimiento_personal FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Students can view own survey"
  ON public.seguimiento_personal FOR SELECT
  USING (auth.uid() = student_id);

-- Trainers can view surveys of their linked students
CREATE POLICY "Trainers can view linked student surveys"
  ON public.seguimiento_personal FOR SELECT
  USING (
    has_role(auth.uid(), 'trainer'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.trainer_students
      WHERE trainer_students.trainer_id = auth.uid()
      AND trainer_students.student_id = seguimiento_personal.student_id
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_seguimiento_personal_updated_at
  BEFORE UPDATE ON public.seguimiento_personal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
