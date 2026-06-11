import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-import-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalize = (s: unknown): string | null => {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  return t.length ? t : null;
};

// In-memory caches per invocation
type Cache = Map<string, string>;

async function getOrCreateBrand(
  supabase: SupabaseClient,
  cache: Cache,
  name: string,
): Promise<string> {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const { data: existing, error: selErr } = await supabase
    .from("brands")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (selErr) throw new Error(`brands select: ${selErr.message}`);
  if (existing?.id) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("brands")
    .insert({ name })
    .select("id")
    .single();
  if (insErr) {
    // Race: another concurrent insert may have created it
    const { data: again } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (again?.id) {
      cache.set(key, again.id);
      return again.id;
    }
    throw new Error(`brands insert: ${insErr.message}`);
  }
  cache.set(key, inserted.id);
  return inserted.id;
}

async function getOrCreateCategory(
  supabase: SupabaseClient,
  cache: Cache,
  name: string,
  mundo: string | null,
): Promise<string> {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const { data: existing, error: selErr } = await supabase
    .from("categories")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (selErr) throw new Error(`categories select: ${selErr.message}`);
  if (existing?.id) {
    cache.set(key, existing.id);
    return existing.id;
  }

  // Compute next ordem
  const { data: maxRow } = await supabase
    .from("categories")
    .select("ordem")
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrdem = (maxRow?.ordem ?? 0) + 1;

  const { data: inserted, error: insErr } = await supabase
    .from("categories")
    .insert({ name, mundo, ordem: nextOrdem, visivel: true })
    .select("id")
    .single();
  if (insErr) {
    const { data: again } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", name)
      .maybeSingle();
    if (again?.id) {
      cache.set(key, again.id);
      return again.id;
    }
    throw new Error(`categories insert: ${insErr.message}`);
  }
  cache.set(key, inserted.id);
  return inserted.id;
}

