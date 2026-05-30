CREATE TABLE public.homepage_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('brand','category')),
  ref_id text NOT NULL,
  label text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, ref_id)
);

GRANT SELECT ON public.homepage_highlights TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_highlights TO authenticated;
GRANT ALL ON public.homepage_highlights TO service_role;

ALTER TABLE public.homepage_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlights viewable by everyone"
  ON public.homepage_highlights FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert highlights"
  ON public.homepage_highlights FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update highlights"
  ON public.homepage_highlights FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete highlights"
  ON public.homepage_highlights FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_homepage_highlights_updated_at
  BEFORE UPDATE ON public.homepage_highlights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();