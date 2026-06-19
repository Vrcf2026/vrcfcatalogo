
-- 1) Tighten anonymous quote insert: require user_id IS NULL for anon, keep auth flow intact
DROP POLICY IF EXISTS "Anyone can create quotes" ON public.quotes;

CREATE POLICY "Anon can create quotes without user_id"
ON public.quotes
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- (Existing "Users create own quotes" already covers authenticated inserts with auth.uid() = user_id)

-- 2) Fix mutable search_path on custom functions
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE PARALLEL SAFE STRICT
SET search_path TO 'public'
AS $function$
  SELECT public.unaccent('public.unaccent', $1)
$function$;

CREATE OR REPLACE FUNCTION public.search_products(
  p_query text,
  p_mundo text DEFAULT NULL::text,
  p_category text DEFAULT NULL::text,
  p_family_id uuid DEFAULT NULL::uuid,
  p_type_id uuid DEFAULT NULL::uuid,
  p_brand_id uuid DEFAULT NULL::uuid,
  p_brand text DEFAULT NULL::text,
  p_limit integer DEFAULT 24,
  p_offset integer DEFAULT 0,
  p_order_by text DEFAULT 'created_at'::text,
  p_order_asc boolean DEFAULT false
)
RETURNS TABLE(row_data jsonb, total_count bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_terms text[];
  v_where text := 'include_in_catalog = true';
  v_order text;
BEGIN
  v_terms := regexp_split_to_array(trim(p_query), '\s+');

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

  IF v_terms IS NOT NULL AND array_length(v_terms, 1) > 0 AND p_query <> '' THEN
    FOR i IN 1..array_length(v_terms, 1) LOOP
      v_where := v_where || format(
        ' AND (public.f_unaccent(name) ILIKE public.f_unaccent(%L)' ||
        ' OR public.f_unaccent(sku) ILIKE public.f_unaccent(%L)' ||
        ' OR public.f_unaccent(description) ILIKE public.f_unaccent(%L)' ||
        ' OR public.f_unaccent(short_description) ILIKE public.f_unaccent(%L)' ||
        ' OR public.f_unaccent(especificacoes::text) ILIKE public.f_unaccent(%L))',
        '%' || v_terms[i] || '%',
        '%' || v_terms[i] || '%',
        '%' || v_terms[i] || '%',
        '%' || v_terms[i] || '%',
        '%' || v_terms[i] || '%'
      );
    END LOOP;
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

  RETURN QUERY EXECUTE format(
    'SELECT to_jsonb(p) AS row_data, count(*) OVER() AS total_count
     FROM public.products p
     WHERE %s
     ORDER BY %s
     LIMIT %s OFFSET %s',
    v_where, v_order, p_limit, p_offset
  );
END;
$function$;
