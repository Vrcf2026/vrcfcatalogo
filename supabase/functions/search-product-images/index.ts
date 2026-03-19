import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getBlockedHosts() {
  const blocked = new Set<string>([
    "supabase.co",
    "lovable.app",
    "lovableproject.com",
  ]);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (supabaseUrl) {
    try {
      const host = new URL(supabaseUrl).hostname;
      blocked.add(host);
    } catch {
      // ignore invalid env format
    }
  }

  return blocked;
}

function isValidExternalImageUrl(rawUrl: string, blockedHosts: Set<string>) {
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return false;

    const host = url.hostname.toLowerCase();
    if ([...blockedHosts].some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
      return false;
    }

    const pathname = url.pathname.toLowerCase();
    const likelyImage =
      /\.(jpg|jpeg|png|webp|gif|bmp|avif|svg)$/i.test(pathname) ||
      url.search.toLowerCase().includes("format=") ||
      url.search.toLowerCase().includes("image");

    return likelyImage;
  } catch {
    return false;
  }
}

function addUniqueImage(urls: string[], candidate: string, max: number, blockedHosts: Set<string>) {
  if (urls.length >= max) return;
  if (!candidate) return;

  const normalized = candidate
    .replace(/\\u003d/g, "=")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .trim();

  if (!isValidExternalImageUrl(normalized, blockedHosts)) return;
  if (!urls.includes(normalized)) urls.push(normalized);
}

async function searchBing(query: string, count: number, blockedHosts: Set<string>): Promise<string[]> {
  const urls: string[] = [];

  try {
    const resp = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1&count=${Math.max(count * 3, 20)}&qft=+filterui:photo-photo`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
        },
      },
    );

    const html = await resp.text();

    // Pattern A: encoded quotes
    const encodedMurlRegex = /murl&quot;:&quot;(https?:\/\/[^"&]+[^"&]*)&quot;/gi;
    let match: RegExpExecArray | null;
    while ((match = encodedMurlRegex.exec(html)) !== null && urls.length < count) {
      addUniqueImage(urls, match[1], count, blockedHosts);
    }

    // Pattern B: JSON payload inside attribute m="..."
    if (urls.length < count) {
      const decoded = html.replace(/\\\//g, "/");
      const murlRegex = /"murl":"(https?:\/\/[^\"]+)"/gi;
      while ((match = murlRegex.exec(decoded)) !== null && urls.length < count) {
        addUniqueImage(urls, match[1], count, blockedHosts);
      }
    }

    // Fallback: thumbnails
    if (urls.length < count) {
      const thumbRegex = /"turl":"(https?:\/\/[^\"]+)"/gi;
      const decoded = html.replace(/\\\//g, "/");
      while ((match = thumbRegex.exec(decoded)) !== null && urls.length < count) {
        addUniqueImage(urls, match[1], count, blockedHosts);
      }
    }
  } catch (e) {
    console.error("Bing search error:", e);
  }

  return urls;
}

async function searchDuckDuckGo(query: string, count: number, blockedHosts: Set<string>): Promise<string[]> {
  const urls: string[] = [];

  try {
    const tokenResp = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      },
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
        },
      );

      if (imgResp.ok) {
        const data = await imgResp.json();
        if (Array.isArray(data.results)) {
          for (const result of data.results) {
            if (urls.length >= count) break;
            addUniqueImage(urls, result.image, count, blockedHosts);
          }
        }
      }
    }
  } catch (e) {
    console.error("DuckDuckGo search error:", e);
  }

  return urls;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, count = 6 } = await req.json();
    if (!query?.trim()) throw new Error("Query is required");

    const blockedHosts = getBlockedHosts();
    const requestedCount = Math.min(Math.max(Number(count) || 6, 1), 30);
    const searchQuery = `${query.trim()} product photo`;

    console.log("Searching images for:", searchQuery);

    const images: string[] = [];

    const bingResults = await searchBing(searchQuery, requestedCount, blockedHosts);
    for (const url of bingResults) {
      if (images.length >= requestedCount) break;
      if (!images.includes(url)) images.push(url);
    }
    console.log(`Bing found ${bingResults.length} images`);

    if (images.length < requestedCount) {
      const duckResults = await searchDuckDuckGo(searchQuery, requestedCount, blockedHosts);
      for (const url of duckResults) {
        if (images.length >= requestedCount) break;
        if (!images.includes(url)) images.push(url);
      }
      console.log(`DuckDuckGo found ${duckResults.length} images`);
    }

    console.log(`Total: ${images.length} images`);

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Search failed", images: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});