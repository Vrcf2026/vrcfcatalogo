import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 1000;
const CONCURRENCY = 3;

export const PRODUCT_COLUMNS =
  "id,sku,name,slug,description,short_description,category,categoria_pai,family,family_id,type,type_id,brand,brand_id,price,price_tier2,price_tier3,purchase_price,purchase_price_vat,image_url,featured,include_in_catalog,show_on_homepage,mundo,fornecedor,stock_status,sob_encomenda,envio_especial,weight,ean,especificacoes,specs_locked,destaques,conteudo_embalagem,produtos_relacionados,upgrades,min_sale_qty,visivel,created_at,updated_at";

type FetchAllOptions = {
  table: string;
  select: string;
  orderBy?: string;
  ascending?: boolean;
  filter?: Record<string, string>;
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchAllRows = async <T,>({
  table,
  select,
  orderBy = "created_at",
  ascending = false,
  filter,
}: FetchAllOptions) => {
  const client = supabase as any;
  let countQuery = client.from(table).select("id", { count: "exact", head: true });
  if (filter) Object.entries(filter).forEach(([k, v]) => { countQuery = countQuery.eq(k, v); });
  const { count, error: countError } = await countQuery;
  if (countError) throw countError;
  const total = count ?? 0;
  if (total === 0) return [] as T[];

  const fetchChunk = async (from: number): Promise<T[]> => {
    const to = Math.min(from + PAGE_SIZE - 1, total - 1);
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      let query = client.from(table).select(select);
      if (filter) Object.entries(filter).forEach(([k, v]) => { query = query.eq(k, v); });
      if (orderBy) query = query.order(orderBy, { ascending });
      if (orderBy !== "id") query = query.order("id", { ascending: true });
      const { data, error } = await query.range(from, to);
      if (!error && data) return data as T[];
      lastError = error;
      await delay(400 * (attempt + 1));
    }
    throw lastError ?? new Error(`Falha ao carregar ${table}`);
  };

  const offsets = Array.from({ length: Math.ceil(total / PAGE_SIZE) }, (_, i) => i * PAGE_SIZE);
  const chunks: T[][] = new Array(offsets.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, offsets.length) }, async () => {
      while (next < offsets.length) {
        const current = next; next += 1;
        chunks[current] = await fetchChunk(offsets[current]);
      }
    })
  );
  return chunks.flat();
};

export const fetchAllProducts = (
  mundo?: string,
  orderBy: "created_at" | "name" = "created_at",
  ascending = false
) =>
  fetchAllRows<any>({
    table: "products",
    select: PRODUCT_COLUMNS,
    orderBy,
    ascending,
    filter: mundo ? { mundo } : undefined,
  });
