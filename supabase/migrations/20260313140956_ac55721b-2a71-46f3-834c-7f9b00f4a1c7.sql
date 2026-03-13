-- Create storage bucket for transformation photos
INSERT INTO storage.buckets (id, name, public) VALUES ('transformations', 'transformations', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to transformations bucket
CREATE POLICY "Authenticated users can upload transformations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'transformations');

-- Allow public read access to transformations
CREATE POLICY "Public read access for transformations"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'transformations');

-- Allow users to update their own transformations
CREATE POLICY "Users can update own transformations"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'transformations');

-- Add unique constraint on exercise_logs for upsert to work
ALTER TABLE public.exercise_logs ADD CONSTRAINT exercise_logs_exercise_id_log_date_key UNIQUE (exercise_id, log_date);