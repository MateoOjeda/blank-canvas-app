
-- Fix overly permissive insert policy on notifications
DROP POLICY "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated can insert notifications for others"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id != auth.uid());
