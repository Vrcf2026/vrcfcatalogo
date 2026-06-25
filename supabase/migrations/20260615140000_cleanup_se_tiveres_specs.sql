-- Limpeza de dados: especificações com valor "Se tiveres" (ou que
-- começam por "Se tiveres") são resíduos de um defeito no processo de
-- importação/tradução (provavelmente UNI-TREND/Visiotech) — ficou gravado
-- um excerto de prompt/template em vez do valor real da especificação
-- (ex: "apagado_automatico": "Se tiveres" em vez de "Sim"/valor real).
--
-- "Se tiveres" não é informação útil para o cliente — remove-se a chave
-- por completo, em vez de mostrar um valor sem sentido na página de
-- produto. Produtos sem mais nenhuma spec afectada simplesmente perdem
-- esse campo (o que já é tratado pela UI — campos ausentes não aparecem).

-- Pré-visualização (apenas para registo/auditoria — não altera nada):
-- SELECT id, name,
--   (SELECT jsonb_object_agg(key, value) FROM jsonb_each(especificacoes)
--    WHERE value::text ILIKE '"Se tiveres%') AS specs_removidas
-- FROM products
-- WHERE especificacoes::text ILIKE '%Se tiveres%';

UPDATE public.products
SET especificacoes = (
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  FROM jsonb_each(especificacoes)
  WHERE value::text NOT ILIKE '"Se tiveres%'
)
WHERE especificacoes::text ILIKE '%Se tiveres%';

NOTIFY pgrst, 'reload schema';
