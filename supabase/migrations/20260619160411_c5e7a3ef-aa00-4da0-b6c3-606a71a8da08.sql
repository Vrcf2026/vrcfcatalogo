CREATE OR REPLACE FUNCTION public.get_specs_aggregation(
  p_mundo text,
  p_category text DEFAULT NULL,
  p_family_id uuid DEFAULT NULL,
  p_brand_id uuid DEFAULT NULL,
  p_brand_name text DEFAULT NULL,
  p_tech_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT id, especificacoes
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
    SELECT b.id,
           kv.key,
           trim(kv.value)                  AS display_value,
           lower(trim(public.f_unaccent(kv.value))) AS norm_value
    FROM base b,
         LATERAL jsonb_each_text(b.especificacoes) AS kv(key, value)
    WHERE kv.key NOT IN ('portas','compatibilidade','firmware_ota','teclado_nota','marca','modelo','sku','ref')
      AND char_length(trim(kv.value)) BETWEEN 1 AND 60
  ),
  filter_keys AS (
    SELECT k AS key FROM jsonb_object_keys(p_tech_filters) AS k
  ),
  prod_match AS (
    SELECT b.id, fk.key,
      EXISTS (
        SELECT 1 FROM pairs p
        WHERE p.id = b.id
          AND p.key = fk.key
          AND p.norm_value IN (
            SELECT lower(trim(public.f_unaccent(v)))
            FROM jsonb_array_elements_text(p_tech_filters->fk.key) AS v
          )
      ) AS matched
    FROM base b CROSS JOIN filter_keys fk
  ),
  counts AS (
    SELECT p.key,
           p.norm_value,
           (
             SELECT p2.display_value
             FROM pairs p2
             WHERE p2.key = p.key AND p2.norm_value = p.norm_value
             GROUP BY p2.display_value
             ORDER BY count(*) DESC
             LIMIT 1
           ) AS display_value,
           count(DISTINCT p.id)::int AS c
    FROM pairs p
    WHERE NOT EXISTS (
      SELECT 1 FROM prod_match pm
      WHERE pm.id = p.id AND pm.key <> p.key AND NOT pm.matched
    )
    GROUP BY p.key, p.norm_value
  ),
  grouped AS (
    SELECT key,
           jsonb_agg(jsonb_build_object('value', display_value, 'count', c) ORDER BY c DESC) AS vals,
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