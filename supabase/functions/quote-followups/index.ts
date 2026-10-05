// Seguimento diário de orçamentos (chamado pelo pg_cron às 9h).
//  - Lembrete ao cliente, uma única vez, quando um orçamento enviado fica 5 dias sem resposta
//  - Resumo para a gestão com o que está parado: pedidos por tratar, enviados sem resposta,
//    aceites por pagar. Só envia se houver alguma coisa.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isServiceRoleCall, unauthorized } from "../_shared/auth-guard.ts";

const SITE_URL = "https://catalogo.vrcf.pt";
const REMIND_AFTER_DAYS = 5;   // lembrete ao cliente
const REMIND_UNTIL_DAYS = 30;  // depois disto o orçamento já expirou; não lembrar
const PENDING_DAYS = 2;        // pedido sem tratamento
const NO_ANSWER_DAYS = 7;      // enviado e sem resposta (já com lembrete)
const UNPAID_DAYS = 3;         // aceite e por pagar

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000).toISOString();
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);

async function sendEmail(payload: Record<string, unknown>) {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const res = await fetch(`${url}/functions/v1/send-transactional-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`email ${res.status}: ${await res.text().catch(() => "")}`);
}

// deno-lint-ignore no-explicit-any
async function gestorEmail(sb: any): Promise<string> {
  for (const role of ["gestor", "admin", "super_admin"]) {
    const { data: rows } = await sb.from("user_roles").select("user_id").eq("role", role);
    for (const r of rows ?? []) {
      const { data } = await sb.auth.admin.getUserById(r.user_id);
      if (data?.user?.email) return data.user.email;
    }
  }
  return "geral@vrcf.pt";
}

type Q = {
  id: string; quote_number: string; customer_name: string | null; customer_email: string | null;
  total: number | null; status: string; user_id: string | null;
  created_at: string; updated_at: string; sent_final_at: string | null; decided_at: string | null;
  reminder_sent_at: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!isServiceRoleCall(req)) return unauthorized(corsHeaders);

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const cols = "id,quote_number,customer_name,customer_email,total,status,user_id,created_at,updated_at,sent_final_at,decided_at,reminder_sent_at";

    // ── 1. Lembretes ao cliente ──────────────────────────────────────────
    const { data: sent, error: sErr } = await sb.from("quotes").select(cols)
      .eq("status", "sent").is("reminder_sent_at", null)
      .lt("updated_at", daysAgo(REMIND_AFTER_DAYS)).gt("updated_at", daysAgo(REMIND_UNTIL_DAYS))
      .limit(50);
    if (sErr) throw sErr;

    let reminded = 0;
    for (const q of (sent ?? []) as Q[]) {
      const since = q.sent_final_at ?? q.updated_at;
      if (daysSince(since) < REMIND_AFTER_DAYS || !q.customer_email) continue;
      try {
        await sendEmail({
          templateName: "quote-reminder-customer",
          recipientEmail: q.customer_email,
          idempotencyKey: `quote-reminder-${q.id}`,
          templateData: {
            customerName: q.customer_name ?? "",
            quoteNumber: q.quote_number,
            total: q.total,
            quoteUrl: q.user_id ? `${SITE_URL}/conta/orcamentos/${q.id}` : "",
          },
        });
        await sb.from("quotes").update({ reminder_sent_at: new Date().toISOString() }).eq("id", q.id);
        reminded++;
      } catch (e) {
        console.error("lembrete falhou", q.quote_number, e);
      }
    }

    // ── 2. Resumo para a gestão ──────────────────────────────────────────
    const [pendingR, noAnswerR, unpaidR] = await Promise.all([
      sb.from("quotes").select(cols).in("status", ["pending", "in_review"]).lt("created_at", daysAgo(PENDING_DAYS)).order("created_at").limit(30),
      sb.from("quotes").select(cols).eq("status", "sent").not("reminder_sent_at", "is", null).order("reminder_sent_at").limit(60),
      sb.from("quotes").select(cols).eq("status", "accepted").order("updated_at").limit(60),
    ]);

    const item = (q: Q, since: string) => ({
      quoteNumber: q.quote_number,
      customerName: q.customer_name ?? "",
      total: q.total,
      days: daysSince(since),
      url: `${SITE_URL}/gestao/orcamentos/${q.id}`,
    });

    const pending = ((pendingR.data ?? []) as Q[]).map((q) => item(q, q.created_at));
    const noAnswer = ((noAnswerR.data ?? []) as Q[])
      .map((q) => item(q, q.sent_final_at ?? q.updated_at))
      .filter((i) => i.days >= NO_ANSWER_DAYS && i.days <= REMIND_UNTIL_DAYS);
    const unpaid = ((unpaidR.data ?? []) as Q[])
      .map((q) => item(q, q.decided_at ?? q.updated_at))
      .filter((i) => i.days >= UNPAID_DAYS);

    let digest = false;
    if (pending.length || noAnswer.length || unpaid.length) {
      const today = new Date().toISOString().slice(0, 10);
      await sendEmail({
        templateName: "quote-followup-digest",
        recipientEmail: await gestorEmail(sb),
        idempotencyKey: `quote-digest-${today}`,
        templateData: { pending, noAnswer, unpaid },
      });
      digest = true;
    }

    return json({ reminded, digest, pending: pending.length, noAnswer: noAnswer.length, unpaid: unpaid.length });
  } catch (e) {
    console.error("[quote-followups]", e);
    return json({ error: (e as Error).message }, 500);
  }
});
