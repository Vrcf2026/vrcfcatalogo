// Chamada ao AI gateway do Lovable com output JSON estruturado (json_schema strict).

export const AI_MODEL = "openai/gpt-6-astra";

export type AiResult<T> = { data: T } | { error: true; status: number };

export async function aiJson<T>(opts: {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  effort?: "low" | "medium" | "high";
}): Promise<AiResult<T>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return { error: true, status: 500 };

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      stream: true,
      store: false,
      reasoning: { effort: opts.effort ?? "low" },
      input: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      text: { format: { type: "json_schema", name: opts.schemaName, strict: true, schema: opts.schema } },
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    console.error("AI gateway error", res.status, t);
    return { error: true, status: res.status };
  }

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const ev = JSON.parse(data);
        if (ev.type === "response.output_text.delta") out += ev.delta ?? "";
        if (ev.type === "response.failed" || ev.type === "error") console.error("AI stream error", data);
      } catch { /* linha parcial */ }
    }
  }
  if (!out) return { error: true, status: 502 };
  try {
    return { data: JSON.parse(out) as T };
  } catch {
    console.error("AI devolveu JSON inválido", out.slice(0, 500));
    return { error: true, status: 502 };
  }
}

/** Status HTTP a devolver ao cliente a partir de um erro do gateway. */
export function aiErrorStatus(status: number) {
  return status === 402 || status === 429 || status === 403 ? status : 502;
}
