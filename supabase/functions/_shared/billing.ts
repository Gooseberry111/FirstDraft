// Shared billing config. Prices can be changed with secrets, e.g.
//   supabase secrets set PRICE_NGN=3000 PRICE_USD=5 PAYSTACK_CURRENCIES=NGN,USD
// (USD only works after Paystack enables it on your account.)

export const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
export const SITE_URL = (Deno.env.get("SITE_URL") || "https://first-draftt.netlify.app").replace(/\/$/, "");

export const CURRENCIES = (Deno.env.get("PAYSTACK_CURRENCIES") || "NGN")
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

export const PLANS: Record<string, { label: string; days: number; prices: Record<string, number> }> = {
  pro30: {
    label: "Pro pass (30 days)",
    days: 30,
    prices: {
      NGN: Number(Deno.env.get("PRICE_NGN") ?? 3000),
      USD: Number(Deno.env.get("PRICE_USD") ?? 5),
    },
  },
};

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function paystack(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.status) {
    console.error("Paystack error", path, response.status, JSON.stringify(data));
    throw new Error(data?.message || "Payment provider error");
  }
  return data.data;
}
