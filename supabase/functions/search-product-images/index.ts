import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function searchBing(query: string, count: number): Promise<string[]> {
  const urls: string[] = [];
  try {
    const resp = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=${count * 2}&qft=+filterui:photo-photo`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
        },
      }
    );
    const html = await resp.text();

    // Extract murl (media URL) from Bing's image results
    const murlRegex = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
    let match;
    while ((match = murlRegex.exec(html)) !== null && urls.length < count) {
      const url = match[1].replace(/&amp;/g, "&");
      if (!urls.includes(url) && !url.includes("bing.com") && !url.includes("microsoft.com")) {
        urls.push(url);
      }
    }

    // Fallback: try turl (thumbnail URL)
    if (urls.length === 0) {
      const turlRegex = /turl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
      while ((match = turlRegex.exec(html)) !== null && urls.length < count) {
        const url = match[1].replace(/&amp;/g, "&");
        if (!urls.includes(url)) {
          urls.push(url);
        }
      }
    }
  } catch (e) {
    console.error("Bing search error:", e);
  }
  return urls;
}

async function searchDuckDuckGo(query: string, count: number): Promise<string[]> {
  const urls: string[] = [];
  try {
    const tokenResp = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      }
    );
    const html = await tokenResp.text();
    const vqdMatch = html.match(/vqd=["']([^"']+)["']/) || html.match(/vqd=([\d-]+)/);
    const vqd = vqdMatch?.[1];

    if (vqd) {
      const imgResp = await fetch(
        `https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=pt-pt&vqd=${vqd}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Referer: "https://duckduckgo.com/",
          },
        }
      );
      if (imgResp.ok) {
        const data = await imgResp.json();
        if (Array.isArray(data.results)) {
          for (const r of data.results) {
            if (urls.length >= count) break;
            if (r.image?.startsWith("http") && !urls.includes(r.image)) {
              urls.push(r.image);
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("DuckDuckGo error:", e);
  }
  return urls;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, count = 6 } = await req.json();
    if (!query?.trim()) throw new Error("Query is required");

    const requestedCount = Math.min(Math.max(Number(count) || 6, 1), 30);
    const searchQuery = `${query.trim()} product`;

    console.log("Searching images for:", searchQuery);

    // Try Bing first (most reliable for scraping)
    let images = await searchBing(searchQuery, requestedCount);
    console.log(`Bing found ${images.length} images`);

    // Fallback to DuckDuckGo
    if (images.length < requestedCount) {
      const ddgResults = await searchDuckDuckGo(searchQuery, requestedCount - images.length);
      console.log(`DuckDuckGo found ${ddgResults.length} images`);
      for (const url of ddgResults) {
        if (!images.includes(url) && images.length < requestedCount) {
          images.push(url);
        }
      }
    }

    console.log(`Total: ${images.length} images`);
    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Search failed", images: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});