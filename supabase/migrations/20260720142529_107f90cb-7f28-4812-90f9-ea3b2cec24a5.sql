-- Restore SELECT on fornecedor for authenticated: it's a supplier label required
-- by shipping calc (customer checkout) and admin/gestao product filters. The
-- truly sensitive cost columns (purchase_price, purchase_price_vat, price_tier2,
-- price_tier3) remain revoked and continue to be accessible only through the
-- get_products_internal_pricing RPC gated by has_gestao_access.
GRANT SELECT (fornecedor) ON public.products TO authenticated;