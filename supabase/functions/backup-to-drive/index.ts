// Backup diário para Google Drive.
// Exporta tabelas críticas em JSON, empacota num único ficheiro por dia,
// e envia para a pasta "VRCF-Backups" no Drive da conta ligada (vrcf.loja@gmail.com).
// Retenção: mantém últimos 30 diários + 1º de cada mês (12 meses).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const FOLDER_NAME = "VRCF-Backups";

// Tabelas a incluir no backup (dados aplicacionais críticos).
const TABLES = [
  "products", "product_families", "product_types", "categories", "brands", "brand_families",
  "product_images", "banners", "homepage_highlights", "catalog_customizations",
  "quotes", "quote_items", "quote_requests",
  "customer_profiles", "shipping_addresses", "shipping_config",
  "rma_requests", "stock_alerts", "contact_leads",
  "user_roles", "price_history", "import_exclusions",
];

async function driveFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("GOOGLE_DRIVE_API_KEY")!,
      ...(init.headers || {}),
    },
  });
  return res;
}

async function ensureFolder(): Promise<string> {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const list = await driveFetch(`/drive/v3/files?q=${q}&fields=files(id,name)`);
  const listData = await list.json();
  if (listData.files?.length) return listData.files[0].id;

  const create = await driveFetch(`/drive/v3/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const createData = await create.json();
  if (!create.ok) throw new Error(`Falha a criar pasta: ${JSON.stringify(createData)}`);
  return createData.id;
}

async function uploadJson(folderId: string, filename: string, content: string) {
  const boundary = "----lovable_boundary_" + crypto.randomUUID();
  const metadata = { name: filename, parents: [folderId], mimeType: "application/json" };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;

  const res = await fetch(`${GATEWAY}/upload/drive/v3/files?uploadType=multipart`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "X-Connection-Api-Key": Deno.env.get("GOOGLE_DRIVE_API_KEY")!,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Falha upload ${filename}: ${await res.text()}`);
  return res.json();
}

async function listBackups(folderId: string) {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await driveFetch(`/drive/v3/files?q=${q}&fields=files(id,name,createdTime)&pageSize=1000&orderBy=createdTime desc`);
  const data = await res.json();
  return (data.files || []) as { id: string; name: string; createdTime: string }[];
}

async function deleteFile(id: string) {
  await driveFetch(`/drive/v3/files/${id}`, { method: "DELETE" });
}

// Retenção: mantém últimos 30 dias + 1º dia de cada mês (últimos 12 meses).
function filesToDelete(files: { id: string; name: string; createdTime: string }[]) {
  const now = Date.now();
  const DAY = 86400000;
  const kept = new Set<string>();
  const monthly = new Map<string, string>(); // "YYYY-MM" -> id (o mais antigo do mês, ≈ dia 1)

  for (const f of files) {
    const created = new Date(f.createdTime).getTime();
    const ageDays = (now - created) / DAY;
    if (ageDays <= 30) kept.add(f.id);
    else if (ageDays <= 366) {
      const key = f.createdTime.slice(0, 7);
      const existing = monthly.get(key);
      if (!existing || f.createdTime < files.find(x => x.id === existing)!.createdTime) {
        monthly.set(key, f.id);
      }
    }
  }
  for (const id of monthly.values()) kept.add(id);
  return files.filter(f => !kept.has(f.id));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const date = new Date().toISOString().split("T")[0];
    const payload: Record<string, unknown> = {
      version: 1,
      generated_at: new Date().toISOString(),
      tables: {},
    };

    const stats: Record<string, number> = {};
    for (const table of TABLES) {
      // Paginação para tabelas grandes (products pode ter >27k linhas).
      const rows: unknown[] = [];
      let from = 0;
      const size = 1000;
      while (true) {
        const { data, error } = await supabase.from(table).select("*").range(from, from + size - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < size) break;
        from += size;
      }
      (payload.tables as Record<string, unknown>)[table] = rows;
      stats[table] = rows.length;
    }

    const folderId = await ensureFolder();
    const filename = `vrcf-backup-${date}.json`;
    const content = JSON.stringify(payload);
    const uploaded = await uploadJson(folderId, filename, content);

    // Retenção
    const files = await listBackups(folderId);
    const toDelete = filesToDelete(files);
    for (const f of toDelete) await deleteFile(f.id);

    return new Response(JSON.stringify({
      ok: true,
      file: uploaded.name,
      file_id: uploaded.id,
      size_bytes: content.length,
      rows: stats,
      deleted_old: toDelete.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("backup-to-drive failed:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
