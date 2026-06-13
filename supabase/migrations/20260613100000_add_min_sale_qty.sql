-- Quantidade mínima de venda (embalagem mínima) — alguns produtos ALL.TO
-- só podem ser encomendados em múltiplos de N unidades (ex: caixa de 100).
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_sale_qty integer NOT NULL DEFAULT 1;
