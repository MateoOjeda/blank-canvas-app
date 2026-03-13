
-- Add avatar_url to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Create weight_history table for tracking weight over time
CREATE TABLE public.weight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  weight NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weight_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert own weight"
ON public.weight_history FOR INSERT
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view own weight"
ON public.weight_history FOR SELECT
USING (auth.uid() = student_id);

CREATE POLICY "Trainers can view linked student weight"
ON public.weight_history FOR SELECT
USING (
  has_role(auth.uid(), 'trainer'::app_role)
  AND EXISTS (
    SELECT 1 FROM trainer_students
    WHERE trainer_students.trainer_id = auth.uid()
    AND trainer_students.student_id = weight_history.student_id
  )
);

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
