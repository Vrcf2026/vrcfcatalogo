-- Permite guardar orçamentos de clientes anónimos (não autenticados).
-- Anteriormente user_id NOT NULL impedia gravar orçamentos sem sessão.
-- Com esta alteração, todos os orçamentos ficam na BD independentemente
-- do cliente ter conta ou não.

ALTER TABLE public.quotes
  ALTER COLUMN user_id DROP NOT NULL;

-- Policy: clientes anónimos (role anon/public) podem criar orçamentos
-- mas só lêem os seus (por email — sem autenticação não há user_id).
-- Gestores e admins já têm policies de SELECT/UPDATE para ver tudo.
CREATE POLICY "Anyone can create quotes"
  ON public.quotes FOR INSERT
  TO public
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
