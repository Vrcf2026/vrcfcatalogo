-- 1) shipping_config: restaurar leitura pública.
-- Tinha sido restringida a staff numa migração de segurança anterior
-- (20260616202148), mas o cliente quer ver a estimativa de portes logo
-- no carrinho, antes de pedir orçamento — e está ciente de que isso
-- também expõe os valores a quem visitar o site. Decisão de negócio.
GRANT SELECT ON public.shipping_config TO anon;
DROP POLICY IF EXISTS "Shipping config viewable by staff" ON public.shipping_config;
CREATE POLICY "Shipping config viewable by everyone"
  ON public.shipping_config FOR SELECT
  USING (true);

-- 2) quotes: campos para o orçamento final (portes + prazo de entrega),
-- preenchidos/confirmados pela Gestão antes de enviar ao cliente.
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS shipping_total NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS prazo_entrega TEXT,
  ADD COLUMN IF NOT EXISTS sent_final_at TIMESTAMPTZ;
