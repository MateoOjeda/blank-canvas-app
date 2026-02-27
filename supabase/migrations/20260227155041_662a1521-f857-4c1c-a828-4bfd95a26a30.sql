-- Create role enum
CREATE TYPE public.app_role AS ENUM ('trainer', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_initials TEXT DEFAULT '',
  age INTEGER,
  weight NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Trainers can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- User roles RLS policies
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Exercises table
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10,
  weight NUMERIC NOT NULL DEFAULT 0,
  day TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own exercises"
  ON public.exercises FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Trainers can view exercises they created"
  ON public.exercises FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers can insert exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'trainer') AND auth.uid() = trainer_id);

CREATE POLICY "Trainers can update exercises"
  ON public.exercises FOR UPDATE
  USING (public.has_role(auth.uid(), 'trainer') AND auth.uid() = trainer_id);

CREATE POLICY "Trainers can delete exercises"
  ON public.exercises FOR DELETE
  USING (public.has_role(auth.uid(), 'trainer') AND auth.uid() = trainer_id);

CREATE POLICY "Students can update own exercises completion"
  ON public.exercises FOR UPDATE
  USING (auth.uid() = student_id);

-- Plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  icon TEXT DEFAULT 'Dumbbell',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own plans"
  ON public.plans FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Trainers can view all plans"
  ON public.plans FOR SELECT
  USING (public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Trainers can manage plans"
  ON public.plans FOR ALL
  USING (public.has_role(auth.uid(), 'trainer'));

-- Trainer-student relationship
CREATE TABLE public.trainer_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(trainer_id, student_id)
);

ALTER TABLE public.trainer_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers can view their students"
  ON public.trainer_students FOR SELECT
  USING (auth.uid() = trainer_id);

CREATE POLICY "Students can view their trainer"
  ON public.trainer_students FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Trainers can add students"
  ON public.trainer_students FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'trainer') AND auth.uid() = trainer_id);

CREATE POLICY "Trainers can remove students"
  ON public.trainer_students FOR DELETE
  USING (public.has_role(auth.uid(), 'trainer') AND auth.uid() = trainer_id);

-- Trigger for auto-creating default plans when trainer adds student
CREATE OR REPLACE FUNCTION public.create_default_plans()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.plans (student_id, name, description, icon, enabled) VALUES
    (NEW.student_id, 'Plan Nutricional', 'Dieta personalizada según tus objetivos', 'Apple', false),
    (NEW.student_id, 'Plan de Fuerza', 'Rutinas enfocadas en ganancia muscular', 'Dumbbell', true),
    (NEW.student_id, 'Plan Cardio', 'Entrenamiento cardiovascular intensivo', 'Heart', false),
    (NEW.student_id, 'Plan Flexibilidad', 'Estiramientos y movilidad articular', 'Stretch', false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_trainer_student_added
  AFTER INSERT ON public.trainer_students
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_plans();

-- Auto update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Handle new user signup: auto-create profile and role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), 2))
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();