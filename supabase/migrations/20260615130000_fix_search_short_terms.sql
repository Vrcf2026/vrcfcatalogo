-- Corrige search_products: termos curtos (≤3 caracteres, ex: "ip", "4k",
-- "led", "usb", "pt") com ILIKE '%termo%' davam falsos positivos —
-- "ip" entra em "equ-IP-amento", "partic-IP-ação", "princ-ÍP-io", etc.
--
-- Para termos com ≤3 caracteres, usa-se correspondência por PALAVRA
-- INTEIRA (regex ~* com \m...\M = word boundaries), insensível a
-- maiúsculas/acentos. Para termos mais longos (4+), mantém-se ILIKE
-- '%termo%' (permite prefixos/sufixos parciais, ex: "câmar" encontra
-- "câmara"/"câmaras").

CREATE OR REPLACE FUNCTION public.search_products(
  p_query text,
  p_mundo text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_family_id uuid DEFAULT NULL,
  p_type_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_brand text DEFAULT NULL,
  p_limit int DEFAULT 24,
  p_offset int DEFAULT 0,
  p_order_by text DEFAULT 'created_at',
  p_order_asc boolean DEFAULT false
)
RETURNS TABLE (row_data jsonb, total_count bigint)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_terms text[];
  v_where text := 'include_in_catalog = true';
  v_order text;
  v_term text;
  v_pattern text;
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
      v_term := v_terms[i];

      IF length(v_term) <= 3 THEN
        -- Termo curto (ex: "ip", "4k", "led", "pt") — exige palavra
        -- inteira (word boundary) para evitar falsos positivos dentro de
        -- outras palavras (ex: "equ-IP-amento").
        v_pattern := '\m' || v_term || '\M';
        v_where := v_where || format(
          ' AND (public.f_unaccent(name) ~* public.f_unaccent(%L)' ||
          ' OR public.f_unaccent(sku) ~* public.f_unaccent(%L)' ||
          ' OR public.f_unaccent(description) ~* public.f_unaccent(%L)' ||
          ' OR public.f_unaccent(short_description) ~* public.f_unaccent(%L))',
          v_pattern, v_pattern, v_pattern, v_pattern
        );
      ELSE
        -- Termo normal (4+ caracteres) — substring, permite
        -- prefixos/sufixos parciais (ex: "câmar" encontra "câmaras").
        v_pattern := '%' || v_term || '%';
        v_where := v_where || format(
          ' AND (public.f_unaccent(name) ILIKE public.f_unaccent(%L)' ||
          ' OR public.f_unaccent(sku) ILIKE public.f_unaccent(%L)' ||
          ' OR public.f_unaccent(description) ILIKE public.f_unaccent(%L)' ||
          ' OR public.f_unaccent(short_description) ILIKE public.f_unaccent(%L))',
          v_pattern, v_pattern, v_pattern, v_pattern
        );
      END IF;
    END LOOP;
  END IF;

  v_order := CASE p_order_by
    WHEN 'price' THEN 'price'
    WHEN 'name' THEN 'name'
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
$$;

GRANT EXECUTE ON FUNCTION public.search_products TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
