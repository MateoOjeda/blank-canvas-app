
-- =============================================
-- CIPRIFITNESS - COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('trainer', 'student');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- 2. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_initials TEXT,
  avatar_url TEXT,
  weight NUMERIC,
  age INTEGER,
  mercadopago_alias TEXT DEFAULT '',
  whatsapp_number TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Trainer-Student links
CREATE TABLE public.trainer_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT DEFAULT 'Estándar',
  plan_entrenamiento TEXT DEFAULT 'inicial',
  plan_alimentacion TEXT DEFAULT 'inicial',
  payment_status TEXT DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, student_id)
);
ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can manage their links" ON public.trainer_students FOR ALL USING (auth.uid() = trainer_id);
CREATE POLICY "Students can view their links" ON public.trainer_students FOR SELECT USING (auth.uid() = student_id);

-- 4. Exercises (individual per student)
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10,
  weight NUMERIC NOT NULL DEFAULT 0,
  day TEXT NOT NULL DEFAULT 'Lunes',
  completed BOOLEAN NOT NULL DEFAULT false,
  body_part TEXT DEFAULT '',
  is_to_failure BOOLEAN DEFAULT false,
  is_dropset BOOLEAN DEFAULT false,
  is_piramide BOOLEAN DEFAULT false,
  pyramid_reps TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage exercises" ON public.exercises FOR ALL USING (auth.uid() = trainer_id);
CREATE POLICY "Students view own exercises" ON public.exercises FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Students update own exercises" ON public.exercises FOR UPDATE USING (auth.uid() = student_id);

-- 5. Exercise logs
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT false,
  actual_sets INTEGER,
  actual_reps INTEGER,
  actual_weight NUMERIC,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exercise_id, log_date)
);
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own logs" ON public.exercise_logs FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Trainers view student logs" ON public.exercise_logs FOR SELECT USING (auth.uid() = trainer_id);

-- 6. Plan levels
CREATE TABLE public.plan_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'principiante',
  content TEXT DEFAULT '',
  unlocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.plan_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage plan levels" ON public.plan_levels FOR ALL USING (auth.uid() = trainer_id);
CREATE POLICY "Students view own plan levels" ON public.plan_levels FOR SELECT USING (auth.uid() = student_id);

-- 7. Plan prices
CREATE TABLE public.plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL,
  level TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, plan_type, level)
);
ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own prices" ON public.plan_prices FOR ALL USING (auth.uid() = trainer_id);
CREATE POLICY "Anyone can view prices" ON public.plan_prices FOR SELECT USING (true);

-- 8. Student meals
CREATE TABLE public.student_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  meal_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.student_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage meals" ON public.student_meals FOR ALL USING (auth.uid() = trainer_id);
CREATE POLICY "Students view own meals" ON public.student_meals FOR SELECT USING (auth.uid() = student_id);

-- 9. Seguimiento personal (personal survey)
CREATE TABLE public.seguimiento_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hora_dormir TEXT DEFAULT '',
  hora_despertar TEXT DEFAULT '',
  dificultad_levantarse TEXT DEFAULT '',
  hora_ideal_despertar TEXT DEFAULT '',
  desayuno_habito TEXT DEFAULT '',
  bano_levantarse TEXT DEFAULT '',
  entrena BOOLEAN DEFAULT false,
  tipo_entrenamiento TEXT DEFAULT '',
  hora_entrena TEXT DEFAULT '',
  dias_entrena TEXT DEFAULT '',
  actividad_laboral TEXT DEFAULT '',
  nivel_estres TEXT DEFAULT '',
  comidas_por_dia TEXT DEFAULT '',
  agua_diaria TEXT DEFAULT '',
  tiempo_para_si TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.seguimiento_personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own survey" ON public.seguimiento_personal FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Trainers view linked student surveys" ON public.seguimiento_personal FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trainer_students WHERE trainer_id = auth.uid() AND student_id = seguimiento_personal.student_id));

-- 10. Weight history
CREATE TABLE public.weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own weight" ON public.weight_history FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Trainers view linked student weight" ON public.weight_history FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trainer_students WHERE trainer_id = auth.uid() AND student_id = weight_history.student_id));

-- 11. Trainer changes (feed for students)
CREATE TABLE public.trainer_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL,
  description TEXT DEFAULT '',
  entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trainer_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers insert changes" ON public.trainer_changes FOR INSERT WITH CHECK (auth.uid() = trainer_id OR auth.uid() = student_id);
CREATE POLICY "Students view own changes" ON public.trainer_changes FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Trainers view own changes" ON public.trainer_changes FOR SELECT USING (auth.uid() = trainer_id);

-- 12. Change readings (track last read for feed)
CREATE TABLE public.change_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.change_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own readings" ON public.change_readings FOR ALL USING (auth.uid() = student_id);

-- 13. Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  message TEXT DEFAULT '',
  read BOOLEAN DEFAULT false,
  related_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- 14. Body transformations
CREATE TABLE public.body_transformations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  before_photo_url TEXT,
  before_weight NUMERIC,
  before_date TIMESTAMPTZ,
  after_photo_url TEXT,
  after_weight NUMERIC,
  after_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.body_transformations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own transformations" ON public.body_transformations FOR ALL USING (auth.uid() = student_id);
CREATE POLICY "Trainers view linked student transformations" ON public.body_transformations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trainer_students WHERE trainer_id = auth.uid() AND student_id = body_transformations.student_id));

-- 15. Training groups
CREATE TABLE public.training_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own groups" ON public.training_groups FOR ALL USING (auth.uid() = trainer_id);

-- 16. Training group members
CREATE TABLE public.training_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.training_groups(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, student_id)
);
ALTER TABLE public.training_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage group members" ON public.training_group_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.training_groups WHERE id = training_group_members.group_id AND trainer_id = auth.uid()));
CREATE POLICY "Students view own memberships" ON public.training_group_members FOR SELECT USING (auth.uid() = student_id);

-- 17. Group exercises
CREATE TABLE public.group_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.training_groups(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10,
  weight NUMERIC NOT NULL DEFAULT 0,
  day TEXT NOT NULL DEFAULT 'Lunes',
  body_part TEXT DEFAULT '',
  is_to_failure BOOLEAN DEFAULT false,
  is_dropset BOOLEAN DEFAULT false,
  is_piramide BOOLEAN DEFAULT false,
  pyramid_reps TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.group_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage group exercises" ON public.group_exercises FOR ALL USING (auth.uid() = trainer_id);
CREATE POLICY "Students view group exercises" ON public.group_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.training_group_members WHERE group_id = group_exercises.group_id AND student_id = auth.uid()));

-- 18. Storage bucket for transformations
INSERT INTO storage.buckets (id, name, public) VALUES ('transformations', 'transformations', true);

CREATE POLICY "Users can upload transformation photos" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'transformations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own transformation photos" ON storage.objects FOR UPDATE
  USING (bucket_id = 'transformations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view transformation photos" ON storage.objects FOR SELECT
  USING (bucket_id = 'transformations');

-- 19. Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 20. Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plan_levels_updated_at BEFORE UPDATE ON public.plan_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seguimiento_updated_at BEFORE UPDATE ON public.seguimiento_personal FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 21. Auto-create profile and role on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'role', 'student')::app_role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_levels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_changes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exercises;
