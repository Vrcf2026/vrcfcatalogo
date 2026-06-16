-- Função para listar utilizadores com os seus roles.
-- Requer SECURITY DEFINER para aceder a auth.users (schema protegido).
-- Só deve ser chamada por super_admin/admin (validado dentro da função).

CREATE OR REPLACE FUNCTION public.get_users_with_roles()
RETURNS TABLE (
  id            UUID,
  email         TEXT,
  full_name     TEXT,
  created_at    TIMESTAMPTZ,
  last_sign_in  TIMESTAMPTZ,
  confirmed     BOOLEAN,
  roles         TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Só super_admin ou admin podem chamar esta função
  IF NOT (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', '') AS full_name,
    u.created_at,
    u.last_sign_in_at,
    (u.email_confirmed_at IS NOT NULL) AS confirmed,
    COALESCE(
      ARRAY(
        SELECT r.role::TEXT
        FROM public.user_roles r
        WHERE r.user_id = u.id
        ORDER BY r.role
      ),
      ARRAY[]::TEXT[]
    ) AS roles
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_roles() TO authenticated;

NOTIFY pgrst, 'reload schema';
