-- Permite seleccionar manualmente quais marcas aparecem:
--   - show_in_world_strip: na faixa "Marcas que trabalhamos" do respectivo
--     mundo (Segurança/Escritório/Economato);
--   - show_on_homepage: na faixa de marcas da página inicial.
--
-- Ambas começam a TRUE (pré-seleccionadas) — o utilizador depois desmarca
-- as que não pretende mostrar, em vez de ter de marcar uma a uma.
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS show_in_world_strip boolean NOT NULL DEFAULT true;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT true;

-- Caso a coluna antiga "show_in_strip" já tenha sido criada numa tentativa
-- anterior, migra o valor para as duas novas colunas e remove-a.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brands' AND column_name = 'show_in_strip'
  ) THEN
    UPDATE public.brands SET show_in_world_strip = show_in_strip, show_on_homepage = show_in_strip;
    ALTER TABLE public.brands DROP COLUMN show_in_strip;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
