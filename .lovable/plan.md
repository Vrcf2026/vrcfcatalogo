## Visão geral

Transformar o `vrcfcatalogo` num showroom de 2 mundos (Segurança & Redes / Escritório & IT), com homepage de entrada, catálogos dedicados por mundo, filtros técnicos contextuais, página de produto com URL único e bubble de contacto. Reutilizar componentes do projecto `catalogokilomat` (BrandsStrip, ContactFloatingBubble, fetchAllRows, antiBot, GenerateDescriptionsDialog).

Dada a dimensão (16+ ficheiros novos/modificados, 1 migration grande, 1 tabela nova), proponho **faseamento em 3 entregas** para validares cada bloco antes de avançar — evita re-trabalho se algo precisar ajuste.

## Fase 1 — Base de dados + infraestrutura (1 migration + libs)

**Migration Supabase** (1 chamada):
- `products`: + colunas `mundo`, `fornecedor`, `slug`, `stock_status`, `short_description`, `especificacoes` (jsonb), `destaques` (jsonb), `conteudo_embalagem`, `produtos_relacionados` (text[]), `categoria_pai`, `sob_encomenda` + 3 índices
- Nova tabela `contact_leads` (id, name, email, phone, message, created_at) com RLS: insert público, select/update/delete só admin
- Adicionar `sku` à tabela `products` (referenciado em PRODUCT_COLUMNS do fetchAllRows)

**Ficheiros copiados do catalogokilomat**:
- `src/lib/fetchAllRows.ts` (paginação 1000 + concorrência 3 + retry)
- `src/lib/antiBot.ts` (honeypot + time-trap)
- `src/components/BrandsStrip.tsx` (adaptado: texto, animação `vrcf-scroll-x`, prop `mundo`, links contextuais)
- `src/components/ContactFloatingBubble.tsx` (adaptado: ShieldCheck, textos VRCF, grava em `contact_leads`, botão WhatsApp 911564243)
- `src/components/GenerateDescriptionsDialog.tsx` (admin)

**CSS**: adicionar keyframe `vrcf-scroll-x` em `index.css`.

## Fase 2 — Páginas novas e routing

**Novas páginas**:
- `src/pages/Seguranca.tsx` — catálogo `mundo="seguranca"`, tabs de categoria horizontal, sidebar `TechnicalFilters` quando categoria seleccionada, grid 4/2/1, pesquisa, ordenação, paginação client-side 24/pág, leitura de `?marca=` `?categoria=` `?pesquisa=`
- `src/pages/Escritorio.tsx` — igual mas `mundo="escritorio"` e filtros simples (marca/preço/stock)
- `src/pages/Produto.tsx` — `/produto/:slug`, breadcrumb, URL bar com copiar, galeria + info, 4 specs chave, WhatsApp pré-preenchido, botão "Instalação VRCF" (só segurança), tabs (Descrição/Specs/Embalagem/Relacionados), `<Helmet>` SEO dinâmico
- `src/components/TechnicalFilters.tsx` — sidebar contextual por categoria (Videovigilância/Alarmes/Controlo Acessos têm filtros específicos lidos de `destaques` JSONB; resto = marca+preço+stock), pills removíveis

**App.tsx**: + 3 rotas (`/seguranca`, `/escritorio`, `/produto/:slug`) + `HelmetProvider` em main.tsx.

**Homepage (`Index.tsx`)**: substituir hero + grid por:
- Header existente (mantido)
- Hero novo (título "O seu parceiro em tecnologia e segurança" + contactos)
- 2 cards grandes (Segurança / Escritório) max-width 800px
- BrandsStrip (sem filtro mundo)
- ContactFloatingBubble
- Manter: CartDrawer, SuggestionDialog, ScrollToTopButton, footer
- Remover: ProductFilters, grid de produtos, paginação (movem para `/seguranca` e `/escritorio`)

## Fase 3 — Enriquecimento de componentes existentes

- `ProductCard.tsx`: + badge resolução (canto sup. dir., só segurança, lido de `destaques`), + badge stock colorido, + 3 pills de specs resumidas
- `ProductDetailDialog.tsx`: + tabs Specs/Embalagem condicionais, + botão WhatsApp se tem `slug`, + `short_description` como subtítulo
- `AdminDashboard.tsx`: + botão "Gerar Descrições" (abre dialog), + colunas/filtros Mundo e Fornecedor
- `ImportProductsDialog.tsx`: mapear novos campos no parser CSV (incluindo slug auto-gerado, JSON.parse para jsonb, split por vírgula para arrays)

## Design (recap)

Mantém identidade VRCF: laranja `#E87722` primário, `#1a1a2e` autoridade, dark mode preservado. Badges com paleta definida (resolução azul, stock verde/amarelo/cinza). Pills de filtro activo `#FAEEDA`/`#854F0B`. Todas as cores via tokens semânticos do design system existente onde possível.

## Não mexer

CartDrawer, CartContext, useAuth, Login, TermosCondicoes, PoliticaCookies, Unsubscribe, CookieConsentBanner, CatalogPdfRenderer, CatalogViewer, CatalogA4Pages, Catalogos, CatalogoDestaques, todo `components/ui/`, `integrations/supabase/client.ts`.

## Pontos a confirmar antes de começar

1. **Faseamento**: ok avançar fase a fase (com validação tua entre fases), ou queres tudo numa entrega? Recomendo faseado — 16+ ficheiros de uma vez é alto risco.
2. **Coluna `sku`**: não existe em `products` mas `PRODUCT_COLUMNS` do catalogokilomat referencia-a. Adiciono na migration (TEXT nullable)?
3. **`contact_leads`**: confirmas que queres tabela nova (em vez de reutilizar `quote_requests` ou enviar email via edge function como o resto do projecto faz)?
4. **Categorias dos mundos**: vou usar as categorias existentes na tabela `categories` filtradas por mundo (via produtos). As 7 categorias de segurança (Videovigilância, Alarmes, etc.) e 5 de escritório que listaste — crio-as automaticamente se não existirem, ou esperas que as crie/importe manualmente?

Confirma e arranco pela Fase 1.