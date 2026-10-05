-- ════════════════════════════════════════════════════════════════════
-- 1. Orçamentos: validade (era preenchida e perdia-se) e controlo de lembretes
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS validade text;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

-- ════════════════════════════════════════════════════════════════════
-- 2. Preços por escalão (B2B): o cliente com escalão 2/3 vê price_tier2/3
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS price_tier smallint NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE public.customer_profiles
    ADD CONSTRAINT customer_profiles_price_tier_check CHECK (price_tier BETWEEN 1 AND 3);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- O cliente pode editar o próprio perfil ("Users manage own profile"), por isso o escalão
-- tem de ser protegido: só a gestão (ou a service role) o altera.
CREATE OR REPLACE FUNCTION public.protect_price_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_gestao_access(auth.uid()) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.price_tier := 1;
  ELSE
    NEW.price_tier := OLD.price_tier;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_price_tier ON public.customer_profiles;
CREATE TRIGGER protect_price_tier
  BEFORE INSERT OR UPDATE ON public.customer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_price_tier();

-- Só devolve produtos em que o escalão do cliente tem preço mais baixo.
-- O escalão vem do perfil do próprio utilizador (auth.uid()), nunca do pedido.
CREATE OR REPLACE FUNCTION public.get_my_tier_prices(p_ids uuid[])
RETURNS TABLE(id uuid, price numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH t AS (
    SELECT cp.price_tier FROM public.customer_profiles cp
     WHERE cp.user_id = auth.uid()
     LIMIT 1
  )
  SELECT p.id,
         CASE t.price_tier WHEN 2 THEN p.price_tier2 WHEN 3 THEN p.price_tier3 END
    FROM public.products p, t
   WHERE t.price_tier > 1
     AND p.id = ANY (p_ids[1:500])
     AND p.include_in_catalog
     AND CASE t.price_tier WHEN 2 THEN p.price_tier2 WHEN 3 THEN p.price_tier3 END IS NOT NULL
     AND CASE t.price_tier WHEN 2 THEN p.price_tier2 WHEN 3 THEN p.price_tier3 END < p.price
$$;

REVOKE ALL ON FUNCTION public.get_my_tier_prices(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_tier_prices(uuid[]) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 3. Registo de pesquisas (para ver o que os clientes procuram e não encontram)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.search_log (
  id         bigserial PRIMARY KEY,
  query      text        NOT NULL,
  terms      text,
  mundo      text,
  results    integer     NOT NULL,
  ai         boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.search_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_search_log_created ON public.search_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_search(p_query text, p_terms text, p_mundo text, p_results integer, p_ai boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF length(trim(coalesce(p_query, ''))) < 2 THEN RETURN; END IF;
  INSERT INTO public.search_log (query, terms, mundo, results, ai)
  VALUES (left(lower(trim(p_query)), 200), left(p_terms, 200), left(p_mundo, 30), greatest(p_results, 0), coalesce(p_ai, false));
  IF random() < 0.01 THEN
    DELETE FROM public.search_log WHERE created_at < now() - interval '180 days';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.log_search(text, text, text, integer, boolean) TO anon, authenticated;

-- Pesquisas agregadas (só gestão): as que deram zero ou poucos resultados
CREATE OR REPLACE FUNCTION public.get_search_gaps(p_days integer DEFAULT 30, p_max_results integer DEFAULT 0)
RETURNS TABLE(query text, searches bigint, last_seen timestamptz, max_results integer, ai_used boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_gestao_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
    SELECT s.query, count(*), max(s.created_at), max(s.results), bool_or(s.ai)
      FROM public.search_log s
     WHERE s.created_at > now() - make_interval(days => p_days)
     GROUP BY s.query
    HAVING max(s.results) <= p_max_results
     ORDER BY count(*) DESC, max(s.created_at) DESC
     LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.get_search_gaps(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_search_gaps(integer, integer) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 4. Alertas de preço (só gestão)
--    a) produtos à venda com margem abaixo do mínimo (ou negativa)
--    b) variações bruscas de preço/custo nos últimos dias (importadores)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_price_alerts(p_min_margin numeric DEFAULT 5, p_change_pct numeric DEFAULT 30, p_days integer DEFAULT 7)
RETURNS TABLE(
  kind text, product_id uuid, name text, sku text, fornecedor text,
  price numeric, purchase_price numeric, margin_pct numeric,
  old_value numeric, new_value numeric, change_pct numeric, changed_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_gestao_access(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  -- price e purchase_price estão ambos sem IVA
  RETURN QUERY
    SELECT 'margem'::text, p.id, p.name, p.sku, p.fornecedor,
           p.price, p.purchase_price,
           round((p.price - p.purchase_price) / nullif(p.price, 0) * 100, 1),
           NULL::numeric, NULL::numeric, NULL::numeric, p.updated_at
      FROM public.products p
     WHERE p.include_in_catalog
       AND p.price > 0 AND p.purchase_price > 0
       AND (p.price - p.purchase_price) / p.price * 100 < p_min_margin
     ORDER BY (p.price - p.purchase_price) / p.price
     LIMIT 200;

  RETURN QUERY
    SELECT CASE WHEN abs(h.price_new - h.price_old) / nullif(h.price_old, 0) * 100 >= p_change_pct
                THEN 'preco' ELSE 'custo' END,
           p.id, coalesce(p.name, h.sku), h.sku, h.fornecedor,
           p.price, p.purchase_price,
           round((p.price - p.purchase_price) / nullif(p.price, 0) * 100, 1),
           CASE WHEN abs(h.price_new - h.price_old) / nullif(h.price_old, 0) * 100 >= p_change_pct
                THEN h.price_old ELSE h.purchase_price_old END,
           CASE WHEN abs(h.price_new - h.price_old) / nullif(h.price_old, 0) * 100 >= p_change_pct
                THEN h.price_new ELSE h.purchase_price_new END,
           round(greatest(
             coalesce(abs(h.price_new - h.price_old) / nullif(h.price_old, 0) * 100, 0),
             coalesce(abs(h.purchase_price_new - h.purchase_price_old) / nullif(h.purchase_price_old, 0) * 100, 0)
           ), 1),
           h.changed_at
      FROM public.price_history h
      LEFT JOIN public.products p ON p.sku = h.sku AND (h.fornecedor IS NULL OR p.fornecedor = h.fornecedor)
     WHERE h.changed_at > now() - make_interval(days => p_days)
       AND (abs(h.price_new - h.price_old) / nullif(h.price_old, 0) * 100 >= p_change_pct
         OR abs(h.purchase_price_new - h.purchase_price_old) / nullif(h.purchase_price_old, 0) * 100 >= p_change_pct)
     ORDER BY h.changed_at DESC
     LIMIT 200;
END;
$$;
REVOKE ALL ON FUNCTION public.get_price_alerts(numeric, numeric, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_price_alerts(numeric, numeric, integer) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- 5. Cron diário (9h) para seguimento de orçamentos
--    Usa a service key já guardada no vault pela infraestrutura de email.
-- ════════════════════════════════════════════════════════════════════
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'quote-followups';
    PERFORM cron.schedule(
      'quote-followups',
      '0 8 * * *',  -- 08:00 UTC = 9h em Portugal no verão, 8h no inverno
      $cron$
        SELECT net.http_post(
          url := 'https://mgdhclajlcmepdfrkktw.supabase.co/functions/v1/quote-followups',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
          ),
          body := '{}'::jsonb
        );
      $cron$
    );
  END IF;
END $$;
