
-- Add body_part column to exercises
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS body_part text NOT NULL DEFAULT '';

-- Create body_transformations table
CREATE TABLE public.body_transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  before_photo_url text,
  before_weight numeric,
  before_date timestamp with time zone DEFAULT now(),
  after_photo_url text,
  after_weight numeric,
  after_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.body_transformations ENABLE ROW LEVEL SECURITY;

-- RLS for body_transformations
CREATE POLICY "Students can manage own transformations"
  ON public.body_transformations FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Trainers can view linked student transformations"
  ON public.body_transformations FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'trainer') AND
    EXISTS (
      SELECT 1 FROM trainer_students
      WHERE trainer_students.trainer_id = auth.uid()
      AND trainer_students.student_id = body_transformations.student_id
    )
  );

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  read boolean NOT NULL DEFAULT false,
  related_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create storage bucket for body transformation photos
INSERT INTO storage.buckets (id, name, public) VALUES ('transformations', 'transformations', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for transformations bucket
CREATE POLICY "Students can upload transformation photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'transformations' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view transformation photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'transformations');

CREATE POLICY "Students can delete own transformation photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'transformations' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Trigger to update updated_at on body_transformations
CREATE TRIGGER update_body_transformations_updated_at
  BEFORE UPDATE ON public.body_transformations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
