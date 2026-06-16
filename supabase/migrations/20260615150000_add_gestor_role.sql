-- PASSO 1: Adicionar o valor ao enum numa transação isolada.
-- O Postgres exige que ADD VALUE seja committed antes de poder ser
-- referenciado noutras queries da mesma sessão.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor';

-- Forçar commit do ADD VALUE antes de prosseguir.
-- (No SQL Editor do Supabase, cada statement já corre em transação
-- separada, mas em alguns contextos é necessário o COMMIT explícito.
-- Se este ficheiro for corrido pelo Lovable como migration, o ADD VALUE
-- já fica committed automaticamente antes do resto.)

COMMIT;

-- PASSO 2: Criar a função e policies que referenciam 'gestor'.

-- Helper: acesso à área de gestão comercial (gestor, admin, super_admin)
CREATE OR REPLACE FUNCTION public.has_gestao_access(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('gestor', 'admin', 'super_admin')
  )
$$;

-- ── Policies para gestores em customer_profiles ──
CREATE POLICY "Gestores view all profiles"
  ON public.customer_profiles FOR SELECT
  TO authenticated
  USING (public.has_gestao_access(auth.uid()));

CREATE POLICY "Gestores update all profiles"
  ON public.customer_profiles FOR UPDATE
  TO authenticated
  USING (public.has_gestao_access(auth.uid()))
  WITH CHECK (public.has_gestao_access(auth.uid()));

-- ── Policies para gestores em quotes ──
CREATE POLICY "Gestores view all quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (public.has_gestao_access(auth.uid()));

CREATE POLICY "Gestores update all quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (public.has_gestao_access(auth.uid()))
  WITH CHECK (public.has_gestao_access(auth.uid()));

-- ── Policies para gestores em quote_items ──
CREATE POLICY "Gestores view all quote items"
  ON public.quote_items FOR SELECT
  TO authenticated
  USING (public.has_gestao_access(auth.uid()));

-- ── Policies para gestores em rma_requests ──
CREATE POLICY "Gestores view all rma"
  ON public.rma_requests FOR SELECT
  TO authenticated
  USING (public.has_gestao_access(auth.uid()));

CREATE POLICY "Gestores update all rma"
  ON public.rma_requests FOR UPDATE
  TO authenticated
  USING (public.has_gestao_access(auth.uid()))
  WITH CHECK (public.has_gestao_access(auth.uid()));

NOTIFY pgrst, 'reload schema';
