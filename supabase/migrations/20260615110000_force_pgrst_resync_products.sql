-- Migration "trivial" para forçar o PostgREST/Lovable a re-sincronizar
-- com a tabela "products". Um NOTIFY isolado não resolveu um erro de
-- "permission denied" reportado pelo frontend (apesar de a BD, RLS e
-- GRANTs estarem confirmadamente correctos via SET ROLE anon).
--
-- COMMENT ON TABLE é uma alteração estrutural real (inócua), que em
-- alguns ambientes Supabase geridos obriga o PostgREST a recarregar a
-- definição da tabela de forma mais completa do que NOTIFY sozinho.

COMMENT ON TABLE public.products IS 'Catálogo de produtos VRCF (multi-mundo: seguranca, escritorio, economato).';

-- Reafirma explicitamente o GRANT de SELECT às roles públicas, por
-- garantia (idempotente — não altera nada se já existir).
GRANT SELECT ON public.products TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
