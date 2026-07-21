-- Ensure sensitive cost/supplier columns on public.products are never exposed
-- to anon or authenticated roles. Gestao/admin access goes through the
-- SECURITY DEFINER RPC public.get_products_internal_pricing.

REVOKE SELECT (purchase_price, purchase_price_vat, price_tier2, price_tier3, fornecedor)
  ON public.products FROM PUBLIC;
REVOKE SELECT (purchase_price, purchase_price_vat, price_tier2, price_tier3, fornecedor)
  ON public.products FROM anon;
REVOKE SELECT (purchase_price, purchase_price_vat, price_tier2, price_tier3)
  ON public.products FROM authenticated;

-- Frontend shipping logic needs `fornecedor` for signed-in users; keep it.
GRANT SELECT (fornecedor) ON public.products TO authenticated;

-- service_role keeps full access for edge functions / admin RPCs.
GRANT SELECT ON public.products TO service_role;