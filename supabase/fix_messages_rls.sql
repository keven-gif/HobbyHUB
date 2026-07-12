-- Skip renaming old policy (already gone)
-- Just create the new permissive policies

CREATE POLICY "Authenticated users can send messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Participants can view messages" ON public.messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Participants can update messages" ON public.messages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
