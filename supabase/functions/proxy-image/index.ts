import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing url", { status: 400, headers: corsHeaders });
    }

    const targetUrl = new URL(target);
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return new Response("Invalid protocol", { status: 400, headers: corsHeaders });
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableCatalogProxy/1.0)",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return new Response("Image fetch failed", { status: response.status, headers: corsHeaders });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const cacheControl = response.headers.get("cache-control") || "public, max-age=86400";
    const body = await response.arrayBuffer();

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    console.error("proxy-image error", error);
    return new Response("Proxy error", { status: 500, headers: corsHeaders });
  }
});