// Payments for signed-in users (Paystack).
//   action "plans"    → prices and whether payments are set up
//   action "checkout" → creates a Paystack payment page and returns its URL
//   action "verify"   → after returning from Paystack, confirms the payment
//
// Secrets: PAYSTACK_SECRET_KEY (required to take payments), optional
// PRICE_NGN, PRICE_USD, PAYSTACK_CURRENCIES, SITE_URL.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { CURRENCIES, PAYSTACK_SECRET_KEY, PLANS, SITE_URL, corsHeaders, json, paystack } from "../_shared/billing.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
  auth: { persistSession: false },
});
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

async function getUser(token: string) {
  if (!token) return null;
  const { data } = await authClient.auth.getUser(token);
  return data?.user ? { id: data.user.id, email: data.user.email || "" } : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await getUser((req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "")).catch(() => null);
  if (!user) return json({ error: "Please sign in again." }, 401);

  const payload = await req.json().catch(() => ({}));
  const action = String(payload?.action || "");

  try {
    if (action === "plans") {
      return json({
        configured: !!PAYSTACK_SECRET_KEY,
        testMode: PAYSTACK_SECRET_KEY.startsWith("sk_test_"),
        currencies: CURRENCIES,
        plans: Object.entries(PLANS).map(([id, p]) => ({
          id,
          label: p.label,
          days: p.days,
          prices: Object.fromEntries(Object.entries(p.prices).filter(([c]) => CURRENCIES.includes(c))),
        })),
      });
    }

    if (!PAYSTACK_SECRET_KEY) {
      return json({ error: "Payments aren't set up yet. Please try again later." }, 503);
    }

    if (action === "checkout") {
      const plan = PLANS[payload.plan] ? payload.plan : "pro30";
      const currency = CURRENCIES.includes(String(payload.currency).toUpperCase())
        ? String(payload.currency).toUpperCase()
        : CURRENCIES[0];
      const amount = Math.round(PLANS[plan].prices[currency] * 100); // kobo / cents
      if (!amount || !user.email) return json({ error: "This plan isn't available." }, 400);

      const reference = `fd_${crypto.randomUUID().replaceAll("-", "")}`;
      const { error } = await admin
        .from("payments")
        .insert({ user_id: user.id, reference, plan, amount, currency, status: "pending" });
      if (error) throw error;

      const tx = await paystack("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          amount,
          currency,
          reference,
          callback_url: `${SITE_URL}/app/billing`,
          metadata: { user_id: user.id, plan },
        }),
      });
      return json({ url: tx.authorization_url, reference });
    }

    if (action === "verify") {
      const reference = String(payload.reference || "");
      const { data: pay } = await admin
        .from("payments")
        .select("user_id, status")
        .eq("reference", reference)
        .maybeSingle();
      if (!pay || pay.user_id !== user.id) return json({ error: "Payment not found." }, 404);

      const tx = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
      if (tx.status !== "success") {
        if (tx.status === "failed" || tx.status === "abandoned") {
          await admin.from("payments").update({ status: "failed" }).eq("reference", reference).eq("status", "pending");
        }
        return json({ ok: false, status: tx.status });
      }
      const { data: result, error } = await admin.rpc("fulfill_payment", {
        p_reference: reference,
        p_amount: tx.amount,
        p_currency: tx.currency,
      });
      if (error) throw error;
      return json(result);
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Payment request failed" }, 500);
  }
});
