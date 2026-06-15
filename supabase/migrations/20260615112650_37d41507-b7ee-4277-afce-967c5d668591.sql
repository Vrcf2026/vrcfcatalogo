ALTER TABLE public.import_exclusions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_exclusions TO authenticated;
GRANT ALL ON public.import_exclusions TO service_role;
CREATE POLICY "Admins manage import exclusions" ON public.import_exclusions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER TABLE public.shipping_config ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.shipping_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_config TO authenticated;
GRANT ALL ON public.shipping_config TO service_role;
CREATE POLICY "Shipping config viewable by everyone" ON public.shipping_config FOR SELECT USING (true);
CREATE POLICY "Admins insert shipping config" ON public.shipping_config FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update shipping config" ON public.shipping_config FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete shipping config" ON public.shipping_config FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view price history" ON public.price_history;
CREATE POLICY "Admins can view price history" ON public.price_history FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (
  id, name, description, category, price, image_url, created_at, updated_at,
  family_id, featured, include_in_catalog, brand_id, mundo, slug, stock_status,
  short_description, especificacoes, destaques, conteudo_embalagem,
  produtos_relacionados, categoria_pai, sob_encomenda, sku, show_on_homepage,
  family, brand, weight, ean, envio_especial, imagens_extra, relacionados,
  upgrades, type, type_id, specs_locked, min_sale_qty
) ON public.products TO anon;