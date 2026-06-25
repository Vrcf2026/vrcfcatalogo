-- Correcção de preços ALL.TO: o importador estava a gravar "price" com
-- IVA incluído (pvp_com_iva) em vez de sem IVA (pvp_sem_iva). O site
-- aplica *1.23 ao mostrar o preço, por isso os produtos ALL.TO estavam
-- com IVA aplicado duas vezes — preços ~23% mais caros do que deviam.
--
-- Esta migration divide o price e price_tier* por 1.23 para que fiquem
-- consistentes com Visiotech e Diginova (que gravam sem IVA).

UPDATE public.products
SET
  price      = ROUND((price      / 1.23)::numeric, 2),
  price_tier2 = CASE WHEN price_tier2 IS NOT NULL
                  THEN ROUND((price_tier2 / 1.23)::numeric, 2)
                  ELSE NULL END,
  price_tier3 = CASE WHEN price_tier3 IS NOT NULL
                  THEN ROUND((price_tier3 / 1.23)::numeric, 2)
                  ELSE NULL END
WHERE fornecedor = 'allto'
  AND price IS NOT NULL
  AND price > 0;

-- Nota: purchase_price (custo) já vinha sem IVA (pvr = custo sem IVA da
-- ALL.TO), por isso NÃO é alterado.

NOTIFY pgrst, 'reload schema';
