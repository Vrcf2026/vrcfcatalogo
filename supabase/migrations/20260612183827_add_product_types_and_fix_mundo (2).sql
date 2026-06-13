-- ─────────────────────────────────────────────
-- 1. Nível 3: tabela product_types (depende de uma product_family)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  family_id uuid NOT NULL REFERENCES public.product_families(id) ON DELETE CASCADE,
  mundo text NOT NULL DEFAULT 'todos',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, family_id, mundo)
);

ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Types viewable by everyone" ON public.product_types
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can insert types" ON public.product_types
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update types" ON public.product_types
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete types" ON public.product_types
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_product_types_family ON public.product_types(family_id);
CREATE INDEX IF NOT EXISTS idx_product_types_mundo ON public.product_types(mundo);

-- ─────────────────────────────────────────────
-- 2. Ligar products ao Nível 3
-- ─────────────────────────────────────────────
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES public.product_types(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_products_type_id ON public.products(type_id);

-- ─────────────────────────────────────────────
-- 3. Corrigir constraints de "mundo" para incluir 'economato' (ALL.TO)
-- ─────────────────────────────────────────────
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_mundo_check;
ALTER TABLE public.products ADD CONSTRAINT products_mundo_check
  CHECK (mundo IN ('seguranca','escritorio','economato','todos'));

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_mundo_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_mundo_check
  CHECK (mundo IN ('seguranca','escritorio','economato','todos'));

-- ─────────────────────────────────────────────
-- 4. Garantir coluna/constraint "mundo" em brands e product_families
--    (idempotente — não faz mal se já existir)
-- ─────────────────────────────────────────────
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS mundo TEXT DEFAULT 'todos';
ALTER TABLE public.product_families ADD COLUMN IF NOT EXISTS mundo TEXT DEFAULT 'todos';

ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_mundo_check;
ALTER TABLE public.brands ADD CONSTRAINT brands_mundo_check
  CHECK (mundo IN ('seguranca','escritorio','economato','todos'));

ALTER TABLE public.product_families DROP CONSTRAINT IF EXISTS product_families_mundo_check;
ALTER TABLE public.product_families ADD CONSTRAINT product_families_mundo_check
  CHECK (mundo IN ('seguranca','escritorio','economato','todos'));

-- ─────────────────────────────────────────────
-- 5. Corrigir constraints UNIQUE antigas que só consideravam "name"
--    (mesmo problema que já foi corrigido em categories — agora também
--    em brands e product_families, que falham ao criar a mesma marca/
--    família em mundos diferentes, ex: "OUTRAS" em economato vs seguranca)
-- ─────────────────────────────────────────────

-- Remover duplicados deixados por tentativas anteriores antes de criar a constraint
DELETE FROM public.brands a USING public.brands b
  WHERE a.ctid < b.ctid AND a.name = b.name AND a.mundo = b.mundo;

DELETE FROM public.product_families a USING public.product_families b
  WHERE a.ctid < b.ctid AND a.name = b.name AND a.category = b.category AND a.mundo = b.mundo;

ALTER TABLE public.brands DROP CONSTRAINT IF EXISTS brands_name_key;
ALTER TABLE public.brands ADD CONSTRAINT brands_name_mundo_key UNIQUE (name, mundo);

ALTER TABLE public.product_families DROP CONSTRAINT IF EXISTS product_families_name_key;
ALTER TABLE public.product_families ADD CONSTRAINT product_families_name_category_mundo_key
  UNIQUE (name, category, mundo);


