// Proxy para a API do Gemini.
// A chave (GEMINI_API_KEY) fica só no servidor; o app envia o corpo da requisição
// no formato REST do generateContent e recebe de volta apenas o texto gerado.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_MODELS = ["gemini-2.5-flash"];
// Extratos em PDF e fotos de recibo chegam em base64; acima disso recusamos.
const MAX_BODY_BYTES = 15 * 1024 * 1024;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Só usuários logados (a anon key sozinha não basta)
  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);

  let body: { model?: string; request?: Record<string, unknown> };
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const model = body.model ?? ALLOWED_MODELS[0];
  if (!ALLOWED_MODELS.includes(model) || !body.request) {
    return json({ error: "Invalid request" }, 400);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return json({ error: "Server not configured" }, 500);

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body.request),
    },
  );

  const result = await geminiRes.json();
  if (!geminiRes.ok) {
    console.error("[gemini] Erro da API:", geminiRes.status, result?.error?.message);
    return json({ error: "AI request failed" }, 502);
  }

  const text = (result?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");

  return json({ text });
});
