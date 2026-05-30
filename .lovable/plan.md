## Importação Kilomat → VRCF Showroom

Trazer 4 blocos funcionais do projecto Catalogo Kilomat, adaptados à estrutura de 2 mundos (Segurança & Redes / Escritório & IT).

---

### 1. Pipeline de imagens (storage interno)

**Edge functions novas:**
- `supabase/functions/download-and-store-image/index.ts` — descarrega URL externo, redimensiona (max 1200 px), comprime JPEG q85, sobe para o bucket `product-images`. Inclui proteções SSRF (bloqueio de IPs privados, DNS rebinding, redirects), limite 25 MB, validação de content-type, requer admin via JWT.
- `supabase/functions/reprocess-all-images/index.ts` — apaga todas as `product_images` e relança `search-product-images` produto a produto, em background via `EdgeRuntime.waitUntil`.

**Componentes admin novos:**
- `src/components/MigrateImagesDialog.tsx` — botão "Migrar imagens externas": detecta `product_images` com host ≠ Supabase, chama `download-and-store-image` em loop, mostra progresso, pausa/retomar/parar, contador de MB poupados.
- `src/components/BulkImageSearchDialog.tsx` — botão "Buscar Imagens (Web)": carrega todos os produtos com `fetchAllRows`, filtra por famílias e/ou "sem imagens", chama `search-product-images` (já existe) com throttling adaptativo (0.8-1.8s + pausa 15s/50, backoff 30s em erros). Grava resultados em `product_images`.
- `src/components/ReprocessAllImagesButton.tsx` — botão único com AlertDialog que invoca `reprocess-all-images`.

Bucket `product-images` já existe e é público — sem migração necessária.

### 2. Sitemap dinâmico

**Edge function nova:** `supabase/functions/sitemap/index.ts` — adaptada de `showroom.kilomat.pt` para `showroom.vrcf.info`. Devolve sitemap-index + sub-sitemaps paginados (1000 produtos/página) com `/produto/:slug`. Caminhos estáticos: `/`, `/seguranca`, `/escritorio`, `/termos-e-condicoes`, `/politica-de-cookies`. Cache 24h.

**`public/robots.txt`** — actualizar `Sitemap:` para `https://mgdhclajlcmepdfrkktw.supabase.co/functions/v1/sitemap`.

**`public/sitemap.xml`** — manter estático mínimo (fallback), ou remover se preferires.

### 3. Destaques editáveis na homepage

**Nova tabela `public.homepage_highlights`** (migração):
- `id uuid`, `type text` (`brand|category`), `ref_id text`, `label text`, `position int`, `active bool`, timestamps.
- Unique `(type, ref_id)`.
- RLS: SELECT público; INSERT/UPDATE/DELETE só admin via `has_role`.
- GRANTs: `SELECT` a `anon` + `authenticated`; full a `authenticated` admin via policies; `ALL` a `service_role`.

**Componente novo:** `src/components/HomepageHighlightsDialog.tsx` — toggles por marca e por categoria, máx. 8 marcas / 9 categorias, upsert para a tabela. Adicionado ao header do Admin.

**Integração na homepage:** `src/pages/Index.tsx` lê `homepage_highlights` activos e mostra marcas em destaque (em vez de todas) e categorias em destaque por baixo dos 2 mundos.

### 4. Página de produto melhorada

Substituir `src/pages/Produto.tsx` por versão consolidada que adopta do Kilomat:
- Botão **WhatsApp** (+351 911 564 243) com mensagem pré-preenchida.
- Botão **Copiar link**.
- **Galeria com thumbnails** clicáveis (selector `selectedIdx`).
- **Selector de quantidade** ± com botão "Adicionar ao orçamento".
- **JSON-LD BreadcrumbList** além do Product já existente.
- Mantém: especificações (`especificacoes`), destaques (`destaques`), conteúdo embalagem, stock badges, suporte aos 2 mundos para o link "Voltar" (`/seguranca` ou `/escritorio` conforme `product.mundo`).

### Ficheiros a editar

- `src/pages/Admin.tsx` — adicionar 4 botões no header: `BulkImageSearchDialog`, `MigrateImagesDialog`, `ReprocessAllImagesButton`, `HomepageHighlightsDialog`.
- `src/pages/Index.tsx` — consumir `homepage_highlights` para marcas/categorias em destaque.
- `src/pages/Produto.tsx` — reescrita integrando melhorias.
- `public/robots.txt` — apontar `Sitemap:` ao novo endpoint.

### Não tocar (conforme já estabelecido)

`ProductCard`, `CheckoutDialog`, `CartDrawer`, `BrandsStrip`, `ContactFloatingBubble`, `CookieConsentBanner`, `ProductDetailDialog`, autenticação.

### Ordem de execução

1. Migração SQL (`homepage_highlights`) — esperar aprovação.
2. Criar 3 edge functions (`download-and-store-image`, `reprocess-all-images`, `sitemap`).
3. Criar 4 componentes admin (`MigrateImagesDialog`, `BulkImageSearchDialog`, `ReprocessAllImagesButton`, `HomepageHighlightsDialog`).
4. Reescrever `Produto.tsx`.
5. Editar `Admin.tsx`, `Index.tsx`, `robots.txt`.

Tempo estimado: 1 ciclo de build.
