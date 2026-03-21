
-- Allow trainers to read student roles to find available students
CREATE POLICY "Trainers can view student roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    role = 'student'
    AND public.has_role(auth.uid(), 'trainer')
  );
