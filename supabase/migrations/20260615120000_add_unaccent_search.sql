-- Pesquisa insensível a acentos ("camara" encontra "Câmara") e a maiúsculas
-- (já cobertas por ILIKE). unaccent() remove acentos de forma consistente;
-- combinado com pg_trgm dá pesquisa parcial eficiente mesmo sem acentos.

CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() não é IMMUTABLE por defeito (depende de configuração de
-- dicionário), o que impede criar índices funcionais sobre ela
-- directamente. Cria-se um wrapper IMMUTABLE fixando o dicionário.
CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$;

-- Índices funcionais GIN (trgm) sobre as colunas sem acentos — usados
-- pela função search_products abaixo para ILIKE '%termo%' eficiente,
-- já sem distinguir acentos.
CREATE INDEX IF NOT EXISTS idx_products_name_unaccent_trgm
  ON public.products USING gin (public.f_unaccent(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku_unaccent_trgm
  ON public.products USING gin (public.f_unaccent(sku) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_unaccent_trgm
  ON public.products USING gin (public.f_unaccent(description) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_short_description_unaccent_trgm
  ON public.products USING gin (public.f_unaccent(short_description) gin_trgm_ops);

-- ────────────────────────────────────────────────────────────────────────
-- search_products: pesquisa "todas as palavras, em qualquer ordem"
-- (AND entre termos, cada termo pesquisado em name/sku/description/
-- short_description, tudo sem distinguir acentos/maiúsculas).
--
-- Ex: "camara ip" encontra "Câmara IP Bullet 4MP" — encontra produtos que
-- contêm AMBAS as palavras, em qualquer posição/ordem, não só a frase
-- exacta "camara ip".
--
-- Os parâmetros p_mundo/p_category/p_family_id/p_type_id/p_brand_id/
-- p_brand reproduzem os filtros usados no frontend (WorldCatalog e
-- Pesquisa), para reaproveitar esta função em ambos os contextos.
-- ────────────────────────────────────────────────────────────────────────
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
BEGIN
  -- Divide a pesquisa em palavras (cada palavra tem de aparecer, em
  -- qualquer ordem, em qualquer um dos campos pesquisáveis).
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
        ' OR public.f_unaccent(short_description) ILIKE public.f_unaccent(%L))',
        '%' || v_terms[i] || '%', '%' || v_terms[i] || '%',
        '%' || v_terms[i] || '%', '%' || v_terms[i] || '%'
      );
    END LOOP;
  END IF;

  -- Ordenação — whitelist de colunas permitidas para evitar SQL injection
  -- via p_order_by.
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

-- Acesso público (mesmo nível de leitura que a tabela "products" já tem).
GRANT EXECUTE ON FUNCTION public.search_products TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
