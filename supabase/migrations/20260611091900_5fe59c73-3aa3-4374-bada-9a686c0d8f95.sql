
CREATE TABLE IF NOT EXISTS public.price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  fornecedor text,
  price_old numeric,
  price_new numeric,
  purchase_price_old numeric,
  purchase_price_new numeric,
  raw jsonb,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.price_history TO authenticated;
GRANT ALL ON public.price_history TO service_role;

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view price history"
  ON public.price_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_price_history_sku ON public.price_history(sku);
CREATE INDEX IF NOT EXISTS idx_price_history_fornecedor ON public.price_history(fornecedor);

-- Ensure uniqueness for lookup/create logic
CREATE UNIQUE INDEX IF NOT EXISTS brands_name_key ON public.brands(name);
CREATE UNIQUE INDEX IF NOT EXISTS product_families_name_category_key ON public.product_families(name, category);
