
-- Reset the blanket grants on public.products for authenticated role
REVOKE ALL ON public.products FROM authenticated;

-- Re-grant writes at table level (RLS still restricts to admins only)
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;

-- Grant SELECT only on non-sensitive columns to authenticated
GRANT SELECT (
  id, name, description, category, price, image_url, created_at, updated_at,
  family_id, featured, include_in_catalog, brand_id, mundo, slug, stock_status,
  short_description, especificacoes, destaques, conteudo_embalagem,
  produtos_relacionados, categoria_pai, sob_encomenda, sku, show_on_homepage,
  family, brand, weight, ean, envio_especial, imagens_extra, relacionados,
  upgrades, type, type_id, specs_locked, min_sale_qty, price_locked, taxa_iva,
  store_price, store_price_vat
) ON public.products TO authenticated;

-- Ensure service_role retains full access
GRANT ALL ON public.products TO service_role;

-- Security-definer RPC to expose internal pricing only to gestao/admin roles
CREATE OR REPLACE FUNCTION public.get_products_internal_pricing(p_ids uuid[])
RETURNS TABLE (
  id uuid,
  purchase_price numeric,
  purchase_price_vat numeric,
  price_tier2 numeric,
  price_tier3 numeric,
  fornecedor text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.purchase_price, p.purchase_price_vat, p.price_tier2, p.price_tier3, p.fornecedor
  FROM public.products p
  WHERE p.id = ANY(p_ids)
    AND public.has_gestao_access(auth.uid())
$$;

REVOKE ALL ON FUNCTION public.get_products_internal_pricing(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_products_internal_pricing(uuid[]) TO authenticated;
