
-- 1) shipping_config: restrict SELECT to admin/gestor
REVOKE SELECT ON public.shipping_config FROM anon;
DROP POLICY IF EXISTS "Shipping config viewable by everyone" ON public.shipping_config;
CREATE POLICY "Shipping config viewable by staff"
  ON public.shipping_config FOR SELECT
  TO authenticated
  USING (public.has_gestao_access(auth.uid()));

-- 2) stock_alerts: tighten INSERT
DROP POLICY IF EXISTS "Anyone can subscribe to stock alerts" ON public.stock_alerts;

CREATE POLICY "Anon can subscribe with valid email"
  ON public.stock_alerts FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email) <= 254
  );

CREATE POLICY "Authenticated subscribe own alerts"
  ON public.stock_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND length(email) <= 254
  );
