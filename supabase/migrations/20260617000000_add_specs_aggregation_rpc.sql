-- RPC para agregar valores de specs de todos os produtos de uma
-- categoria/família sem trazer JSONB para o browser.
-- Devolve array de grupos [{key, values:[{value,count}]}]
-- ordenados por número de valores distintos (desc).
-- Sem limite artificial — mostra TODAS as specs e TODOS os valores.

CREATE OR REPLACE FUNCTION public.get_specs_aggregation(
  p_mundo      text,
  p_category   text DEFAULT NULL,
  p_family_id  uuid DEFAULT NULL,
  p_brand_id   uuid DEFAULT NULL,
  p_brand_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_map  jsonb := '{}'::jsonb;
  v_rec  record;
  v_key  text;
  v_val  text;
  v_result jsonb := '[]'::jsonb;
BEGIN
  -- Campos a ignorar sempre (não fazem sentido como filtro)
  FOR v_rec IN
    SELECT especificacoes
    FROM products
    WHERE mundo = p_mundo
      AND include_in_catalog = true
      AND especificacoes IS NOT NULL
      AND especificacoes != '{}'::jsonb
      AND (p_category  IS NULL OR category  = p_category)
      AND (p_family_id IS NULL OR family_id = p_family_id)
      AND (
        p_brand_id IS NULL AND p_brand_name IS NULL
        OR brand_id  = p_brand_id
        OR brand     = p_brand_name
      )
  LOOP
    FOR v_key, v_val IN
      SELECT key, value::text
      FROM jsonb_each_text(v_rec.especificacoes)
      WHERE key NOT IN (
        'portas','compatibilidade','firmware_ota','teclado_nota',
        'marca','modelo','sku','ref'
      )
        AND char_length(value::text) <= 60
        AND char_length(value::text) > 0
    LOOP
      -- Incrementa contador para (key, value)
      v_map := jsonb_set(
        v_map,
        ARRAY[v_key, v_val],
        to_jsonb(COALESCE((v_map -> v_key -> v_val)::int, 0) + 1)
      );
    END LOOP;
  END LOOP;

  -- Converter map para array de grupos
  SELECT jsonb_agg(
    jsonb_build_object(
      'key', grp.key,
      'label', replace(grp.key, '_', ' '),
      'values', grp.vals
    )
    ORDER BY jsonb_array_length(grp.vals) DESC
  )
  INTO v_result
  FROM (
    SELECT
      gkey AS key,
      (
        SELECT jsonb_agg(
          jsonb_build_object('value', vkey, 'count', vcount)
          ORDER BY vcount DESC
        )
        FROM (
          SELECT vkey, (v_map -> gkey -> vkey)::int AS vcount
          FROM jsonb_object_keys(v_map -> gkey) AS vkey
          ORDER BY (v_map -> gkey -> vkey)::int DESC
        ) sub
        WHERE vcount > 0
      ) AS vals
    FROM jsonb_object_keys(v_map) AS gkey
  ) grp
  WHERE jsonb_array_length(grp.vals) > 1;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_specs_aggregation TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
