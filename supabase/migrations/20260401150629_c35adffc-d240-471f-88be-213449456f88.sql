
-- 1. Create all tables first
CREATE TABLE IF NOT EXISTS public.custom_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.survey_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.custom_surveys(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'text',
  options JSONB,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.survey_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.custom_surveys(id) ON DELETE CASCADE,
  student_id UUID NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(survey_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.survey_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.survey_assignments(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.survey_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Enable RLS on all tables
ALTER TABLE public.custom_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies for custom_surveys
CREATE POLICY "Trainers manage own surveys" ON public.custom_surveys
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Students view assigned surveys" ON public.custom_surveys
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.survey_assignments sa
    WHERE sa.survey_id = custom_surveys.id AND sa.student_id = auth.uid()
  ));

-- 4. RLS policies for survey_questions
CREATE POLICY "Trainers manage survey questions" ON public.survey_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custom_surveys cs WHERE cs.id = survey_questions.survey_id AND cs.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custom_surveys cs WHERE cs.id = survey_questions.survey_id AND cs.trainer_id = auth.uid()));

CREATE POLICY "Students view assigned survey questions" ON public.survey_questions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.survey_assignments sa WHERE sa.survey_id = survey_questions.survey_id AND sa.student_id = auth.uid()));

-- 5. RLS policies for survey_assignments
CREATE POLICY "Trainers manage survey assignments" ON public.survey_assignments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.custom_surveys cs WHERE cs.id = survey_assignments.survey_id AND cs.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.custom_surveys cs WHERE cs.id = survey_assignments.survey_id AND cs.trainer_id = auth.uid()));

CREATE POLICY "Students manage own assignments" ON public.survey_assignments
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 6. RLS policies for survey_answers
CREATE POLICY "Trainers view survey answers" ON public.survey_answers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.survey_assignments sa
    JOIN public.custom_surveys cs ON cs.id = sa.survey_id
    WHERE sa.id = survey_answers.assignment_id AND cs.trainer_id = auth.uid()
  ));

CREATE POLICY "Students manage own answers" ON public.survey_answers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.survey_assignments sa WHERE sa.id = survey_answers.assignment_id AND sa.student_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.survey_assignments sa WHERE sa.id = survey_answers.assignment_id AND sa.student_id = auth.uid()));
