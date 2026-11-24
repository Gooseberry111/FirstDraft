// Paystack calls this URL when a payment succeeds, even if the user closed
// the tab. The request is only trusted if its HMAC signature matches our
// secret key. Set this URL in Paystack → Settings → API Keys & Webhooks:
//   https://<project-ref>.supabase.co/functions/v1/paystack-webhook
// Deploy with --no-verify-jwt (Paystack doesn't send a Supabase token).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { PAYSTACK_SECRET_KEY } from "../_shared/billing.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

async function hmacSha512Hex(key: string, body: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST" || !PAYSTACK_SECRET_KEY) return new Response("ignored", { status: 200 });

  const body = await req.text();
  const signature = req.headers.get("x-paystack-signature") || "";
  if (!safeEqual(await hmacSha512Hex(PAYSTACK_SECRET_KEY, body), signature)) {
    return new Response("invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);
  if (event?.event === "charge.success" && event.data?.reference) {
    const { data, error } = await admin.rpc("fulfill_payment", {
      p_reference: event.data.reference,
      p_amount: event.data.amount,
      p_currency: event.data.currency,
    });
    if (error) {
      console.error("fulfill_payment failed", error);
      return new Response("error", { status: 500 }); // Paystack will retry
    }
    console.log("Payment fulfilled", event.data.reference, JSON.stringify(data));
  }

  return new Response("ok", { status: 200 });
});
