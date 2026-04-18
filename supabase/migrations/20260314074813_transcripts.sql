CREATE TABLE public.transcripts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  text text,
  status text NOT NULL DEFAULT 'processing',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transcripts" ON public.transcripts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own transcripts" ON public.transcripts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own transcripts" ON public.transcripts FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own transcripts" ON public.transcripts FOR DELETE TO authenticated USING (user_id = auth.uid());
