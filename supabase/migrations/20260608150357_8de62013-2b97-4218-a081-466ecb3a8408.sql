ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS purchase_price numeric,
  ADD COLUMN IF NOT EXISTS purchase_price_vat numeric,
  ADD COLUMN IF NOT EXISTS weight numeric;