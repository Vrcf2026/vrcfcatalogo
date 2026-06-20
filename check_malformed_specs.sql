-- Diagnóstico: especificacoes guardado como STRING em vez de OBJETO.
-- A coluna é JSONB, por isso nunca pode ter sintaxe inválida — mas pode
-- conter um JSON-string em vez de um JSON-object (duplo-encoding).
-- É exatamente esse caso que parte o JSON.parse() no frontend.

-- 1. Contagem geral por tipo real guardado na coluna
SELECT
  jsonb_typeof(especificacoes) AS tipo,
  fornecedor,
  count(*) AS total
FROM products
WHERE especificacoes IS NOT NULL
GROUP BY jsonb_typeof(especificacoes), fornecedor
ORDER BY tipo, total DESC;

-- 2. Os produtos problemáticos em concreto — especificacoes é string, não objeto
SELECT id, sku, name, fornecedor, stock_status,
       especificacoes::text AS valor_bruto
FROM products
WHERE jsonb_typeof(especificacoes) = 'string'
ORDER BY fornecedor, sku
LIMIT 100;

-- 3. Confirmar especificamente o produto Diginova com stock_status = 'low'
-- que despoletou o erro original (ajusta o filtro se já souberes o SKU exato)
SELECT id, sku, name, stock_status, especificacoes::text AS valor_bruto
FROM products
WHERE fornecedor = 'diginova'
  AND stock_status = 'low'
  AND jsonb_typeof(especificacoes) = 'string';
