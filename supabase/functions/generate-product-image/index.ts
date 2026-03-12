import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function generateSingleImage(productName: string, variation: number, apiKey: string): Promise<string | null> {
  const prompts = [
    `Generate a clean, professional product photo of: ${productName}. The product should be centered on a clean white background, studio lighting, high quality product photography style, front view. No text or watermarks.`,
    `Generate a professional product photo of: ${productName}. Show the product at a 3/4 angle on a clean white background, studio lighting, high quality product photography. No text or watermarks.`,
    `Generate a professional product photo of: ${productName}. Show a close-up detail shot highlighting key features, on a clean white background, studio lighting, high quality product photography. No text or watermarks.`,
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content: prompts[variation] || prompts[0] }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Image ${variation} error:`, response.status, errorText);
    if (response.status === 429 || response.status === 402) throw new Error(`${response.status}`);
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, productId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Generating 3 images for product: ${productName}`);

    // Delete existing images for this product if regenerating
    if (productId) {
      await supabase.from("product_images").delete().eq("product_id", productId);
    }

    const imageUrls: string[] = [];

    // Generate 3 images sequentially to avoid rate limits
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`Generating image ${i + 1}/3...`);
        const imageBase64 = await generateSingleImage(productName, i, LOVABLE_API_KEY);
        
        if (!imageBase64) continue;

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const fileName = `${productId || crypto.randomUUID()}_${i}.png`;
        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error(`Upload error for image ${i}:`, uploadError.message);
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        imageUrls.push(publicUrlData.publicUrl);

        // Save to product_images table
        if (productId) {
          await supabase.from("product_images").insert({
            product_id: productId,
            image_url: publicUrlData.publicUrl,
            position: i,
          });
        }
      } catch (e: any) {
        if (e.message === "429") {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later.", imageUrls }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (e.message === "402") {
          return new Response(JSON.stringify({ error: "AI credits exhausted.", imageUrls }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error(`Error generating image ${i}:`, e);
      }
    }

    // Update product main image_url with the first image
    if (productId && imageUrls.length > 0) {
      await supabase.from("products").update({ image_url: imageUrls[0] }).eq("id", productId);
    }

    return new Response(
      JSON.stringify({ imageUrls, imageUrl: imageUrls[0] || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
