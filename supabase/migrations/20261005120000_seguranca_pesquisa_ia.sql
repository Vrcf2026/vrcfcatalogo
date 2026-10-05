-- ════════════════════════════════════════════════════════════════════
-- 1. Rate limiting para edge functions públicas
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key          text        NOT NULL,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Sem policies: só a service role (edge functions) acede.

CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits (window_start);

-- Devolve true se o pedido é permitido (e conta-o), false se excedeu o limite.
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window timestamptz := to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
  v_count  integer;
BEGIN
  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start) DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Limpeza ocasional de janelas antigas (~1% das chamadas)
  IF random() < 0.01 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN v_count <= p_max;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- 2. Pesquisa: filtro de preço no SQL + modo "qualquer termo" (fallback)
-- ════════════════════════════════════════════════════════════════════
-- DROP necessário: mudar a assinatura com CREATE OR REPLACE criava um overload
-- e o PostgREST deixava de saber qual chamar.
DROP FUNCTION IF EXISTS public.search_products(text, text, text, uuid, uuid, uuid, text, integer, integer, text, boolean);

CREATE FUNCTION public.search_products(
  p_query      text,
  p_mundo      text    DEFAULT NULL,
  p_category   text    DEFAULT NULL,
  p_family_id  uuid    DEFAULT NULL,
  p_type_id    uuid    DEFAULT NULL,
  p_brand_id   uuid    DEFAULT NULL,
  p_brand      text    DEFAULT NULL,
  p_limit      integer DEFAULT 24,
  p_offset     integer DEFAULT 0,
  p_order_by   text    DEFAULT 'created_at',
  p_order_asc  boolean DEFAULT false,
  p_min_price  numeric DEFAULT NULL,
  p_max_price  numeric DEFAULT NULL,
  p_match_any  boolean DEFAULT false
)
RETURNS TABLE(row_data jsonb, total_count bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_terms  text[];
  v_where  text := 'include_in_catalog = true';
  v_conds  text[] := '{}';
  v_rank   text := '0';
  v_order  text;
  v_cond   text;
  v_like   text;
BEGIN
  v_terms := array_remove(regexp_split_to_array(trim(coalesce(p_query, '')), '\s+'), '');

  IF p_mundo IS NOT NULL THEN
    v_where := v_where || format(' AND mundo = %L', p_mundo);
  END IF;
  IF p_category IS NOT NULL THEN
    v_where := v_where || format(' AND category = %L', p_category);
  END IF;
  IF p_family_id IS NOT NULL THEN
    v_where := v_where || format(' AND family_id = %L', p_family_id);
  END IF;
  IF p_type_id IS NOT NULL THEN
    v_where := v_where || format(' AND type_id = %L', p_type_id);
  END IF;
  IF p_brand_id IS NOT NULL AND p_brand IS NOT NULL THEN
    v_where := v_where || format(' AND (brand_id = %L OR brand = %L)', p_brand_id, p_brand);
  ELSIF p_brand_id IS NOT NULL THEN
    v_where := v_where || format(' AND brand_id = %L', p_brand_id);
  ELSIF p_brand IS NOT NULL THEN
    v_where := v_where || format(' AND brand = %L', p_brand);
  END IF;
  IF p_min_price IS NOT NULL THEN
    v_where := v_where || format(' AND price >= %L', p_min_price);
  END IF;
  IF p_max_price IS NOT NULL THEN
    v_where := v_where || format(' AND price <= %L', p_max_price);
  END IF;

  IF coalesce(array_length(v_terms, 1), 0) > 0 THEN
    FOR i IN 1..array_length(v_terms, 1) LOOP
      v_like := '%' || v_terms[i] || '%';
      v_cond := format(
        '(public.f_unaccent(name) ILIKE public.f_unaccent(%1$L)' ||
        ' OR public.f_unaccent(sku) ILIKE public.f_unaccent(%1$L)' ||
        ' OR public.f_unaccent(description) ILIKE public.f_unaccent(%1$L)' ||
        ' OR public.f_unaccent(short_description) ILIKE public.f_unaccent(%1$L)' ||
        ' OR public.f_unaccent(especificacoes::text) ILIKE public.f_unaccent(%1$L))',
        v_like);
      v_conds := v_conds || v_cond;
      -- Ranking: termo no nome vale mais do que noutro campo
      v_rank := v_rank || format(
        ' + (CASE WHEN public.f_unaccent(name) ILIKE public.f_unaccent(%1$L) THEN 2 ELSE 0 END)' ||
        ' + (CASE WHEN %2$s THEN 1 ELSE 0 END)', v_like, v_cond);
    END LOOP;

    IF p_match_any THEN
      v_where := v_where || ' AND (' || array_to_string(v_conds, ' OR ') || ')';
    ELSE
      v_where := v_where || ' AND ' || array_to_string(v_conds, ' AND ');
    END IF;
  END IF;

  v_order := CASE p_order_by
    WHEN 'price'    THEN 'price'
    WHEN 'name'     THEN 'name'
    WHEN 'featured' THEN 'featured'
    ELSE 'created_at'
  END || CASE WHEN p_order_asc THEN ' ASC' ELSE ' DESC' END || ' NULLS LAST';

  IF p_order_by = 'featured' THEN
    v_order := 'featured DESC, created_at DESC';
  END IF;

  -- No modo "qualquer termo", os produtos que batem em mais termos vêm primeiro
  IF p_match_any THEN
    v_order := '(' || v_rank || ') DESC, ' || v_order;
  END IF;

  RETURN QUERY EXECUTE format(
    'SELECT (to_jsonb(p) - ARRAY[''purchase_price'',''purchase_price_vat'',''price_tier2'',''price_tier3'']) AS row_data,
            count(*) OVER() AS total_count
     FROM public.products p
     WHERE %s
     ORDER BY %s
     LIMIT %s OFFSET %s',
    v_where, v_order, p_limit, p_offset
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.search_products(text, text, text, uuid, uuid, uuid, text, integer, integer, text, boolean, numeric, numeric, boolean) TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════
-- 3. Vocabulário real do catálogo (categorias e marcas por mundo) para a IA
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_catalog_vocabulary()
RETURNS TABLE(mundo text, kind text, value text, n bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT mundo, 'category'::text, category, count(*)
    FROM public.products
   WHERE include_in_catalog AND category IS NOT NULL AND mundo IS NOT NULL
   GROUP BY mundo, category
  UNION ALL
  SELECT mundo, 'brand'::text, brand, count(*)
    FROM public.products
   WHERE include_in_catalog AND brand IS NOT NULL AND mundo IS NOT NULL
   GROUP BY mundo, brand
$$;

REVOKE ALL ON FUNCTION public.get_catalog_vocabulary() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_catalog_vocabulary() TO service_role;

-- ════════════════════════════════════════════════════════════════════
-- 4. Índice trigram em falta: especificacoes era o único campo da pesquisa
--    sem índice, o que obrigava o OR a ler a tabela inteira
-- ════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_products_especificacoes_unaccent_trgm
  ON public.products USING gin (public.f_unaccent(especificacoes::text) gin_trgm_ops);
