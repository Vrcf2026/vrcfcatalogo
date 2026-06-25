-- Índices de suporte à refactoração server-side do Admin (paginação,
-- filtros em cascata, pesquisa e ordenação sobre a tabela "products",
-- que tem 27000+ linhas). Sem estes índices, cada filtro/contagem/
-- ordenação faz um seq scan completo à tabela.

-- Filtros directos (.eq) usados em applyProductFilters / dashboard
CREATE INDEX IF NOT EXISTS idx_products_category      ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_family_id     ON public.products(family_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id      ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_stock_status  ON public.products(stock_status);

-- Índice composto: Mundo + Categoria andam quase sempre juntos na cascata
-- de filtros (Mundo → Categoria → Família → Tipo → Marca).
CREATE INDEX IF NOT EXISTS idx_products_mundo_category ON public.products(mundo, category);

-- Colunas de ordenação da tabela do Admin (created_at é o default;
-- price/purchase_price ao clicar nos cabeçalhos "Compra"/"Venda")
CREATE INDEX IF NOT EXISTS idx_products_created_at    ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_price         ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_purchase_price ON public.products(purchase_price);

-- Pesquisa por nome/SKU/descrição (.ilike com '%termo%') — um índice
-- B-tree normal não ajuda neste tipo de padrão; usa-se pg_trgm + GIN,
-- que acelera substancialmente LIKE/ILIKE com termos parciais.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_trgm  ON public.products USING gin (sku gin_trgm_ops);

-- Descrição pode ser longa/NULL em muitos produtos; trgm também acelera
-- ILIKE aqui, mas o índice tende a ser maior — ainda assim vale a pena
-- dado que a pesquisa por descrição foi adicionada nesta refactoração.
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING gin (description gin_trgm_ops);

NOTIFY pgrst, 'reload schema';
