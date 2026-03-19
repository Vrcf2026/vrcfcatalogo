import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, count = 6, provider = "all" } = await req.json();
    if (!query?.trim()) throw new Error("Query is required");

    const requestedCount = Math.min(Math.max(Number(count) || 6, 1), 30);
    const providerMode = String(provider).toLowerCase() === "google" ? "google" : "all";
    const searchQuery = `${query.trim()} product photo`;

    console.log("Searching images for:", searchQuery, "provider:", providerMode);

    const imageUrls: string[] = [];
    const addImage = (url: string | undefined | null) => {
      if (!url || !url.startsWith("http")) return;
      if (
        url.includes("google.com") ||
        url.includes("gstatic.com") ||
        url.includes("googleapis.com")
      ) {
        return;
      }
      if (!imageUrls.includes(url)) imageUrls.push(url);
    };

    // DuckDuckGo (default mode only)
    if (providerMode !== "google") {
      try {
        const tokenResp = await fetch(
          `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          },
        );

        const tokenHtml = await tokenResp.text();
        const vqdMatch = tokenHtml.match(/vqd=["']([^"']+)["']/);
        const vqd4Match = tokenHtml.match(/vqd=([\d-]+)/);
        const vqd = vqdMatch?.[1] || vqd4Match?.[1];

        if (vqd) {
          const imgResp = await fetch(
            `https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=pt-pt&vqd=${vqd}`,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Referer: "https://duckduckgo.com/",
              },
            },
          );

          if (imgResp.ok) {
            const imgData = await imgResp.json();
            if (Array.isArray(imgData.results)) {
              for (const result of imgData.results) {
                if (imageUrls.length >= requestedCount) break;
                addImage(result.image);
              }
            }
          }
        }
      } catch (duckErr) {
        console.error("DuckDuckGo search error:", duckErr);
      }
    }

    // Google search (forced in google mode, fallback in default mode)
    if (providerMode === "google" || imageUrls.length < requestedCount) {
      try {
        const googleResp = await fetch(
          `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch&ijn=0`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "text/html",
            },
          },
        );

        const googleHtml = await googleResp.text();

        const imageRegex = /\["(https?:\/\/[^"\\]+\.(?:jpg|jpeg|png|webp)[^"\\]*)",\s*\d+,\s*\d+\]/gi;
        let match: RegExpExecArray | null;

        while ((match = imageRegex.exec(googleHtml)) !== null && imageUrls.length < requestedCount) {
          const decoded = match[1].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
          addImage(decoded);
        }

        const thumbRegex = /\["(https?:\/\/encrypted-tbn[^"\\]+)"/g;
        while ((match = thumbRegex.exec(googleHtml)) !== null && imageUrls.length < requestedCount) {
          const thumbUrl = match[1].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
          addImage(thumbUrl);
        }
      } catch (googleErr) {
        console.error("Google search error:", googleErr);
      }
    }

    const images = imageUrls.slice(0, requestedCount);
    console.log(`Found ${images.length} images`);

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Search failed",
        images: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});