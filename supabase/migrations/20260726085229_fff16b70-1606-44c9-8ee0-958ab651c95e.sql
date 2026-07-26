REVOKE SELECT ON public.products FROM anon;

GRANT SELECT (
  id, name, description, category, price, image_url, created_at, updated_at,
  family_id, featured, include_in_catalog, brand_id, mundo, fornecedor, slug,
  stock_status, short_description, especificacoes, destaques, conteudo_embalagem,
  produtos_relacionados, categoria_pai, sob_encomenda, sku, show_on_homepage,
  family, brand, weight, ean, envio_especial, imagens_extra, relacionados,
  upgrades, type, type_id, specs_locked, min_sale_qty, price_locked, taxa_iva,
  store_price, store_price_vat
) ON public.products TO anon;