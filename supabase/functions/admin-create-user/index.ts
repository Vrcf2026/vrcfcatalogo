import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ─────────────────────────────────────────────────────────────────────────
// Cria utilizadores (admin/gestor/cliente) a partir do painel Admin.
//
// PORQUÊ ESTA FUNÇÃO EXISTE:
// O UsersManager.tsx usava antes `supabase.auth.signUp()` directamente no
// browser para criar contas. Isso é perigoso: signUp() do client SDK troca
// a sessão local pela do novo utilizador (consoante a config de confirmação
// de email), o que pode deslogar o super_admin da própria conta a meio de
// uma simples criação de utilizador.
//
// Esta função usa a service role key (nunca exposta ao browser) através do
// admin API do Supabase Auth, que cria a conta SEM tocar na sessão de quem
// está a chamar. A verificação de permissão é feita manualmente aqui,
// porque o service role bypassa RLS.
// ─────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const VALID_ROLES = ["super_admin", "admin", "gestor"] as const;
type AppRole = typeof VALID_ROLES[number];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Não autenticado" }, 401);
    }
    const callerJwt = authHeader.replace("Bearer ", "");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ── 1. Identificar quem está a chamar ──────────────────────────────
    const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(callerJwt);
    if (callerErr || !callerData?.user) {
      return jsonResponse({ error: "Token inválido" }, 401);
    }
    const callerId = callerData.user.id;

    // ── 2. Só super_admin pode criar utilizadores e atribuir roles ─────
    // (Mantém a mesma fronteira que já existe na RLS de user_roles.)
    const { data: isSuperAdmin, error: roleErr } = await supabaseAdmin.rpc("has_role", {
      _user_id: callerId,
      _role: "super_admin",
    });
    if (roleErr) {
      console.error("has_role error:", roleErr);
      return jsonResponse({ error: "Erro ao verificar permissões" }, 500);
    }
    if (!isSuperAdmin) {
      return jsonResponse({ error: "Apenas super_admin pode criar utilizadores." }, 403);
    }

    // ── 3. Validar input ─────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Corpo do pedido inválido" }, 400);
    }
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const fullName = String(body.fullName ?? "").trim();
    const role = body.role ? String(body.role) : null;

    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "Email inválido" }, 400);
    }
    if (password.length < 8) {
      return jsonResponse({ error: "Palavra-passe deve ter no mínimo 8 caracteres" }, 400);
    }
    if (role && !VALID_ROLES.includes(role as AppRole)) {
      return jsonResponse({ error: "Role inválido" }, 400);
    }

    // ── 4. Criar a conta via admin API (não mexe na sessão de ninguém) ─
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // conta criada por um super_admin já fica confirmada — sem fricção de email
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (createErr) {
      const msg = createErr.message?.includes("already been registered")
        ? "Já existe uma conta com este email."
        : createErr.message;
      return jsonResponse({ error: msg }, 400);
    }
    const newUserId = created.user?.id;
    if (!newUserId) {
      return jsonResponse({ error: "Utilizador não foi criado" }, 500);
    }

    // ── 5. Atribuir role, se pedido ─────────────────────────────────
    if (role) {
      const { error: insertRoleErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUserId, role });
      if (insertRoleErr && insertRoleErr.code !== "23505") {
        // Utilizador já foi criado mas o role falhou — devolve aviso, não erro total.
        return jsonResponse({
          warning: `Utilizador criado mas falhou atribuir role: ${insertRoleErr.message}`,
          userId: newUserId,
        }, 200);
      }
    }

    return jsonResponse({ userId: newUserId, email });
  } catch (e: any) {
    console.error("admin-create-user error:", e);
    return jsonResponse({ error: String(e?.message ?? e) }, 500);
  }
});
