
ALTER TABLE public.trainer_students
ADD COLUMN plan_entrenamiento text DEFAULT 'inicial',
ADD COLUMN plan_alimentacion text DEFAULT 'inicial';
