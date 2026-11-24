// FirstDraft AI proxy. The Gemini key stays server-side; only signed-in users
// can call this, and each user has a daily message limit so the free quota is
// shared fairly. The model's answer is streamed back as it's written.
//
// Secrets (supabase secrets set NAME=value):
//   GEMINI_API_KEY          required
//   GEMINI_MODEL            optional (see _shared/ai-core.ts for the default)
//   GEMINI_FALLBACK_MODEL   optional, tried when the main model is rate-limited
//   AI_USER_DAILY_LIMIT     optional, messages per user per day (default 60, 0 = unlimited)
//   AI_GLOBAL_DAILY_LIMIT   optional, messages per day for the whole app (default 0 = unlimited)

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  GEMINI_API_KEY,
  HttpError,
  buildRequest,
  corsHeaders,
  json,
  streamTurn,
} from "../_shared/ai-core.ts";

const USER_DAILY_LIMIT = Number(Deno.env.get("AI_USER_DAILY_LIMIT") ?? 60);
const GLOBAL_DAILY_LIMIT = Number(Deno.env.get("AI_GLOBAL_DAILY_LIMIT") ?? 0);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
  auth: { persistSession: false },
});
const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

async function getUserId(token: string) {
  if (!token) return null;
  // getClaims verifies the token locally when possible (no network round trip).
  if (typeof authClient.auth.getClaims === "function") {
    const { data } = await authClient.auth.getClaims(token);
    if (data?.claims?.sub && data.claims.role === "authenticated") return data.claims.sub as string;
    return null;
  }
  const { data } = await authClient.auth.getUser(token);
  return data?.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const userId = await getUserId(token).catch(() => null);
  if (!userId) return json({ error: "Please sign in again." }, 401);

  if (!GEMINI_API_KEY) {
    return json({ error: "The AI isn't configured yet (missing GEMINI_API_KEY)." }, 500);
  }

  try {
    const payload = await req.json().catch(() => null);
    const requestBody = buildRequest(payload);

    const { data: usage, error: usageError } = await admin.rpc("consume_ai_request", {
      p_user: userId,
      p_user_limit: USER_DAILY_LIMIT,
      p_global_limit: GLOBAL_DAILY_LIMIT,
    });

    if (usageError) {
      console.error("Usage check failed", usageError);
    } else if (!usage?.allowed) {
      throw new HttpError(
        429,
        usage?.reason === "global"
          ? "FirstDraft has reached today's limit. Please come back tomorrow."
          : `You've used all ${usage?.limit} of today's messages. Your limit resets tomorrow — you can still edit your document and download it.`,
      );
    }

    const usageHeaders: Record<string, string> = {
      "Access-Control-Expose-Headers": "X-Usage-Used, X-Usage-Limit",
    };
    if (usage?.allowed) {
      usageHeaders["X-Usage-Used"] = String(usage.used);
      usageHeaders["X-Usage-Limit"] = String(usage.limit);
    }

    return await streamTurn(requestBody, usageHeaders);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Request failed. Please try again." }, 500);
  }
});
