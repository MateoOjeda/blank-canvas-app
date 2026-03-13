
-- Table to track trainer changes visible to students
CREATE TABLE public.trainer_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  change_type TEXT NOT NULL, -- exercise_added, exercise_updated, exercise_removed, level_unlocked, level_locked, content_updated
  description TEXT NOT NULL DEFAULT '',
  entity_id UUID, -- optional reference to the changed entity
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_changes ENABLE ROW LEVEL SECURITY;

-- Students can read their own changes
CREATE POLICY "Students can view own changes"
ON public.trainer_changes FOR SELECT
TO authenticated
USING (auth.uid() = student_id);

-- Trainers can insert changes for their students
CREATE POLICY "Trainers can insert changes"
ON public.trainer_changes FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'trainer') AND auth.uid() = trainer_id);

-- Trainers can view changes they created
CREATE POLICY "Trainers can view own changes"
ON public.trainer_changes FOR SELECT
TO authenticated
USING (auth.uid() = trainer_id);

-- Table to track when student last read changes
CREATE TABLE public.change_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL UNIQUE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.change_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own readings"
ON public.change_readings FOR ALL
TO authenticated
USING (auth.uid() = student_id)
WITH CHECK (auth.uid() = student_id);

-- Enable realtime for trainer_changes so students see updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_changes;
