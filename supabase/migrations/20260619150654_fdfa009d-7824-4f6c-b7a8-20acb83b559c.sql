
CREATE OR REPLACE FUNCTION public.get_search_category_counts(p_query text, p_mundo text DEFAULT NULL)
RETURNS TABLE(category text, count bigint)
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_terms text[];
  v_where text := 'include_in_catalog = true AND category IS NOT NULL';
BEGIN
  v_terms := regexp_split_to_array(trim(p_query), '\s+');

  IF p_mundo IS NOT NULL THEN
    v_where := v_where || format(' AND mundo = %L', p_mundo);
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

  RETURN QUERY EXECUTE format(
    'SELECT category, count(*)::bigint FROM public.products WHERE %s GROUP BY category ORDER BY count(*) DESC',
    v_where
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_search_category_counts(text, text) TO anon, authenticated;
