-- Correcção: get_top_products_with_context não incluía o campo price,
-- causando "Preço sob consulta" em todos os produtos da secção "Mais Vistos".
-- Acrescentamos também slug, sku e weight que o ProductCard também usa.

CREATE OR REPLACE FUNCTION public.get_top_products_with_context(
  p_event_type text DEFAULT 'click',
  p_since timestamptz DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  product_id uuid, name text, category text,
  brand text, mundo text, image_url text,
  stock_status text, price numeric, slug text,
  sku text, weight numeric, count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.name, p.category, p.brand, p.mundo, p.image_url,
    p.stock_status, p.price, p.slug, p.sku, p.weight,
    count(*) AS count
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE a.event_type = p_event_type
    AND (p_since IS NULL OR a.created_at >= p_since)
    AND p.include_in_catalog = true
  GROUP BY p.id, p.name, p.category, p.brand, p.mundo, p.image_url,
           p.stock_status, p.price, p.slug, p.sku, p.weight
  ORDER BY count DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_products_with_context TO anon, authenticated;
