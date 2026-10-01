// Valida uma assinatura do Google Play no servidor e grava o status PRO.
// O app envia o purchaseToken da compra; a função consulta a Google Play
// Developer API com uma conta de serviço (secret GOOGLE_SERVICE_ACCOUNT_JSON)
// e grava em premium_status, tabela que o app só consegue ler.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PACKAGE_NAME = "com.sobcontrole.app";
const ALLOWED_PRODUCTS = ["sobcontrole_premium"];
// Estados em que o usuário ainda tem acesso (cancelada = acesso até expirar)
const ACCESS_STATES = [
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
];

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

// ---------- Autenticação Google (conta de serviço → access token) ----------

const base64url = (data: ArrayBuffer | string) => {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function getGoogleAccessToken(serviceAccount: { client_email: string; private_key: string }) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));

  const pem = serviceAccount.private_key
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${base64url(signature)}`,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(`Google OAuth falhou: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token as string;
}

// ---------- Handler ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: { user }, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { purchaseToken?: string; productId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const { purchaseToken, productId } = body;
  if (!purchaseToken || !productId || !ALLOWED_PRODUCTS.includes(productId)) {
    return json({ error: "Invalid request" }, 400);
  }

  const saJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!saJson) return json({ error: "Server not configured" }, 500);

  // O mesmo comprovante não pode liberar PRO para duas contas
  const { data: existing } = await admin
    .from("premium_status")
    .select("user_id")
    .eq("purchase_token", purchaseToken)
    .maybeSingle();
  if (existing && existing.user_id !== user.id) {
    return json({ error: "Purchase belongs to another account", isPremium: false }, 409);
  }

  let subscription: any;
  try {
    const accessToken = await getGoogleAccessToken(JSON.parse(saJson));
    const res = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    subscription = await res.json();
    if (!res.ok) {
      console.error("[verify-purchase] Google Play recusou:", res.status, subscription?.error?.message);
      // Token inválido/desconhecido: não é PRO
      if (res.status === 400 || res.status === 404 || res.status === 410) {
        return json({ isPremium: false, expiresAt: null });
      }
      return json({ error: "Play API error" }, 502);
    }
  } catch (err) {
    console.error("[verify-purchase] Erro ao consultar o Google:", (err as Error).message);
    return json({ error: "Play API error" }, 502);
  }

  const lineItems: { productId?: string; expiryTime?: string }[] = subscription.lineItems ?? [];
  const ourItems = lineItems.filter((item) => ALLOWED_PRODUCTS.includes(item.productId ?? ""));
  const expiresAt = ourItems
    .map((item) => item.expiryTime)
    .filter((t): t is string => !!t)
    .sort()
    .pop() ?? null;

  const isPremium = ourItems.length > 0 &&
    ACCESS_STATES.includes(subscription.subscriptionState) &&
    !!expiresAt && new Date(expiresAt).getTime() > Date.now();

  const { error: upsertError } = await admin.from("premium_status").upsert({
    user_id: user.id,
    is_premium: isPremium,
    product_id: productId,
    purchase_token: purchaseToken,
    expires_at: expiresAt,
  }, { onConflict: "user_id" });

  if (upsertError) {
    console.error("[verify-purchase] Erro ao gravar status:", upsertError.message);
    return json({ error: "Database error" }, 500);
  }

  return json({ isPremium, expiresAt });
});
