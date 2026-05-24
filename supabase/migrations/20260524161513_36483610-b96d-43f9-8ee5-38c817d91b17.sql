
-- Add new columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS mundo TEXT CHECK (mundo IN ('seguranca', 'escritorio'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fornecedor TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_status TEXT DEFAULT 'unknown' CHECK (stock_status IN ('high','medium','low','on_request','unknown'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS especificacoes JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS destaques JSONB;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS conteudo_embalagem TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS produtos_relacionados TEXT[];
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS categoria_pai TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sob_encomenda BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;

CREATE INDEX IF NOT EXISTS idx_products_mundo ON public.products(mundo);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_fornecedor ON public.products(fornecedor);

-- contact_leads table
CREATE TABLE IF NOT EXISTS public.contact_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert contact leads"
ON public.contact_leads FOR INSERT TO public
WITH CHECK (true);

CREATE POLICY "Admins can view contact leads"
ON public.contact_leads FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update contact leads"
ON public.contact_leads FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contact leads"
ON public.contact_leads FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
