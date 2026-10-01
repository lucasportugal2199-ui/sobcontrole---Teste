// Roda a Edge Function gemini com Supabase e Google simulados para checar os limites.
const fnPath = new URL("../gemini/index.ts", import.meta.url).href;

Deno.env.set("SUPABASE_URL", "https://proj.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
Deno.env.set("GEMINI_API_KEY", "gemini-test");

let premiumRow: any = null;
let rpcError = false;
const usage = new Map<string, number>();
let geminiCalls = 0;

globalThis.fetch = async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input.url;
  const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (url.includes("/auth/v1/user")) return res({ id: "user-1", aud: "authenticated" });
  if (url.includes("/rest/v1/premium_status")) return res(premiumRow ? [premiumRow] : []);
  if (url.includes("/rest/v1/rpc/consume_ai_quota")) {
    if (rpcError) return res({ message: "function does not exist" }, 404);
    const { p_feature, p_limit } = JSON.parse(init.body.toString());
    const n = usage.get(p_feature) ?? 0;
    if (p_limit <= 0 || n >= p_limit) return res(false);
    usage.set(p_feature, n + 1);
    return res(true);
  }
  if (url.includes("generativelanguage.googleapis.com")) {
    geminiCalls++;
    if (new Headers(init.headers).get("x-goog-api-key") !== "gemini-test") return res({}, 403);
    return res({ candidates: [{ content: { parts: [{ text: "oi" }] } }] });
  }
  throw new Error("fetch inesperado: " + url);
};

let handler!: (req: Request) => Promise<Response>;
(Deno as any).serve = (h: any) => { handler = h; return {} as any; };
await import(fnPath);

const call = (feature?: string) => handler(new Request("https://fn/gemini", {
  method: "POST",
  headers: { Authorization: "Bearer user-jwt", "Content-Type": "application/json" },
  body: JSON.stringify({ model: "gemini-2.5-flash", ...(feature ? { feature } : {}), request: { contents: [] } }),
}));
const statuses = async (feature: string | undefined, n: number) => { const out: number[] = []; for (let i = 0; i < n; i++) out.push((await call(feature)).status); return out; };

let failures = 0;
const check = (name: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "OK    " : "FALHOU"} ${name}`);
  if (!ok) { failures++; console.log("      ", JSON.stringify(extra)); }
};

// Grátis
let s = await statuses("chat", 4);
check("1. grátis: chat libera 3 e bloqueia a 4ª (429)", JSON.stringify(s) === "[200,200,200,429]", s);
s = await statuses("receipt", 1);
check("2. grátis: recibo é PRO (429)", s[0] === 429, s);
const r = await call("chat");
check("3. resposta 429 indica o recurso", (await r.json()).error === "limit_reached");

// PRO
usage.clear();
premiumRow = { is_premium: true, expires_at: new Date(Date.now() + 86400000).toISOString() };
s = await statuses("receipt", 2);
check("4. PRO: recibo liberado", s.every(x => x === 200), s);
s = await statuses("chat", 5);
check("5. PRO: chat além de 3", s.every(x => x === 200), s);

// PRO expirado vira grátis
usage.clear();
premiumRow = { is_premium: true, expires_at: new Date(Date.now() - 86400000).toISOString() };
s = await statuses("receipt", 1);
check("6. PRO expirado: recibo bloqueado", s[0] === 429, s);

// App antigo (sem feature) → limite geral
usage.clear(); premiumRow = null;
s = await statuses(undefined, 3);
check("7. app 1.9.1 (sem feature) continua funcionando", s.every(x => x === 200), s);
check("7b. app antigo conta no limite 'legacy'", usage.get("legacy") === 3, [...usage]);

// Recurso inventado
check("8. recurso desconhecido → 400", (await call("hack")).status === 400);

// Migração não rodada: não derruba a IA
usage.clear(); rpcError = true;
const before = geminiCalls;
s = await statuses("chat", 5);
check("9. sem a tabela de cota: IA segue funcionando", s.every(x => x === 200) && geminiCalls - before === 5, s);

console.log(failures ? `\n${failures} FALHA(S)` : "\nTodos os cenários passaram");
Deno.exit(failures ? 1 : 0);
