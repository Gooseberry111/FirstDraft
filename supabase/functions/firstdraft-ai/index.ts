// FirstDraft AI proxy.
//
// One Gemini request per user message: the model returns its chat reply, the
// updated document and quick-reply suggestions together as JSON. Only the
// current document plus the last few messages are sent, which keeps each
// request small, and every user has a daily limit so the free quota is shared
// fairly.
//
// Secrets (supabase secrets set NAME=value):
//   GEMINI_API_KEY          required
//   GEMINI_MODEL            optional, default below
//   GEMINI_FALLBACK_MODEL   optional, tried when the main model is rate-limited
//                           (each model has its own free-tier quota)
//   AI_USER_DAILY_LIMIT     optional, messages per user per day (default 60, 0 = unlimited)
//   AI_GLOBAL_DAILY_LIMIT   optional, messages per day for the whole app (default 0 = unlimited)

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";
const GEMINI_FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") || "";
const USER_DAILY_LIMIT = Number(Deno.env.get("AI_USER_DAILY_LIMIT") ?? 60);
const GLOBAL_DAILY_LIMIT = Number(Deno.env.get("AI_GLOBAL_DAILY_LIMIT") ?? 0);

const HISTORY_MESSAGES = 10; // recent turns sent; older facts live in the document
const MAX_MESSAGE_CHARS = 6_000;
const MAX_DOCUMENT_CHARS = 30_000;

const DOCUMENT_TYPES = ["resume", "cv", "cover_letter", "essay"];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const SYSTEM_PROMPT = `You are FirstDraft, a friendly writing assistant that helps people create a Resume, CV, Cover Letter or Essay through conversation. Never call yourself an AI model or any other name.

The app shows a live preview of the document next to the chat. You receive the CURRENT DOCUMENT (JSON) and the recent conversation. Each turn you return JSON with:
- "reply": your chat message.
- "document": the full updated document, or null if nothing in it should change this turn.
- "suggestions": 2–4 very short tap-to-send replies the user is likely to want (e.g. "Skip this", "Add another job", "Make it more formal", likely answers). Use [] when the user must type something specific like their name.

HOW TO CHAT
- Warm, plain, concise. Ask ONE question at a time. Never list several questions.
- When asking for formatted info, show one short example clearly labelled "Example:".
- Skip anything already in the document or conversation.
- Never invent facts, employers, dates, numbers or achievements. If something is vague, ask a specific follow-up.
- Respect the user's tone and format preferences.
- When the user edits the document themselves, keep their edits.

QUESTION TRACKS (adapt; skip what is known)
- Resume: target role → name & contact → experience (most recent first, results) → education → skills → projects/certifications/achievements → optional job posting to tailor to.
- CV: field → name & contact → education → research/teaching/work → publications → awards/certifications → skills.
- Cover letter: role & company → key requirements → why them → 1–3 proof points → tone → addressee → name & contact.
- Essay: purpose → exact prompt → length limit → core story/argument → desired takeaway → tone.

DOCUMENT RULES
- Put every fact the user gives into the document straight away so the preview fills in as you chat.
- For resumes/CVs, write a 2–4 sentence "summary" once there is enough real information.
- Experience/research descriptions: one achievement per line, separated by "\\n".
- Cover letters and essays: when you have enough information, WRITE THE DRAFT INTO "body" (array of paragraphs, plain text). Do NOT repeat the draft in "reply" — just say it is in the preview and offer changes (tone, length, a specific paragraph).
- "title" is the essay title or the cover letter subject (e.g. "Application for Product Designer"). "recipient" is the cover letter addressee lines joined by "\\n". "closing" is the sign-off.
- Keep "documentType" unless the user clearly asks for a different kind of document.
- When the document is complete, tell the user they can click any text in the preview to edit it, switch template, or download PDF/Word.`;

const str = { type: "STRING" };
const strArray = { type: "ARRAY", items: str };
const objArray = (keys: string[]) => ({
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: Object.fromEntries(keys.map((k) => [k, str])),
  },
});

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: str,
    suggestions: strArray,
    document: {
      type: "OBJECT",
      nullable: true,
      properties: {
        documentType: { type: "STRING", enum: DOCUMENT_TYPES },
        personalInfo: {
          type: "OBJECT",
          properties: {
            name: str,
            email: str,
            phone: str,
            location: str,
            linkedin: str,
            website: str,
          },
        },
        summary: str,
        experience: objArray(["position", "company", "date", "description"]),
        education: objArray(["degree", "school", "date", "details"]),
        skills: strArray,
        projects: objArray(["name", "description"]),
        certifications: strArray,
        achievements: strArray,
        research: objArray(["title", "institution", "date", "description"]),
        publications: objArray(["title", "publisher", "date"]),
        title: str,
        recipient: str,
        body: strArray,
        closing: str,
      },
    },
  },
  required: ["reply", "suggestions", "document"],
};

