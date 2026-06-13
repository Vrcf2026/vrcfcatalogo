ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_families ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_types ADD COLUMN IF NOT EXISTS visivel boolean NOT NULL DEFAULT true;