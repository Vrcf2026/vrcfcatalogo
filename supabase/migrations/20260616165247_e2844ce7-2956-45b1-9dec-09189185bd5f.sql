CREATE TYPE public.stock_alert_status AS ENUM ('pending', 'notified', 'cancelled');

CREATE TABLE public.stock_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  status public.stock_alert_status NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, email)
);

CREATE INDEX idx_stock_alerts_product_status ON public.stock_alerts(product_id, status);
CREATE INDEX idx_stock_alerts_user ON public.stock_alerts(user_id) WHERE user_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_alerts TO authenticated;
GRANT INSERT ON public.stock_alerts TO anon;
GRANT ALL ON public.stock_alerts TO service_role;

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode subscrever (anon inclusive)
CREATE POLICY "Anyone can subscribe to stock alerts"
  ON public.stock_alerts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Utilizadores vêem os seus próprios alertas
CREATE POLICY "Users see own alerts"
  ON public.stock_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Utilizadores cancelam os seus próprios alertas
CREATE POLICY "Users cancel own alerts"
  ON public.stock_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own alerts"
  ON public.stock_alerts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins e gestores vêem tudo
CREATE POLICY "Admins manage all alerts"
  ON public.stock_alerts FOR ALL
  TO authenticated
  USING (public.has_gestao_access(auth.uid()))
  WITH CHECK (public.has_gestao_access(auth.uid()));