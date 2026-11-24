import { supabase } from "@/lib/supabase";
import { parsePartialJson } from "@/utils/partialJson";

// All AI calls go through the `firstdraft-ai` Supabase Edge Function so the
// Gemini API key never reaches the browser. One call per user message; the
// answer is streamed so the reply and the preview update while it's written.
// See supabase/functions/firstdraft-ai/index.ts.

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firstdraft-ai`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const HISTORY_MESSAGES = 10;
const PROGRESS_INTERVAL_MS = 50;

const shape = (data) => ({
  reply: typeof data?.reply === "string" ? data.reply : "",
  document: data?.document && typeof data.document === "object" ? data.document : null,
  suggestions: Array.isArray(data?.suggestions)
    ? data.suggestions.filter((s) => typeof s === "string" && s.trim()).slice(0, 4)
    : [],
});

/**
 * Sends one chat turn. `onProgress({ reply, document })` is called repeatedly
 * while the answer streams in; `document` holds only the changed fields.
 */
export async function chatTurn(messages, document, onProgress = () => {}) {
  const history = messages
    .filter((m) => !m.pending && !m.failed && m.content?.trim())
    .slice(-HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content }));

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in again.");

  let response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "turn", messages: history, document }),
    });
  } catch {
    throw new Error("Couldn't reach FirstDraft. Check your connection and try again.");
  }

  if (!response.ok) {
    const details = await response.json().catch(() => null);
    throw new Error(details?.error || "Something went wrong. Please try again.");
  }

  const used = Number(response.headers.get("X-Usage-Used"));
  const limit = Number(response.headers.get("X-Usage-Limit"));
  const usage = limit > 0 ? { used, limit } : null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let lastProgress = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });

    const now = performance.now();
    if (now - lastProgress > PROGRESS_INTERVAL_MS) {
      lastProgress = now;
      const partial = parsePartialJson(text);
      if (partial) onProgress(shape(partial));
    }
  }
  text += decoder.decode();

  let final;
  try {
    final = shape(JSON.parse(text));
  } catch {
    final = shape(parsePartialJson(text));
    if (!final.reply && !final.document) {
      // The model ignored JSON mode; still show its words.
      final.reply = text.trim();
    }
  }

  if (!final.reply && !final.document) {
    throw new Error("FirstDraft didn't answer that time. Please try again.");
  }

  return {
    reply: final.reply.trim() || "Done — take a look at the preview.",
    document: final.document,
    suggestions: final.suggestions,
    usage,
  };
}

/**
 * Expert review: one AI request that grades the document like a recruiter /
 * admissions reader. Optionally checks it against a pasted job posting.
 */
export async function reviewDocument(document, jobDescription = "") {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Please sign in again.");

  let response;
  try {
    response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "review", document, jobDescription }),
    });
  } catch {
    throw new Error("Couldn't reach FirstDraft. Check your connection and try again.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.review) {
    throw new Error(data?.error || "The review failed. Please try again.");
  }

  const r = data.review;
  const clamp = (n, max) => Math.max(0, Math.min(max, Math.round(Number(n) || 0)));
  return {
    review: {
      score: clamp(r.score, 100),
      verdict: String(r.verdict || ""),
      categories: (r.categories || []).map((c) => ({
        name: String(c.name || ""),
        score: clamp(c.score, 10),
        comment: String(c.comment || ""),
      })),
      strengths: (r.strengths || []).map(String).slice(0, 3),
      improvements: (r.improvements || []).slice(0, 5).map((i) => ({
        title: String(i.title || ""),
        detail: String(i.detail || ""),
        example: String(i.example || ""),
        fix: String(i.fix || ""),
      })),
      missingKeywords: (r.missingKeywords || []).map(String).slice(0, 10),
      jobMatch: r.jobMatch == null ? null : clamp(r.jobMatch, 100),
    },
    usage: data.usage || null,
  };
}