type ChatMessage = { role: string; content: string };

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) throw new HttpError(400, "messages must be an array");

  const messages = input
    .filter(
      (m) =>
        m &&
        typeof m.content === "string" &&
        m.content.trim() &&
        (m.role === "user" || m.role === "assistant"),
    )
    .slice(-HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  if (!messages.length || messages[messages.length - 1].role !== "user") {
    throw new HttpError(400, "The last message must be from the user");
  }

  return messages;
}

// Gemini expects alternating user/model turns that start with the user.
function toGeminiContents(messages: ChatMessage[], documentJson: string) {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const message of messages) {
    const role = message.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n\n${message.content}`;
    else contents.push({ role, parts: [{ text: message.content }] });
  }

  if (contents[0]?.role === "model") contents.shift();

  // Attach the current document to the latest user turn.
  const latest = contents[contents.length - 1];
  latest.parts[0].text = `CURRENT DOCUMENT:\n${documentJson}\n\nUSER MESSAGE:\n${latest.parts[0].text}`;

  return contents;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function callModel(model: string, body: unknown) {
  return await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! },
      body: JSON.stringify(body),
    },
  );
}

// Tries the main model, retries once on a rate limit, then the fallback model.
// deno-lint-ignore no-explicit-any
async function callGemini(body: any) {
  const attempts = [GEMINI_MODEL, GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(Boolean);
  let lastStatus = 0;

  for (let i = 0; i < attempts.length; i++) {
    let response = await callModel(attempts[i], body);

    // If a model rejects the strict response schema, retry once in plain JSON mode.
    if (response.status === 400 && body.generationConfig?.responseSchema) {
      console.error("Schema rejected; retrying without responseSchema", await response.text());
      const { responseSchema: _unused, ...generationConfig } = body.generationConfig;
      body = { ...body, generationConfig };
      response = await callModel(attempts[i], body);
    }

    const data = await response.json().catch(() => null);

    if (response.ok) {
      const text = data?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text || "")
        .join("");
      if (!text) throw new HttpError(502, "The AI returned an empty response. Please try again.");
      return text as string;
    }

    lastStatus = response.status;
    console.error("Gemini error", attempts[i], response.status, JSON.stringify(data));

    const retryable = response.status === 429 || response.status === 503;
    if (!retryable) break;
    if (i === 0) await sleep(2500);
  }

  if (lastStatus === 429 || lastStatus === 503) {
    throw new HttpError(
      429,
      "FirstDraft is very busy right now. Please wait a minute and try again.",
    );
  }
  throw new HttpError(502, "The AI service returned an error. Please try again.");
}

function parseModelOutput(text: string) {
  try {
    const parsed = JSON.parse(text);
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : "",
      document: parsed.document && typeof parsed.document === "object" ? parsed.document : null,
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions
            .filter((s: unknown) => typeof s === "string" && s.trim())
            .map((s: string) => s.trim().slice(0, 60))
            .slice(0, 4)
        : [],
    };
  } catch {
    // The model ignored JSON mode; still show its words.
    return { reply: text, document: null, suggestions: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Only signed-in users may use the AI (the anon key alone is not enough).
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));

  if (!user) return json({ error: "Please sign in again." }, 401);

  if (!GEMINI_API_KEY) {
    return json({ error: "The AI isn't configured yet (missing GEMINI_API_KEY)." }, 500);
  }

  try {
    const payload = await req.json().catch(() => null);
    if (payload?.action !== "turn") throw new HttpError(400, "Unknown action");

    const messages = sanitizeMessages(payload.messages);
    const documentType = DOCUMENT_TYPES.includes(payload.document?.documentType)
      ? payload.document.documentType
      : "resume";
    const documentJson = JSON.stringify({ ...(payload.document || {}), documentType });
    if (documentJson.length > MAX_DOCUMENT_CHARS) {
      throw new HttpError(400, "This document is too long to process.");
    }

    // Daily limits (validated before any Gemini call).
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: usage, error: usageError } = await admin.rpc("consume_ai_request", {
      p_user: user.id,
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

    const text = await callGemini({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: toGeminiContents(messages, documentJson),
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        maxOutputTokens: 4096,
        temperature: 0.7,
      },
    });

    const result = parseModelOutput(text);

    return json({
      ...result,
      usage: usage?.allowed ? { used: usage.used, limit: usage.limit } : null,
    });
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Request failed. Please try again." }, 500);
  }
});