async function getOrCreateFamily(
  supabase: SupabaseClient,
  cache: Cache,
  name: string,
  categoryName: string,
): Promise<string> {
  const key = `${categoryName.toLowerCase()}::${name.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const { data: existing, error: selErr } = await supabase
    .from("product_families")
    .select("id")
    .ilike("name", name)
    .ilike("category", categoryName)
    .maybeSingle();
  if (selErr) throw new Error(`product_families select: ${selErr.message}`);
  if (existing?.id) {
    cache.set(key, existing.id);
    return existing.id;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("product_families")
    .insert({ name, category: categoryName })
    .select("id")
    .single();
  if (insErr) {
    const { data: again } = await supabase
      .from("product_families")
      .select("id")
      .ilike("name", name)
      .ilike("category", categoryName)
      .maybeSingle();
    if (again?.id) {
      cache.set(key, again.id);
      return again.id;
    }
    throw new Error(`product_families insert: ${insErr.message}`);
  }
  cache.set(key, inserted.id);
  return inserted.id;
}

async function resolveProductReferences(
  supabase: SupabaseClient,
  produtos: any[],
  fornecedor: string,
): Promise<any[]> {
  const brandCache: Cache = new Map();
  const categoryCache: Cache = new Map();
  const familyCache: Cache = new Map();

  const resolved: any[] = [];
  for (const raw of produtos) {
    const p: any = { ...raw, fornecedor: raw.fornecedor ?? fornecedor };

    const brandName = normalize(p.brand);
    const categoryName = normalize(p.category);
    const familyName = normalize(p.family);
    const mundo = normalize(p.mundo);

    if (brandName) {
      p.brand_id = await getOrCreateBrand(supabase, brandCache, brandName);
      p.brand = brandName;
    }
    if (categoryName) {
      await getOrCreateCategory(supabase, categoryCache, categoryName, mundo);
      p.category = categoryName;
    }
    if (familyName && categoryName) {
      p.family_id = await getOrCreateFamily(supabase, familyCache, familyName, categoryName);
      p.family = familyName;
    }

    resolved.push(p);
  }
  return resolved;
}

// ============ Actions ============

async function handleUpsertProducts(supabase: SupabaseClient, produtos: any[], fornecedor: string) {
  if (produtos.length === 0) return jsonResponse({ success: true, count: 0 });

  const rows = await resolveProductReferences(supabase, produtos, fornecedor);

  const batchSize = 100;
  let count = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error, data } = await supabase
      .from("products")
      .upsert(batch, { onConflict: "sku" })
      .select("id");
    if (error) {
      console.error("Upsert error:", error);
      return jsonResponse({ error: error.message, processed: count }, 500);
    }
    count += data?.length ?? batch.length;
  }
  return jsonResponse({ success: true, count });
}

async function handlePriceHistory(supabase: SupabaseClient, alteracoes: any[], fornecedor?: string) {
  if (!Array.isArray(alteracoes) || alteracoes.length === 0) {
    return jsonResponse({ success: true, count: 0 });
  }
  const rows = alteracoes.map((a) => ({
    sku: String(a.sku ?? ""),
    fornecedor: a.fornecedor ?? fornecedor ?? null,
    price_old: a.price_old ?? a.preco_antigo ?? null,
    price_new: a.price_new ?? a.preco_novo ?? null,
    purchase_price_old: a.purchase_price_old ?? a.compra_antigo ?? null,
    purchase_price_new: a.purchase_price_new ?? a.compra_novo ?? null,
    raw: a,
  })).filter((r) => r.sku.length > 0);

  const { error, data } = await supabase
    .from("price_history")
    .insert(rows)
    .select("id");
  if (error) {
    console.error("price_history insert error:", error);
    return jsonResponse({ error: error.message }, 500);
  }
  return jsonResponse({ success: true, count: data?.length ?? 0 });
}

async function handleGetPrices(supabase: SupabaseClient, fornecedor: string) {
  if (!fornecedor) return jsonResponse({ error: "fornecedor required" }, 400);
  const pageSize = 1000;
  const prices: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("sku, price, purchase_price")
      .eq("fornecedor", fornecedor)
      .not("sku", "is", null)
      .range(from, from + pageSize - 1);
    if (error) {
      console.error("get_prices error:", error);
      return jsonResponse({ error: error.message }, 500);
    }
    if (!data || data.length === 0) break;
    for (const r of data) {
      prices.push({ sku: r.sku, price: r.price, purchase_price: r.purchase_price });
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return jsonResponse({ prices });
}

async function handleMarcarInactivos(
  supabase: SupabaseClient,
  fornecedor: string,
  skusActivos: string[],
) {
  if (!fornecedor) return jsonResponse({ error: "fornecedor required" }, 400);
  if (!Array.isArray(skusActivos)) {
    return jsonResponse({ error: "skus_activos must be an array" }, 400);
  }

  // Fetch all SKUs for this supplier
  const allSkus: string[] = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("sku")
      .eq("fornecedor", fornecedor)
      .not("sku", "is", null)
      .range(from, from + pageSize - 1);
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data || data.length === 0) break;
    for (const r of data) if (r.sku) allSkus.push(r.sku);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const activeSet = new Set(skusActivos.map((s) => String(s)));
  const toDeactivate = allSkus.filter((s) => !activeSet.has(s));

  if (toDeactivate.length === 0) {
    return jsonResponse({ success: true, deactivated: 0 });
  }

  // Update in chunks to avoid huge IN clauses
  const chunkSize = 200;
  let deactivated = 0;
  for (let i = 0; i < toDeactivate.length; i += chunkSize) {
    const chunk = toDeactivate.slice(i, i + chunkSize);
    const { error, count } = await supabase
      .from("products")
      .update({ include_in_catalog: false }, { count: "exact" })
      .eq("fornecedor", fornecedor)
      .in("sku", chunk);
    if (error) {
      console.error("marcar_inactivos error:", error);
      return jsonResponse({ error: error.message, deactivated }, 500);
    }
    deactivated += count ?? chunk.length;
  }
  return jsonResponse({ success: true, deactivated });
}

// ============ Entry ============

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const importKey = req.headers.get("x-import-key");
    const expectedKey = Deno.env.get("IMPORT_API_KEY");
    if (!expectedKey || importKey !== expectedKey) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const action = body.action as string | undefined;

    if (action === "price_history") {
      return await handlePriceHistory(supabase, body.alteracoes, body.fornecedor);
    }

    if (action === "get_prices") {
      return await handleGetPrices(supabase, body.fornecedor);
    }

    if (action === "marcar_inactivos") {
      return await handleMarcarInactivos(supabase, body.fornecedor, body.skus_activos);
    }

    // Default action: upsert products
    if (!Array.isArray(body.produtos) || typeof body.fornecedor !== "string") {
      return jsonResponse(
        { error: "Invalid body. Expected { produtos: [], fornecedor: string } or { action: ... }" },
        400,
      );
    }
    return await handleUpsertProducts(supabase, body.produtos, body.fornecedor);
  } catch (e: any) {
    console.error("import-products error:", e);
    return jsonResponse({ error: String(e?.message ?? e) }, 500);
  }
});
