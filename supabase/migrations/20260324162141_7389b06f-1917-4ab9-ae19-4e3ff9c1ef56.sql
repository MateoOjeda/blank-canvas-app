
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS exercise_type text NOT NULL DEFAULT 'NORMAL';
ALTER TABLE public.group_exercises ADD COLUMN IF NOT EXISTS exercise_type text NOT NULL DEFAULT 'NORMAL';
