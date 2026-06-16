-- RPCs para analytics do catálogo e comerciais
-- Todas com SECURITY DEFINER para eficiência e segurança

-- 1. Analytics por categoria (Admin — catálogo)
CREATE OR REPLACE FUNCTION public.get_analytics_by_category(
  p_event_type text DEFAULT 'click',
  p_since timestamptz DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (category text, mundo text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.category, p.mundo, count(*) AS count
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE a.event_type = p_event_type
    AND (p_since IS NULL OR a.created_at >= p_since)
    AND p.category IS NOT NULL
  GROUP BY p.category, p.mundo
  ORDER BY count DESC
  LIMIT p_limit;
$$;

-- 2. Analytics por marca (Admin — catálogo)
CREATE OR REPLACE FUNCTION public.get_analytics_by_brand(
  p_event_type text DEFAULT 'click',
  p_since timestamptz DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (brand text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(p.brand, 'Sem marca') AS brand, count(*) AS count
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE a.event_type = p_event_type
    AND (p_since IS NULL OR a.created_at >= p_since)
  GROUP BY p.brand
  ORDER BY count DESC
  LIMIT p_limit;
$$;

-- 3. Analytics por mundo (Admin — catálogo)
CREATE OR REPLACE FUNCTION public.get_analytics_by_mundo(
  p_since timestamptz DEFAULT NULL
)
RETURNS TABLE (mundo text, clicks bigint, quotes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.mundo,
    count(*) FILTER (WHERE a.event_type = 'click') AS clicks,
    count(*) FILTER (WHERE a.event_type = 'quote') AS quotes
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE (p_since IS NULL OR a.created_at >= p_since)
  GROUP BY p.mundo
  ORDER BY clicks DESC;
$$;

-- 4. Produtos sem stock mais clicados (Admin — oportunidade de negócio)
CREATE OR REPLACE FUNCTION public.get_out_of_stock_clicked(
  p_since timestamptz DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (product_id uuid, name text, category text, brand text, mundo text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.category, p.brand, p.mundo, count(*) AS count
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE a.event_type = 'click'
    AND p.stock_status = 'out'
    AND (p_since IS NULL OR a.created_at >= p_since)
  GROUP BY p.id, p.name, p.category, p.brand, p.mundo
  ORDER BY count DESC
  LIMIT p_limit;
$$;

-- 5. Produtos top com contexto (nome + categoria + marca + mundo)
CREATE OR REPLACE FUNCTION public.get_top_products_with_context(
  p_event_type text DEFAULT 'click',
  p_since timestamptz DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  product_id uuid, name text, category text,
  brand text, mundo text, image_url text,
  stock_status text, count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.category, p.brand, p.mundo, p.image_url, p.stock_status, count(*) AS count
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE a.event_type = p_event_type
    AND (p_since IS NULL OR a.created_at >= p_since)
  GROUP BY p.id, p.name, p.category, p.brand, p.mundo, p.image_url, p.stock_status
  ORDER BY count DESC
  LIMIT p_limit;
$$;

-- 6. Evolução temporal por semana (Gestão — orçamentos)
CREATE OR REPLACE FUNCTION public.get_quotes_over_time(
  p_weeks int DEFAULT 12
)
RETURNS TABLE (week date, total bigint, accepted bigint, pending bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date_trunc('week', created_at)::date AS week,
    count(*) AS total,
    count(*) FILTER (WHERE status = 'accepted') AS accepted,
    count(*) FILTER (WHERE status = 'pending') AS pending
  FROM quotes
  WHERE created_at >= now() - (p_weeks || ' weeks')::interval
  GROUP BY week
  ORDER BY week;
$$;

-- Permissões (admins e gestores)
GRANT EXECUTE ON FUNCTION public.get_analytics_by_category TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_by_brand TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_by_mundo TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_out_of_stock_clicked TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products_with_context TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_quotes_over_time TO authenticated;

NOTIFY pgrst, 'reload schema';
