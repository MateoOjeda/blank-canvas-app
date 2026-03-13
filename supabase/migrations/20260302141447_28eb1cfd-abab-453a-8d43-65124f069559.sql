
-- Exercise daily logs table for tracking actual performance and feedback
CREATE TABLE public.exercise_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL,
  student_id UUID NOT NULL,
  trainer_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  actual_sets INTEGER,
  actual_reps INTEGER,
  actual_weight NUMERIC,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one log per exercise per day
ALTER TABLE public.exercise_logs ADD CONSTRAINT exercise_logs_unique_daily UNIQUE (exercise_id, log_date);

-- RLS
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

-- Students can manage their own logs
CREATE POLICY "Students can insert own logs" ON public.exercise_logs
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own logs" ON public.exercise_logs
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Students can view own logs" ON public.exercise_logs
  FOR SELECT USING (auth.uid() = student_id);

-- Trainers can view logs of their students
CREATE POLICY "Trainers can view student logs" ON public.exercise_logs
  FOR SELECT USING (
    has_role(auth.uid(), 'trainer'::app_role) AND auth.uid() = trainer_id
  );

-- Auto-update updated_at
CREATE TRIGGER update_exercise_logs_updated_at
  BEFORE UPDATE ON public.exercise_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercise_logs;
