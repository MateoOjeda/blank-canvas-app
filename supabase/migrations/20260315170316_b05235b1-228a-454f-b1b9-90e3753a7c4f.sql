
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('trainer', 'student');

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. user_roles (FIRST - needed by functions)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Security definer functions (AFTER table exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1 $$;

-- 2. profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL, avatar_initials TEXT, avatar_url TEXT,
  weight NUMERIC, age INTEGER, mercadopago_alias TEXT, whatsapp_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile+role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_initials)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 2)));
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. trainer_students
CREATE TABLE public.trainer_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT, payment_status TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, student_id)
);
ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage their students" ON public.trainer_students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'trainer') AND trainer_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'trainer') AND trainer_id = auth.uid());
CREATE POLICY "Students can view their link" ON public.trainer_students FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 4. exercises
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, sets INTEGER DEFAULT 4, reps INTEGER DEFAULT 10, weight NUMERIC DEFAULT 0,
  day TEXT NOT NULL, body_part TEXT DEFAULT '', is_to_failure BOOLEAN DEFAULT false,
  completed BOOLEAN DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage exercises" ON public.exercises FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Students view own exercises" ON public.exercises FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students update completion" ON public.exercises FOR UPDATE TO authenticated USING (student_id = auth.uid());

-- 5. exercise_logs
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL, student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE, completed BOOLEAN DEFAULT false,
  actual_sets INTEGER, actual_reps INTEGER, actual_weight NUMERIC, notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, log_date)
);
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own logs" ON public.exercise_logs FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Trainers view student logs" ON public.exercise_logs FOR SELECT TO authenticated USING (trainer_id = auth.uid());
CREATE TRIGGER update_exercise_logs_updated_at BEFORE UPDATE ON public.exercise_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. plan_levels
CREATE TABLE public.plan_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL, level TEXT NOT NULL, content TEXT DEFAULT '', unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage plan levels" ON public.plan_levels FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Students view own plans" ON public.plan_levels FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE TRIGGER update_plan_levels_updated_at BEFORE UPDATE ON public.plan_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. plans
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, description TEXT, price NUMERIC, icon TEXT, enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own plans table" ON public.plans FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 8. plan_prices (editable by trainer)
CREATE TABLE public.plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL, level TEXT NOT NULL, price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, plan_type, level)
);
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage own prices" ON public.plan_prices FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Authenticated can view prices" ON public.plan_prices FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_plan_prices_updated_at BEFORE UPDATE ON public.plan_prices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, message TEXT DEFAULT '', type TEXT DEFAULT 'general',
  read BOOLEAN DEFAULT false, related_id TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 10. trainer_changes
CREATE TABLE public.trainer_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id TEXT NOT NULL, change_type TEXT NOT NULL, description TEXT DEFAULT '', entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trainer_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers insert changes" ON public.trainer_changes FOR INSERT TO authenticated WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "View own changes" ON public.trainer_changes FOR SELECT TO authenticated USING (student_id = auth.uid()::text OR trainer_id = auth.uid());

-- 11. change_readings
CREATE TABLE public.change_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.change_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own readings" ON public.change_readings FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- 12. weight_history
CREATE TABLE public.weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own weight" ON public.weight_history FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Trainers view student weight" ON public.weight_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainer_students WHERE trainer_id = auth.uid() AND student_id = weight_history.student_id));

-- 13. seguimiento_personal
CREATE TABLE public.seguimiento_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  hora_dormir TEXT DEFAULT '', hora_despertar TEXT DEFAULT '', dificultad_levantarse TEXT DEFAULT '',
  hora_ideal_despertar TEXT DEFAULT '', desayuno_habito TEXT DEFAULT '', bano_levantarse TEXT DEFAULT '',
  entrena BOOLEAN DEFAULT false, tipo_entrenamiento TEXT DEFAULT '', horario_entrenamiento TEXT DEFAULT '',
  obligaciones_diarias TEXT DEFAULT '', horarios_ocupados TEXT DEFAULT '', personas_cargo TEXT DEFAULT '',
  organizacion_comidas TEXT DEFAULT '', nuevos_habitos TEXT DEFAULT '', tiempo_para_si TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seguimiento_personal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own survey" ON public.seguimiento_personal FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Trainers view student survey" ON public.seguimiento_personal FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainer_students WHERE trainer_id = auth.uid() AND student_id = seguimiento_personal.student_id));
CREATE TRIGGER update_seguimiento_updated_at BEFORE UPDATE ON public.seguimiento_personal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. body_transformations
CREATE TABLE public.body_transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  before_photo_url TEXT, before_weight NUMERIC, before_date DATE,
  after_photo_url TEXT, after_weight NUMERIC, after_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.body_transformations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own transformations" ON public.body_transformations FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Trainers view student transformations" ON public.body_transformations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainer_students WHERE trainer_id = auth.uid() AND student_id = body_transformations.student_id));

-- 15. student_meals
CREATE TABLE public.student_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, content TEXT DEFAULT '', meal_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage meals" ON public.student_meals FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Students view own meals" ON public.student_meals FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE TRIGGER update_student_meals_updated_at BEFORE UPDATE ON public.student_meals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. training_groups
CREATE TABLE public.training_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage own groups" ON public.training_groups FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());

-- 17. training_group_members
CREATE TABLE public.training_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.training_groups(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (group_id, student_id)
);
ALTER TABLE public.training_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage group members" ON public.training_group_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_groups WHERE id = group_id AND trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_groups WHERE id = group_id AND trainer_id = auth.uid()));
CREATE POLICY "Students view own memberships" ON public.training_group_members FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 18. group_exercises
CREATE TABLE public.group_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.training_groups(id) ON DELETE CASCADE NOT NULL,
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, sets INTEGER DEFAULT 4, reps INTEGER DEFAULT 10, weight NUMERIC DEFAULT 0,
  day TEXT NOT NULL, body_part TEXT DEFAULT '', is_to_failure BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.group_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage group exercises" ON public.group_exercises FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Students view group exercises" ON public.group_exercises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_group_members WHERE group_id = group_exercises.group_id AND student_id = auth.uid()));

-- 19. custom_survey_questions
CREATE TABLE public.custom_survey_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL, question_type TEXT DEFAULT 'text', sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_survey_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainers manage own questions" ON public.custom_survey_questions FOR ALL TO authenticated USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
CREATE POLICY "Students view trainer questions" ON public.custom_survey_questions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trainer_students WHERE trainer_id = custom_survey_questions.trainer_id AND student_id = auth.uid()));

-- 20. custom_survey_answers
CREATE TABLE public.custom_survey_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.custom_survey_questions(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (question_id, student_id)
);
ALTER TABLE public.custom_survey_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own answers" ON public.custom_survey_answers FOR ALL TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Trainers view student answers" ON public.custom_survey_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.custom_survey_questions q
    JOIN public.trainer_students ts ON ts.trainer_id = q.trainer_id
    WHERE q.id = custom_survey_answers.question_id AND ts.student_id = custom_survey_answers.student_id AND ts.trainer_id = auth.uid()
  ));
CREATE TRIGGER update_custom_survey_answers_updated_at BEFORE UPDATE ON public.custom_survey_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercises;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_levels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_changes;
