-- Specs "trancadas" — chaves de especificacoes que o utilizador confirmou/editou
-- manualmente e que as importações seguintes NÃO devem sobrescrever.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specs_locked text[] NOT NULL DEFAULT '{}';
