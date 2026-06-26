import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://catalogo.vrcf.pt";
const FUNCTION_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sitemap`;
const PAGE_SIZE = 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_PATHS = [
  { path: "/",                        priority: "1.0", changefreq: "daily"   },
  { path: "/seguranca",               priority: "0.9", changefreq: "daily"   },
  { path: "/escritorio",              priority: "0.9", changefreq: "daily"   },
  { path: "/economato",               priority: "0.9", changefreq: "daily"   },
  { path: "/pesquisa",                priority: "0.5", changefreq: "weekly"  },
  { path: "/termos-e-condicoes",      priority: "0.3", changefreq: "monthly" },
  { path: "/politica-de-cookies",     priority: "0.3", changefreq: "monthly" },
  { path: "/politica-de-privacidade", priority: "0.3", changefreq: "monthly" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const pageParam = url.searchParams.get("page");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const today = new Date().toISOString().split("T")[0];

  const xmlResponse = (xml: string) =>
    new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });

  if (pageParam === "static") {
    const urls = STATIC_PATHS.map(
      (p) => `
  <url>
    <loc>${BASE_URL}${p.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p.priority}</priority>
  </url>`,
    ).join("");
    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
  }

  if (!pageParam) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .not("slug", "is", null);

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

    const staticEntry = `
  <sitemap>
    <loc>${FUNCTION_URL}?page=static</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`;

    const productSitemaps = Array.from({ length: totalPages }, (_, i) => `
  <sitemap>
    <loc>${FUNCTION_URL}?page=${i + 1}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join("");

    return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntry}${productSitemaps}
</sitemapindex>`);
  }

  const page = Math.max(0, parseInt(pageParam) - 1);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .not("slug", "is", null)
    .order("created_at", { ascending: true })
    .range(from, to);

  const urls = (products || []).map((p: { slug: string; updated_at: string | null }) => `
  <url>
    <loc>${BASE_URL}/produto/${p.slug}</loc>
    <lastmod>${p.updated_at ? p.updated_at.split("T")[0] : today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join("");

  return xmlResponse(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`);
});
