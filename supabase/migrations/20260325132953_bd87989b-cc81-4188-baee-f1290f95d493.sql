
-- Create routines metadata table
CREATE TABLE public.routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'ALUMNO',
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVA',
  routine_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add routine_id to exercises (nullable for backward compat)
ALTER TABLE public.exercises ADD COLUMN routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

-- Trainers manage own routines
CREATE POLICY "Trainers manage own routines"
ON public.routines
FOR ALL
TO public
USING (auth.uid() = trainer_id)
WITH CHECK (auth.uid() = trainer_id);

-- Students view routines targeting them
CREATE POLICY "Students view own routines"
ON public.routines
FOR SELECT
TO public
USING (target_type = 'ALUMNO' AND target_id = auth.uid());

-- Students view group routines they belong to
CREATE POLICY "Students view group routines"
ON public.routines
FOR SELECT
TO public
USING (
  target_type = 'GRUPO' AND EXISTS (
    SELECT 1 FROM public.training_group_members
    WHERE training_group_members.group_id = routines.target_id
    AND training_group_members.student_id = auth.uid()
  )
);
