// Backup diário para Google Drive.
// Estrutura no Drive: VRCF-Backups/YYYY-MM-DD/<tabela>.json
// Retenção: últimos 30 dias diários + 1 pasta por mês nos últimos 12 meses.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const ROOT_NAME = "VRCF-Backups";

const TABLES = [
  "products", "product_families", "product_types", "categories", "brands", "brand_families",
  "product_images", "banners", "homepage_highlights", "catalog_customizations",
  "quotes", "quote_items", "quote_requests",
  "customer_profiles", "shipping_addresses", "shipping_config",
  "rma_requests", "stock_alerts", "contact_leads",
  "user_roles", "price_history", "import_exclusions",
];

const authHeaders = () => ({
  "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
  "X-Connection-Api-Key": Deno.env.get("GOOGLE_DRIVE_API_KEY")!,
});

async function drive(path: string, init: RequestInit = {}) {
  return fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init.headers || {}) },
  });
}

async function findFolder(name: string, parentId?: string): Promise<string | null> {
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentClause}`);
  const res = await drive(`/drive/v3/files?q=${q}&fields=files(id,name)`);
  const data = await res.json();
  return data.files?.[0]?.id ?? null;
}

async function createFolder(name: string, parentId?: string): Promise<string> {
  const meta: Record<string, unknown> = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) meta.parents = [parentId];
  const res = await drive(`/drive/v3/files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(meta),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Criar pasta ${name}: ${JSON.stringify(data)}`);
  return data.id;
}

async function ensureFolder(name: string, parentId?: string): Promise<string> {
  return (await findFolder(name, parentId)) || (await createFolder(name, parentId));
}

async function uploadJson(folderId: string, filename: string, content: string) {
  const boundary = "----lovable_" + crypto.randomUUID();
  const metadata = { name: filename, parents: [folderId] };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n--${boundary}--`;
  const res = await fetch(`${GATEWAY}/upload/drive/v3/files?uploadType=multipart`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!res.ok) throw new Error(`Upload ${filename}: ${await res.text()}`);
  return res.json();
}

async function listChildren(parentId: string) {
  const q = encodeURIComponent(`'${parentId}' in parents and trashed=false`);
  const res = await drive(`/drive/v3/files?q=${q}&fields=files(id,name,createdTime,mimeType)&pageSize=1000&orderBy=createdTime desc`);
  const data = await res.json();
  return (data.files || []) as { id: string; name: string; createdTime: string; mimeType: string }[];
}

async function trashFile(id: string) {
  await drive(`/drive/v3/files/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const date = new Date().toISOString().split("T")[0];
    const rootId = await ensureFolder(ROOT_NAME);
    const dayId = await ensureFolder(date, rootId);

    const stats: Record<string, number> = {};

    for (const table of TABLES) {
      // Stream por páginas, escrevendo o JSON como array sem manter tudo em memória.
      const parts: string[] = ["["];
      let from = 0;
      const size = 500;
      let total = 0;
      let first = true;
      while (true) {
        const { data, error } = await supabase.from(table).select("*").range(from, from + size - 1);
        if (error) throw new Error(`${table}: ${error.message}`);
        if (!data || data.length === 0) break;
        for (const row of data) {
          parts.push((first ? "" : ",") + JSON.stringify(row));
          first = false;
        }
        total += data.length;
        if (data.length < size) break;
        from += size;
      }
      parts.push("]");
      const content = parts.join("");
      await uploadJson(dayId, `${table}.json`, content);
      stats[table] = total;
    }

    // Manifest
    await uploadJson(dayId, "_manifest.json", JSON.stringify({
      version: 1, generated_at: new Date().toISOString(), rows: stats,
    }, null, 2));

    // Retenção: manter últimos 30 dias + 1 pasta/mês nos últimos 12.
    const folders = (await listChildren(rootId)).filter(f => f.mimeType === "application/vnd.google-apps.folder");
    const DAY = 86400000;
    const now = Date.now();
    const kept = new Set<string>();
    const monthly = new Map<string, string>();
    for (const f of folders) {
      const age = (now - new Date(f.createdTime).getTime()) / DAY;
      if (age <= 30) kept.add(f.id);
      else if (age <= 366) {
        const key = f.name.slice(0, 7); // YYYY-MM
        if (!monthly.has(key)) monthly.set(key, f.id);
      }
    }
    for (const id of monthly.values()) kept.add(id);
    const toDelete = folders.filter(f => !kept.has(f.id));
    for (const f of toDelete) await trashFile(f.id);

    return new Response(JSON.stringify({
      ok: true, date, folder_id: dayId, rows: stats, deleted_old_folders: toDelete.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("backup-to-drive failed:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
