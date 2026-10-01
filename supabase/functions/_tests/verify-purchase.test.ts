// Roda a Edge Function verify-purchase de verdade, com Google e Supabase simulados.
const fnPath = new URL("../verify-purchase/index.ts", import.meta.url).href;

// Chave RSA de teste (gerada aqui; não é credencial real)
const keyPair = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true, ["sign", "verify"],
);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...pkcs8)).match(/.{1,64}/g)!.join("\n")}\n-----END PRIVATE KEY-----\n`;

Deno.env.set("SUPABASE_URL", "https://proj.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "service-role-test");
Deno.env.set("GOOGLE_SERVICE_ACCOUNT_JSON", JSON.stringify({ client_email: "sa@test.iam.gserviceaccount.com", private_key: pem }));

// Estado simulado
let playResponse: { status: number; body: unknown } = { status: 200, body: {} };
let existingTokenOwner: string | null = null;
let upserted: any = null;
let jwtSignatureValid = false;

const b64urlDecode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));

globalThis.fetch = async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input.url;
  const method = init?.method ?? (typeof input !== "string" ? input.method : "GET");
  const res = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  if (url.includes("/auth/v1/user")) return res({ id: "user-1", email: "a@b.c", aud: "authenticated" });
  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    const assertion = new URLSearchParams(init.body.toString()).get("assertion")!;
    const [h, c, sig] = assertion.split(".");
    jwtSignatureValid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", keyPair.publicKey, b64urlDecode(sig), new TextEncoder().encode(`${h}.${c}`));
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(c)));
    if (!jwtSignatureValid || claims.scope !== "https://www.googleapis.com/auth/androidpublisher") return res({ error: "invalid_grant" }, 400);
    return res({ access_token: "google-token" });
  }
  if (url.includes("androidpublisher.googleapis.com")) {
    if (!url.includes("/applications/com.sobcontrole.app/purchases/subscriptionsv2/tokens/")) return res({}, 404);
    return res(playResponse.body, playResponse.status);
  }
  if (url.includes("/rest/v1/premium_status")) {
    if (method === "GET") return res(existingTokenOwner ? [{ user_id: existingTokenOwner }] : []);
    upserted = JSON.parse(init.body.toString());
    return new Response(null, { status: 201 });
  }
  throw new Error("fetch inesperado: " + method + " " + url);
};

let handler!: (req: Request) => Promise<Response>;
(Deno as any).serve = (h: any) => { handler = h; return {} as any; };
await import(fnPath);

const call = (body: unknown) => handler(new Request("https://fn/verify-purchase", {
  method: "POST", headers: { Authorization: "Bearer user-jwt", "Content-Type": "application/json" }, body: JSON.stringify(body),
}));

let failures = 0;
const check = (name: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "OK    " : "FALHOU"} ${name}`);
  if (!ok) { failures++; console.log("      ", JSON.stringify(extra)); }
};
const future = new Date(Date.now() + 30 * 86400000).toISOString();
const past = new Date(Date.now() - 86400000).toISOString();
const token = "tok-123";

// 1. Assinatura ativa
playResponse = { status: 200, body: { subscriptionState: "SUBSCRIPTION_STATE_ACTIVE", lineItems: [{ productId: "sobcontrole_premium", expiryTime: future }] } };
let r = await call({ purchaseToken: token, productId: "sobcontrole_premium" });
let j = await r.json();
check("1. ativa → PRO", r.status === 200 && j.isPremium === true && j.expiresAt === future, j);
check("1b. JWT assinado corretamente para o Google", jwtSignatureValid);
check("1c. grava premium_status", upserted?.user_id === "user-1" && upserted?.is_premium === true && upserted?.purchase_token === token, upserted);

// 2. Cancelada mas ainda no período pago
playResponse = { status: 200, body: { subscriptionState: "SUBSCRIPTION_STATE_CANCELED", lineItems: [{ productId: "sobcontrole_premium", expiryTime: future }] } };
j = await (await call({ purchaseToken: token, productId: "sobcontrole_premium" })).json();
check("2. cancelada dentro do período → ainda PRO", j.isPremium === true, j);

// 3. Expirada
playResponse = { status: 200, body: { subscriptionState: "SUBSCRIPTION_STATE_EXPIRED", lineItems: [{ productId: "sobcontrole_premium", expiryTime: past }] } };
j = await (await call({ purchaseToken: token, productId: "sobcontrole_premium" })).json();
check("3. expirada → não PRO", j.isPremium === false && upserted?.is_premium === false, j);

// 4. Token desconhecido pelo Google
playResponse = { status: 404, body: { error: { message: "not found" } } };
j = await (await call({ purchaseToken: token, productId: "sobcontrole_premium" })).json();
check("4. token inválido → não PRO", j.isPremium === false, j);

// 5. Token de outra conta
existingTokenOwner = "user-2";
r = await call({ purchaseToken: token, productId: "sobcontrole_premium" });
check("5. comprovante de outra conta → 409", r.status === 409, await r.json());
existingTokenOwner = null;

// 6. Produto não permitido
r = await call({ purchaseToken: token, productId: "outro_produto" });
check("6. produto desconhecido → 400", r.status === 400);

// 7. Sem login
r = await handler(new Request("https://fn/verify-purchase", { method: "POST", body: "{}" }));
check("7. sem login → 401", r.status === 401);

// 8. Google fora do ar
playResponse = { status: 503, body: { error: { message: "down" } } };
r = await call({ purchaseToken: token, productId: "sobcontrole_premium" });
check("8. Google fora do ar → 502 (app mantém o que a loja diz)", r.status === 502);

console.log(failures ? `\n${failures} FALHA(S)` : "\nTodos os cenários passaram");
Deno.exit(failures ? 1 : 0);
