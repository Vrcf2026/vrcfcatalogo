CREATE OR REPLACE FUNCTION public.get_specs_aggregation(
  p_mundo text,
  p_category text DEFAULT NULL::text,
  p_family_id uuid DEFAULT NULL::uuid,
  p_brand_id uuid DEFAULT NULL::uuid,
  p_brand_name text DEFAULT NULL::text,
  p_tech_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH selected AS (
    SELECT
      f.key,
      array_agg(lower(trim(public.f_unaccent(v.value)))) AS norm_values
    FROM jsonb_each(p_tech_filters) AS f(key, arr)
    CROSS JOIN LATERAL jsonb_array_elements_text(f.arr) AS v(value)
    WHERE jsonb_typeof(f.arr) = 'array'
      AND trim(v.value) <> ''
    GROUP BY f.key
  ),
  base AS (
    SELECT id, especificacoes
    FROM public.products
    WHERE mundo = p_mundo
      AND include_in_catalog = true
      AND especificacoes IS NOT NULL
      AND especificacoes <> '{}'::jsonb
      AND (p_category  IS NULL OR category  = p_category)
      AND (p_family_id IS NULL OR family_id = p_family_id)
      AND (
        (p_brand_id IS NULL AND p_brand_name IS NULL)
        OR brand_id = p_brand_id
        OR brand    = p_brand_name
      )
  ),
  product_filter_matches AS (
    SELECT
      b.id,
      s.key,
      EXISTS (
        SELECT 1
        FROM jsonb_each_text(b.especificacoes) AS kv(key, value)
        WHERE kv.key = s.key
          AND lower(trim(public.f_unaccent(kv.value))) = ANY(s.norm_values)
      ) AS matched
    FROM base b
    CROSS JOIN selected s
  ),
  pairs AS (
    SELECT
      b.id,
      kv.key,
      trim(kv.value) AS display_value,
      lower(trim(public.f_unaccent(kv.value))) AS norm_value
    FROM base b
    CROSS JOIN LATERAL jsonb_each_text(b.especificacoes) AS kv(key, value)
    WHERE kv.key NOT IN ('portas','compatibilidade','firmware_ota','teclado_nota','marca','modelo','sku','ref')
      AND char_length(trim(kv.value)) BETWEEN 1 AND 60
      AND NOT EXISTS (
        SELECT 1
        FROM product_filter_matches pfm
        WHERE pfm.id = b.id
          AND pfm.key <> kv.key
          AND NOT pfm.matched
      )
  ),
  counts AS (
    SELECT
      p.key,
      p.norm_value,
      (array_agg(p.display_value ORDER BY p.display_value))[1] AS display_value,
      count(DISTINCT p.id)::int AS c
    FROM pairs p
    GROUP BY p.key, p.norm_value
  ),
  grouped AS (
    SELECT
      key,
      jsonb_agg(jsonb_build_object('value', display_value, 'count', c) ORDER BY c DESC, display_value) AS vals,
      count(*) AS n_values,
      sum(c) AS total
    FROM counts
    GROUP BY key
    HAVING count(*) > 1
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('key', key, 'label', replace(key, '_', ' '), 'values', vals)
      ORDER BY total DESC, n_values DESC, key
    ),
    '[]'::jsonb
  )
  FROM grouped;
$function$;