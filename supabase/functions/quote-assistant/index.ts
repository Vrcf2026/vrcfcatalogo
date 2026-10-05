// Assistente de orçamento (só gestão): transforma o pedido de um cliente em texto livre
// numa proposta de linhas com produtos reais do catálogo.
//   1. IA extrai as necessidades (incluindo acessórios que um instalador não esquece)
//   2. Pesquisa cada necessidade no catálogo
//   3. IA escolhe o melhor candidato de cada linha
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authenticateCaller, forbidden, unauthorized } from "../_shared/auth-guard.ts";
import { aiJson, aiErrorStatus } from "../_shared/ai.ts";
import { checkRateLimits, tooManyRequests } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MAX_LINES = 15;
const CANDIDATES = 6;
const PRODUCT_COLS = "id,name,sku,price,taxa_iva,image_url,stock_status,fornecedor,brand,category,purchase_price";

// ── 1. Plano ────────────────────────────────────────────────────────────────
type PlanLine = {
  necessidade: string;
  pesquisa: string;
  mundo: "seguranca" | "escritorio" | "economato" | null;
  quantidade: number;
  tipo: "principal" | "acessorio" | "servico";
  nota: string;
};
type Plan = { resumo: string; perguntas: string[]; linhas: PlanLine[] };

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["resumo", "perguntas", "linhas"],
  properties: {
    resumo: { type: "string", description: "1-2 frases PT-PT: o que o cliente precisa." },
    perguntas: { type: "array", items: { type: "string" }, description: "Informação em falta que o técnico deve confirmar com o cliente (máx. 5). Vazio se nada falta." },
    linhas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["necessidade", "pesquisa", "mundo", "quantidade", "tipo", "nota"],
        properties: {
          necessidade: { type: "string", description: "Descrição curta da linha, ex: 'Câmara bullet exterior 4MP'." },
          pesquisa: { type: "string", description: "1-3 palavras-chave para pesquisar no catálogo (ex: 'câmara bullet 4MP', 'NVR 8 canais', 'disco videovigilância'). Vazio para serviços." },
          mundo: { type: ["string", "null"], enum: ["seguranca", "escritorio", "economato", null] },
          quantidade: { type: "integer" },
          tipo: { type: "string", enum: ["principal", "acessorio", "servico"] },
          nota: { type: "string", description: "Porquê desta linha/quantidade, curto. Vazio se óbvio." },
        },
      },
    },
  },
};

const PLAN_SYSTEM = `És o assistente técnico-comercial da VRCF – Informática & Segurança (Montijo), instaladora certificada de sistemas de segurança (registo prévio PSP) e fornecedora de informática e material de escritório.
Recebes o pedido de um cliente (email, mensagem, notas de visita) e devolves as linhas de um orçamento.
Catálogo: "seguranca" (CCTV, câmaras IP/analógicas, NVR/DVR, discos, alarmes, deteção, controlo de acessos, videoporteiros, incêndio, redes PoE), "escritorio" (informática nova e recondicionada, redes, periféricos), "economato" (papelaria, consumíveis, toners).
Regras:
- Pensa como instalador experiente: inclui os acessórios necessários para o sistema funcionar (ex: câmaras IP → NVR com canais suficientes e PoE ou switch PoE, disco de videovigilância dimensionado; alarme → central, teclado, detetores, sirene, comunicador; rede → switch, cabo, conectores). Marca-os como "acessorio".
- Não inventes marcas nem modelos que o cliente não pediu; a pesquisa deve ser genérica.
- Mão de obra, configuração, deslocação: linhas "servico" com pesquisa vazia e mundo null.
- Quantidades inteiras ≥ 1. Cabo: pensa em caixas/bobines e explica na nota.
- Se faltar informação essencial (nº de câmaras, área, interior/exterior, dias de gravação), assume o razoável, explica na nota e acrescenta a pergunta em "perguntas".
- Máximo ${MAX_LINES} linhas.`;

// ── 2. Pesquisa ─────────────────────────────────────────────────────────────
type Product = Record<string, unknown> & { id: string; name: string; price: number | null };

async function searchCatalog(sb: SupabaseClient, terms: string, mundo: string | null): Promise<Product[]> {
  if (!terms.trim()) return [];
  const base = { p_query: terms, p_mundo: mundo, p_limit: CANDIDATES, p_offset: 0, p_order_by: "featured" };
  // Todos os termos primeiro; se não houver nada, qualquer termo (ordenado por relevância)
  for (const matchAny of [false, true]) {
    let { data, error } = await sb.rpc("search_products", { ...base, p_match_any: matchAny });
    if (error?.code === "PGRST202") {
      if (matchAny) break; // migração por aplicar: não há modo "qualquer termo"
      ({ data, error } = await sb.rpc("search_products", base));
    }
    if (error) {
      console.error("search_products", error.message);
      return [];
    }
    const rows = (data ?? []).map((r: { row_data: Product }) => r.row_data);
    if (rows.length) return rows;
  }
  // Último recurso: sem filtro de mundo
  if (mundo) return searchCatalog(sb, terms, null);
  return [];
}

