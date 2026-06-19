CREATE OR REPLACE FUNCTION public.get_specs_aggregation(p_mundo text, p_category text DEFAULT NULL, p_family_id uuid DEFAULT NULL, p_brand_id uuid DEFAULT NULL, p_brand_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT especificacoes
    FROM products
    WHERE mundo = p_mundo
      AND include_in_catalog = true
      AND especificacoes IS NOT NULL
      AND especificacoes <> '{}'::jsonb
      AND (p_category   IS NULL OR category  = p_category)
      AND (p_family_id  IS NULL OR family_id = p_family_id)
      AND (
        (p_brand_id IS NULL AND p_brand_name IS NULL)
        OR brand_id = p_brand_id
        OR brand    = p_brand_name
      )
  ),
  pairs AS (
    SELECT kv.key, kv.value
    FROM base, LATERAL jsonb_each_text(base.especificacoes) AS kv(key, value)
    WHERE kv.key NOT IN ('portas','compatibilidade','firmware_ota','teclado_nota','marca','modelo','sku','ref')
      AND char_length(kv.value) BETWEEN 1 AND 60
  ),
  counts AS (
    SELECT key, value, count(*)::int AS c
    FROM pairs
    GROUP BY key, value
  ),
  grouped AS (
    SELECT
      key,
      jsonb_agg(jsonb_build_object('value', value, 'count', c) ORDER BY c DESC) AS vals,
      count(*) AS n_values,
      sum(c) AS total
    FROM counts
    GROUP BY key
    HAVING count(*) > 1
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('key', key, 'label', replace(key, '_', ' '), 'values', vals)
      ORDER BY total DESC, n_values DESC
    ),
    '[]'::jsonb
  )
  FROM grouped;
$$;