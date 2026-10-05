// Pesquisa inteligente: converte linguagem natural em filtros estruturados,
// usando o vocabulário real do catálogo (categorias e marcas existentes).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { aiJson, aiErrorStatus } from "../_shared/ai.ts";
import { checkRateLimits, clientIp, tooManyRequests } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Filters = {
  terms: string;
  mundo: "seguranca" | "escritorio" | "economato" | null;
  category: string | null;
  brand: string | null;
  min_price: number | null;
  max_price: number | null;
  summary: string;
};

const MUNDOS = ["seguranca", "escritorio", "economato"] as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["terms", "mundo", "category", "brand", "min_price", "max_price", "summary"],
  properties: {
    terms: { type: "string", description: "1-3 palavras-chave curtas para pesquisa no nome/descrição (tipo de produto, specs). Sem marca se já vier em brand, sem preços, sem palavras vazias." },
    mundo: { type: ["string", "null"], enum: [...MUNDOS, null] },
    category: { type: ["string", "null"], description: "Uma categoria EXATAMENTE como aparece na lista do mundo escolhido, ou null." },
    brand: { type: ["string", "null"], description: "Uma marca EXATAMENTE como aparece na lista, só se o cliente a pediu. Senão null." },
    min_price: { type: ["number", "null"] },
    max_price: { type: ["number", "null"] },
    summary: { type: "string", description: "Frase curta em PT-PT a explicar o que se vai mostrar." },
  },
};

// ── Vocabulário do catálogo (cache por instância, 1h) ──────────────────────
type Vocab = Record<string, { categories: string[]; brands: string[] }>;
let vocabCache: { at: number; data: Vocab } | null = null;

async function loadVocab(): Promise<Vocab | null> {
  if (vocabCache && Date.now() - vocabCache.at < 3600_000) return vocabCache.data;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  const { data, error } = await createClient(url, key).rpc("get_catalog_vocabulary");
  if (error || !data) {
    console.error("vocabulário indisponível:", error?.message);
    return null;
  }
  const v: Vocab = {};
  const rows = (data as { mundo: string; kind: string; value: string; n: number }[])
    .sort((a, b) => Number(b.n) - Number(a.n));
  for (const r of rows) {
    v[r.mundo] ??= { categories: [], brands: [] };
    const list = r.kind === "category" ? v[r.mundo].categories : v[r.mundo].brands;
    // Limitar o tamanho do prompt: as mais frequentes primeiro
    if (list.length < (r.kind === "category" ? 120 : 80)) list.push(r.value);
  }
  vocabCache = { at: Date.now(), data: v };
  return v;
}

function vocabPrompt(v: Vocab | null) {
  if (!v) return "";
  return "\n\nVocabulário real do catálogo (usa estes valores tal e qual em category/brand):\n" +
    MUNDOS.filter((m) => v[m]).map((m) =>
      `## ${m}\nCategorias: ${v[m].categories.join(" | ")}\nMarcas: ${v[m].brands.join(" | ")}`
    ).join("\n");
}

const SYSTEM = `Interpretas pesquisas de clientes de uma loja portuguesa (VRCF) e devolves filtros.
Mundos: "seguranca" (alarmes, intrusão, CCTV, câmaras, videovigilância, controlo de acessos, incêndio),
"escritorio" (informática recondicionada e nova: portáteis, desktops, monitores, impressoras, redes, armazenamento, periféricos, componentes),
"economato" (papelaria, consumíveis de escritório, papel, tinteiros, toners, material de escrita).
Regras:
- terms: 1-3 palavras-chave como aparecem num catálogo (ex: "portátil", "câmara IP", "toner"); converte sinónimos ("computador para levar"→"portátil", "laptop"→"portátil"). Para usos ("para escola") escolhe o tipo de produto adequado.
- category: só se houver uma categoria da lista que corresponda claramente; na dúvida, null (é melhor mostrar a mais do que a menos).
- brand: só se o cliente nomear uma marca.
- Preços em euros: "até 500€"→max_price 500; "mais de 200"→min_price 200; "barato" sem valor→null.
- mundo null se ambíguo.`;

function pick(list: string[] | undefined, value: string | null): string | null {
  if (!value || !list) return null;
  const v = value.trim().toLowerCase();
  return list.find((x) => x.toLowerCase() === v) ?? null;
}

const cache = new Map<string, Filters>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query } = await req.json();
    const q = String(query ?? "").trim().slice(0, 200);
    if (q.length < 3) return json({ error: "Pesquisa demasiado curta" }, 400);

    const key = q.toLowerCase();
    if (cache.has(key)) return json(cache.get(key));

    // Cada chamada custa créditos de IA: limitar por IP e no total
    const ip = clientIp(req);
    const allowed = await checkRateLimits([
      { key: `smart-search:ip:${ip}:min`, max: 15, windowSeconds: 60 },
      { key: `smart-search:ip:${ip}:day`, max: 200, windowSeconds: 86400 },
      { key: `smart-search:global:day`, max: 3000, windowSeconds: 86400 },
    ]);
    if (!allowed) return tooManyRequests(corsHeaders);

    const vocab = await loadVocab();
    const r = await aiJson<Filters>({
      system: SYSTEM + vocabPrompt(vocab),
      user: q,
      schemaName: "search_filters",
      schema: SCHEMA,
    });
    if ("error" in r) return json({ error: "Pesquisa inteligente indisponível" }, aiErrorStatus(r.status));

    // Validar contra o vocabulário real: valores inventados são descartados
    const f = r.data;
    const mv = f.mundo ? vocab?.[f.mundo] : undefined;
    const allBrands = vocab ? Object.values(vocab).flatMap((x) => x.brands) : undefined;
    const result: Filters = {
      ...f,
      terms: String(f.terms ?? "").trim(),
      category: mv ? pick(mv.categories, f.category) : null,
      brand: pick(mv?.brands ?? allBrands, f.brand),
    };

    if (cache.size > 500) cache.clear();
    cache.set(key, result);
    return json(result);
  } catch (e) {
    console.error(e);
    return json({ error: "Erro na pesquisa inteligente" }, 500);
  }
});
