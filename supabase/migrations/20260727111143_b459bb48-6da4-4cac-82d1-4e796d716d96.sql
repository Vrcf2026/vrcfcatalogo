CREATE OR REPLACE FUNCTION public.get_analytics_by_category(p_event_type text DEFAULT 'click'::text, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10)
 RETURNS TABLE(category text, mundo text, count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_gestao_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT p.category, p.mundo, count(*) AS count
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE a.event_type = p_event_type
    AND (p_since IS NULL OR a.created_at >= p_since)
    AND p.category IS NOT NULL
  GROUP BY p.category, p.mundo
  ORDER BY count DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_by_brand(p_event_type text DEFAULT 'click'::text, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10)
 RETURNS TABLE(brand text, count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_gestao_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT COALESCE(p.brand, 'Sem marca') AS brand, count(*) AS count
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE a.event_type = p_event_type
    AND (p_since IS NULL OR a.created_at >= p_since)
  GROUP BY p.brand
  ORDER BY count DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_by_mundo(p_since timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(mundo text, clicks bigint, quotes bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_gestao_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT
    p.mundo,
    count(*) FILTER (WHERE a.event_type = 'click') AS clicks,
    count(*) FILTER (WHERE a.event_type = 'quote') AS quotes
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE (p_since IS NULL OR a.created_at >= p_since)
  GROUP BY p.mundo
  ORDER BY clicks DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_out_of_stock_clicked(p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10)
 RETURNS TABLE(product_id uuid, name text, category text, brand text, mundo text, count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_gestao_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT p.id, p.name, p.category, p.brand, p.mundo, count(*) AS count
  FROM product_analytics a
  JOIN products p ON p.id = a.product_id
  WHERE a.event_type = 'click'
    AND p.stock_status = 'out'
    AND (p_since IS NULL OR a.created_at >= p_since)
  GROUP BY p.id, p.name, p.category, p.brand, p.mundo
  ORDER BY count DESC
  LIMIT p_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_quotes_over_time(p_weeks integer DEFAULT 12)
 RETURNS TABLE(week date, total bigint, accepted bigint, pending bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_gestao_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
  SELECT
    date_trunc('week', q.created_at)::date AS week,
    count(*) AS total,
    count(*) FILTER (WHERE q.status = 'accepted') AS accepted,
    count(*) FILTER (WHERE q.status = 'pending') AS pending
  FROM quotes q
  WHERE q.created_at >= now() - (p_weeks || ' weeks')::interval
  GROUP BY 1
  ORDER BY 1;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_top_products_with_context(p_event_type text DEFAULT 'click'::text, p_since timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 10)
 RETURNS TABLE(product_id uuid, name text, category text, brand text, mundo text, image_url text, stock_status text, price numeric, slug text, sku text, weight numeric, count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
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
END;
$function$;