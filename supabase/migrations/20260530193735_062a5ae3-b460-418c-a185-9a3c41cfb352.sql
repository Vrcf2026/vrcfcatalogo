ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS visivel BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS mundo TEXT DEFAULT 'todos';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_mundo_check') THEN
    ALTER TABLE public.categories ADD CONSTRAINT categories_mundo_check CHECK (mundo IN ('seguranca','escritorio','todos'));
  END IF;
END $$;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn FROM public.categories
)
UPDATE public.categories c SET ordem = r.rn FROM ranked r WHERE c.id = r.id AND c.ordem = 0;