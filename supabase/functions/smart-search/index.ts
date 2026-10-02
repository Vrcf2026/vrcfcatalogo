// Pesquisa inteligente: converte linguagem natural em filtros estruturados.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const cache = new Map<string, unknown>();

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["terms", "mundo", "min_price", "max_price", "summary"],
  properties: {
    terms: { type: "string", description: "Palavras-chave curtas para pesquisa no catálogo (tipo de produto, marca, specs). Sem preços nem palavras vazias." },
    mundo: { type: ["string", "null"], enum: ["seguranca", "escritorio", "economato", null] },
    min_price: { type: ["number", "null"] },
    max_price: { type: ["number", "null"] },
    summary: { type: "string", description: "Frase curta em PT-PT a explicar o que se vai mostrar." },
  },
};

const SYSTEM = `Interpretas pesquisas de clientes de uma loja portuguesa (VRCF) e devolves filtros.
Mundos: "seguranca" (alarmes, intrusão, CCTV, câmaras, videovigilância, controlo de acessos, incêndio, Ajax, Hikvision, Dahua),
"escritorio" (informática: portáteis, desktops, monitores, impressoras, redes, armazenamento, periféricos, componentes),
"economato" (papelaria, consumíveis de escritório, papel, tinteiros, toners, material de escrita).
Regras: terms = 1-4 palavras-chave do produto em português como aparecem num catálogo (ex: "portátil", "câmara IP", "toner HP"); converte sinónimos (ex: "computador para levar"→"portátil"; "laptop"→"portátil").
Para usos (ex: "para escola") escolhe o tipo de produto adequado. Preços em euros: "até 500€"→max_price 500; "mais de 200"→min_price 200. Se não houver, null. mundo null se ambíguo.`;

async function interpret(query: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      input: [
        { role: "system", content: SYSTEM },
        { role: "user", content: query },
      ],
      text: { format: { type: "json_schema", name: "search_filters", strict: true, schema: SCHEMA } },
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    console.error("AI gateway error", res.status, t);
    return { error: true, status: res.status };
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
        if (ev.type === "response.failed" || ev.type === "error") console.error("AI stream error", data);
      } catch { /* ignore */ }
    }
  }
  if (!out) return { error: true, status: 502 };
  return { data: JSON.parse(out) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { query } = await req.json();
    const q = String(query ?? "").trim().slice(0, 200);
    if (q.length < 3) return json({ error: "Pesquisa demasiado curta" }, 400);

    const key = q.toLowerCase();
    if (cache.has(key)) return json(cache.get(key));

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "IA não configurada" }, 500);

    const r = await interpret(q, apiKey);
    if ("error" in r) return json({ error: "Pesquisa inteligente indisponível" }, r.status === 402 || r.status === 429 || r.status === 403 ? r.status : 502);

    if (cache.size > 500) cache.clear();
    cache.set(key, r.data);
    return json(r.data);
  } catch (e) {
    console.error(e);
    return json({ error: "Erro na pesquisa inteligente" }, 500);
  }
});