// ── 3. Escolha ──────────────────────────────────────────────────────────────
type Pick = { escolhas: { linha: number; candidato: number | null; motivo: string }[] };

const PICK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["escolhas"],
  properties: {
    escolhas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["linha", "candidato", "motivo"],
        properties: {
          linha: { type: "integer" },
          candidato: { type: ["integer", "null"], description: "Índice do candidato escolhido, ou null se nenhum serve." },
          motivo: { type: "string", description: "Justificação muito curta (PT-PT)." },
        },
      },
    },
  },
};

const PICK_SYSTEM = `Escolhes, para cada linha de um orçamento, o produto do catálogo que melhor cumpre a necessidade.
Critérios por ordem: cumpre a função e as especificações pedidas; compatível com as restantes linhas (ex: nº de canais do NVR ≥ nº de câmaras, PoE); em stock em vez de "por encomenda"; melhor relação qualidade/preço.
Se nenhum candidato serve (produto errado), devolve candidato null — é melhor deixar a linha para o técnico do que propor algo errado.`;

// ── Handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const caller = await authenticateCaller(req);
    if (!caller) return unauthorized(corsHeaders);
    if (!caller.isStaff) return forbidden(corsHeaders);

    const allowed = await checkRateLimits([
      { key: `quote-assistant:user:${caller.userId}`, max: 40, windowSeconds: 3600 },
    ]);
    if (!allowed) return tooManyRequests(corsHeaders);

    const { text } = await req.json();
    const pedido = String(text ?? "").trim().slice(0, 6000);
    if (pedido.length < 10) return json({ error: "Descreva o pedido do cliente." }, 400);

    // 1. Plano
    const plan = await aiJson<Plan>({
      system: PLAN_SYSTEM,
      user: pedido,
      schemaName: "quote_plan",
      schema: PLAN_SCHEMA,
      effort: "medium",
    });
    if ("error" in plan) return json({ error: "Assistente indisponível" }, aiErrorStatus(plan.status));
    const linhas = plan.data.linhas.slice(0, MAX_LINES).map((l) => ({ ...l, quantidade: Math.max(1, Math.round(l.quantidade || 1)) }));

    // 2. Candidatos
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const candidates = await Promise.all(
      linhas.map((l) => (l.tipo === "servico" ? Promise.resolve([]) : searchCatalog(sb, l.pesquisa, l.mundo))),
    );

    // 3. Escolha (só se houver candidatos)
    const picks = new Map<number, { candidato: number | null; motivo: string }>();
    if (candidates.some((c) => c.length)) {
      const input = linhas.map((l, i) => ({
        linha: i,
        necessidade: l.necessidade,
        quantidade: l.quantidade,
        nota: l.nota,
        candidatos: candidates[i].map((p, j) => ({
          i: j,
          nome: p.name,
          marca: p.brand ?? null,
          preco_sem_iva: p.price,
          stock: p.stock_status ?? null,
        })),
      })).filter((x) => x.candidatos.length);

      const pick = await aiJson<Pick>({
        system: PICK_SYSTEM,
        user: `Pedido do cliente:\n${pedido}\n\nLinhas e candidatos:\n${JSON.stringify(input)}`,
        schemaName: "quote_pick",
        schema: PICK_SCHEMA,
      });
      if ("data" in pick) {
        for (const e of pick.data.escolhas) picks.set(e.linha, { candidato: e.candidato, motivo: e.motivo });
      } else {
        // Sem escolha da IA: o primeiro candidato (mais relevante) fica como sugestão
        candidates.forEach((c, i) => c.length && picks.set(i, { candidato: 0, motivo: "" }));
      }
    }

    // 4. Dados internos (custo) para os produtos devolvidos — só a gestão chega aqui
    const ids = [...new Set(candidates.flat().map((p) => p.id))];
    const full = new Map<string, Product>();
    if (ids.length) {
      const { data } = await sb.from("products").select(PRODUCT_COLS).in("id", ids);
      for (const p of (data ?? []) as Product[]) full.set(p.id, p);
    }

    const result = linhas.map((l, i) => {
      const cands = candidates[i].map((p) => full.get(p.id) ?? p);
      const pk = picks.get(i);
      const idx = pk?.candidato;
      const chosen = idx != null && idx >= 0 && idx < cands.length ? cands[idx] : null;
      return {
        necessidade: l.necessidade,
        quantidade: l.quantidade,
        tipo: l.tipo,
        nota: l.nota,
        motivo: pk?.motivo ?? "",
        escolhido: chosen,
        alternativas: cands,
      };
    });

    return json({ resumo: plan.data.resumo, perguntas: plan.data.perguntas.slice(0, 5), linhas: result });
  } catch (e) {
    console.error(e);
    return json({ error: "Erro no assistente de orçamento" }, 500);
  }
});
