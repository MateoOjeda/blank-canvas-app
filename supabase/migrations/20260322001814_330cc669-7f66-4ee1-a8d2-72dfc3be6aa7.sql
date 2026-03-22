
-- Table for storing body parts per day per student
CREATE TABLE public.routine_day_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  student_id UUID NOT NULL,
  day TEXT NOT NULL,
  body_part_1 TEXT DEFAULT '',
  body_part_2 TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, student_id, day)
);

ALTER TABLE public.routine_day_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own day configs"
  ON public.routine_day_config FOR ALL
  USING (auth.uid() = trainer_id);

CREATE POLICY "Students view own day configs"
  ON public.routine_day_config FOR SELECT
  USING (auth.uid() = student_id);

-- Add routine_next_change_date to trainer_students
ALTER TABLE public.trainer_students ADD COLUMN IF NOT EXISTS routine_next_change_date DATE DEFAULT NULL;
