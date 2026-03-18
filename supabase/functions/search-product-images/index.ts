import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, count = 6 } = await req.json();
    if (!query?.trim()) throw new Error("Query is required");

    const searchQuery = `${query.trim()} product png`;
    console.log("Searching images for:", searchQuery);

    // Use DuckDuckGo image search (no API key required)
    // Step 1: Get vqd token
    const tokenResp = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    const tokenHtml = await tokenResp.text();
    
    // Extract vqd token
    const vqdMatch = tokenHtml.match(/vqd=["']([^"']+)["']/);
    const vqd4Match = tokenHtml.match(/vqd=([\d-]+)/);
    const vqd = vqdMatch?.[1] || vqd4Match?.[1];

    const imageUrls: string[] = [];

    if (vqd) {
      // Step 2: Fetch image results
      const imgResp = await fetch(
        `https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=pt-pt&vqd=${vqd}`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://duckduckgo.com/",
          },
        }
      );

      if (imgResp.ok) {
        const imgData = await imgResp.json();
        if (imgData.results) {
          for (const result of imgData.results) {
            if (imageUrls.length >= count) break;
            if (result.image && result.image.startsWith("http")) {
              imageUrls.push(result.image);
            }
          }
        }
      }
    }

    // Fallback: try Google Images scraping
    if (imageUrls.length < count) {
      console.log("DuckDuckGo returned few results, trying Google fallback...");
      try {
        const googleResp = await fetch(
          `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=isch&ijn=0`,
          {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "text/html",
            },
          }
        );
        const googleHtml = await googleResp.text();

        // Extract image URLs from Google's embedded data
        const regex = /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)",\s*\d+,\s*\d+\]/gi;
        let match;
        while ((match = regex.exec(googleHtml)) !== null && imageUrls.length < count) {
          const url = match[1];
          if (
            !url.includes("google.com") &&
            !url.includes("gstatic.com") &&
            !url.includes("googleapis.com") &&
            !imageUrls.includes(url)
          ) {
            imageUrls.push(url);
          }
        }

        // Fallback to thumbnails
        if (imageUrls.length < count) {
          const thumbRegex = /\["(https?:\/\/encrypted-tbn[^"]+)"/g;
          while ((match = thumbRegex.exec(googleHtml)) !== null && imageUrls.length < count) {
            const thumbUrl = match[1].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
            if (!imageUrls.includes(thumbUrl)) {
              imageUrls.push(thumbUrl);
            }
          }
        }
      } catch (googleErr) {
        console.error("Google fallback error:", googleErr);
      }
    }

    console.log(`Found ${imageUrls.length} images`);
    return new Response(JSON.stringify({ images: imageUrls }), {
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
