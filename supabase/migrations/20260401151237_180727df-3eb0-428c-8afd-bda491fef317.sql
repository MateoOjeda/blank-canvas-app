
-- Drop all problematic policies
DROP POLICY IF EXISTS "Trainers manage own surveys" ON public.custom_surveys;
DROP POLICY IF EXISTS "Students view assigned surveys" ON public.custom_surveys;
DROP POLICY IF EXISTS "Trainers manage survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Students view assigned survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Trainers manage survey assignments" ON public.survey_assignments;
DROP POLICY IF EXISTS "Students manage own assignments" ON public.survey_assignments;
DROP POLICY IF EXISTS "Trainers view survey answers" ON public.survey_answers;
DROP POLICY IF EXISTS "Students manage own answers" ON public.survey_answers;

-- Security definer function to check survey ownership
CREATE OR REPLACE FUNCTION public.is_survey_trainer(_survey_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.custom_surveys WHERE id = _survey_id AND trainer_id = _user_id
  )
$$;

-- Security definer to check student assignment
CREATE OR REPLACE FUNCTION public.is_survey_assigned(_survey_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_assignments WHERE survey_id = _survey_id AND student_id = _student_id
  )
$$;

-- Security definer to get trainer from assignment
CREATE OR REPLACE FUNCTION public.is_assignment_trainer(_assignment_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.survey_assignments sa
    JOIN public.custom_surveys cs ON cs.id = sa.survey_id
    WHERE sa.id = _assignment_id AND cs.trainer_id = _user_id
  )
$$;

-- custom_surveys policies
CREATE POLICY "Trainers manage own surveys" ON public.custom_surveys
  FOR ALL TO authenticated
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id);

CREATE POLICY "Students view assigned surveys" ON public.custom_surveys
  FOR SELECT TO authenticated
  USING (public.is_survey_assigned(id, auth.uid()));

-- survey_questions policies
CREATE POLICY "Trainers manage survey questions" ON public.survey_questions
  FOR ALL TO authenticated
  USING (public.is_survey_trainer(survey_id, auth.uid()))
  WITH CHECK (public.is_survey_trainer(survey_id, auth.uid()));

CREATE POLICY "Students view assigned survey questions" ON public.survey_questions
  FOR SELECT TO authenticated
  USING (public.is_survey_assigned(survey_id, auth.uid()));

-- survey_assignments policies
CREATE POLICY "Trainers manage survey assignments" ON public.survey_assignments
  FOR ALL TO authenticated
  USING (public.is_survey_trainer(survey_id, auth.uid()))
  WITH CHECK (public.is_survey_trainer(survey_id, auth.uid()));

CREATE POLICY "Students manage own assignments" ON public.survey_assignments
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- survey_answers policies
CREATE POLICY "Trainers view survey answers" ON public.survey_answers
  FOR SELECT TO authenticated
  USING (public.is_assignment_trainer(assignment_id, auth.uid()));

CREATE POLICY "Students manage own answers" ON public.survey_answers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.survey_assignments sa WHERE sa.id = survey_answers.assignment_id AND sa.student_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.survey_assignments sa WHERE sa.id = survey_answers.assignment_id AND sa.student_id = auth.uid()));
