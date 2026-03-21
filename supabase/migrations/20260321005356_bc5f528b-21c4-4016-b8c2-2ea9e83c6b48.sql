
-- Create global_plans table for trainer's plan templates
CREATE TABLE public.global_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  plan_type TEXT NOT NULL,
  level TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  content TEXT DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, plan_type, level)
);

ALTER TABLE public.global_plans ENABLE ROW LEVEL SECURITY;

-- Trainers manage their own global plans
CREATE POLICY "Trainers manage own global plans"
  ON public.global_plans FOR ALL
  USING (auth.uid() = trainer_id);

-- Students can view global plans from their linked trainer
CREATE POLICY "Students view linked trainer global plans"
  ON public.global_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM trainer_students
      WHERE trainer_students.student_id = auth.uid()
        AND trainer_students.trainer_id = global_plans.trainer_id
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_global_plans_updated_at
  BEFORE UPDATE ON public.global_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_plans;
