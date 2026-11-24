// Shared FirstDraft AI logic: prompt, schema, and a streaming Gemini call.
//
// Speed matters here, so:
// - the answer is STREAMED: the browser shows the reply and fills the preview
//   while the model is still writing;
// - the model returns only the document fields that CHANGED this turn
//   instead of rewriting the whole document;
// - "thinking" is set to the minimum (falls back automatically if a model
//   doesn't support the setting).

export const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
// Measured: flash-lite starts answering in ~1s, while the bigger flash models
// were often overloaded on the free tier (15–90s waits or 503 errors).
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.5-flash-lite";
const GEMINI_FALLBACK_MODEL = Deno.env.get("GEMINI_FALLBACK_MODEL") || "gemini-flash-lite-latest";

const HISTORY_MESSAGES = 10; // recent turns sent; older facts live in the document
const MAX_MESSAGE_CHARS = 6_000;
const MAX_DOCUMENT_CHARS = 30_000;

export const DOCUMENT_TYPES = ["resume", "cv", "cover_letter", "essay"];

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

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const SYSTEM_PROMPT = `You are FirstDraft, a friendly writing assistant that helps people create a Resume, CV, Cover Letter or Essay through conversation. Never call yourself an AI model or any other name.

The app shows a live preview of the document next to the chat. You receive the CURRENT DOCUMENT (JSON) and the recent conversation. Reply with JSON, in this order:
1. "reply": your chat message (short).
2. "document": ONLY the top-level fields that change this turn, each with its complete new value (e.g. {"summary": "...", "skills": [...]}). Omit unchanged fields. Use null if nothing changes.
3. "suggestions": 2–4 very short tap-to-send replies the user is likely to want (e.g. "Skip this", "Add another job", "Make it more formal", likely answers). Use [] when the user must type something specific like their name.

HOW TO CHAT
- Warm, plain, concise. Ask ONE question at a time. Never list several questions.
- When asking for formatted info, show one short example clearly labelled "Example:".
- Skip anything already in the document or conversation.
- Never invent facts, employers, dates, numbers or achievements. If something is vague, ask a specific follow-up.
- Respect the user's tone and format preferences. Keep any edits the user made to the document themselves.

QUESTION TRACKS (adapt; skip what is known)
- Resume: target role → name & contact → experience (most recent first, results) → education → skills → projects/certifications/achievements → optional job posting to tailor to.
- CV: field → name & contact → education → research/teaching/work → publications → awards/certifications → skills.
- Cover letter: role & company → key requirements → why them → 1–3 proof points → tone → addressee → name & contact.
- Essay: purpose → exact prompt → length limit → core story/argument → desired takeaway → tone.

DOCUMENT RULES
- Put every fact the user gives into the document straight away so the preview fills in as you chat.
- For resumes/CVs, write a 2–4 sentence "summary" once there is enough real information.
- Experience/research descriptions: one achievement per line, separated by "\\n".
- When you change a list (experience, skills…), send the whole updated list.
- Cover letters and essays: when you have enough information, WRITE THE DRAFT INTO "body" (array of paragraphs, plain text). Do NOT repeat the draft in "reply" — just say it is in the preview and offer changes (tone, length, a specific paragraph).
- "title" is the essay title or the cover letter subject (e.g. "Application for Product Designer"). "recipient" is the cover letter addressee lines joined by "\\n". "closing" is the sign-off.
- Only change "documentType" if the user clearly asks for a different kind of document.
- When the document is complete, tell the user they can click any text in the preview to edit it, change the design, or download PDF/Word.`;

const str = { type: "STRING" };
const strArray = { type: "ARRAY", items: str };
const objArray = (keys: string[]) => ({
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: Object.fromEntries(keys.map((k) => [k, str])),
    propertyOrdering: keys,
  },
});

const DOCUMENT_KEYS = [
  "documentType",
  "personalInfo",
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
  "achievements",
  "research",
  "publications",
  "title",
  "recipient",
  "body",
  "closing",
];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: str,
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
      propertyOrdering: DOCUMENT_KEYS,
    },
    suggestions: strArray,
  },
  required: ["reply", "document", "suggestions"],
  propertyOrdering: ["reply", "document", "suggestions"],
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

  const latest = contents[contents.length - 1];
  latest.parts[0].text = `CURRENT DOCUMENT:\n${documentJson}\n\nUSER MESSAGE:\n${latest.parts[0].text}`;
  return contents;
}

// Validates the browser's payload and builds the Gemini request body.
// deno-lint-ignore no-explicit-any
export function buildRequest(payload: any) {
  if (payload?.action !== "turn") throw new HttpError(400, "Unknown action");

  const messages = sanitizeMessages(payload.messages);
  const documentType = DOCUMENT_TYPES.includes(payload.document?.documentType)
    ? payload.document.documentType
    : "resume";
  const documentJson = JSON.stringify({ ...(payload.document || {}), documentType });
  if (documentJson.length > MAX_DOCUMENT_CHARS) {
    throw new HttpError(400, "This document is too long to process.");
  }

  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: toGeminiContents(messages, documentJson),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 4096,
      temperature: 0.7,
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  };
}

// Remembered per function instance, so a rejected option is only tried once.
const unsupported = { thinking: false, schema: false };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// deno-lint-ignore no-explicit-any
function applySupport(body: any) {
  const generationConfig = { ...body.generationConfig };
  if (unsupported.thinking) delete generationConfig.thinkingConfig;
  if (unsupported.schema) delete generationConfig.responseSchema;
  return { ...body, generationConfig };
}

function startStream(model: string, body: unknown) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! },
      body: JSON.stringify(body),
    },
  );
}

// Opens a Gemini stream, handling unsupported options, rate limits and the
// optional fallback model. Returns the OK response whose body is SSE.
// deno-lint-ignore no-explicit-any
async function openGeminiStream(requestBody: any) {
  const models = [GEMINI_MODEL, GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(Boolean);
  let lastStatus = 0;

  for (let i = 0; i < models.length; i++) {
    let response = await startStream(models[i], applySupport(requestBody));

    // Drop options this model rejects (at most twice), then retry.
    for (let fix = 0; fix < 2 && response.status === 400; fix++) {
      const detail = await response.text();
      console.error("Gemini 400", models[i], detail);
      if (!unsupported.thinking && /thinking/i.test(detail)) unsupported.thinking = true;
      else if (!unsupported.schema) unsupported.schema = true;
      else break;
      response = await startStream(models[i], applySupport(requestBody));
    }

    if (response.ok && response.body) return response;

    lastStatus = response.status;
    console.error("Gemini error", models[i], response.status, await response.text().catch(() => ""));
    if (response.status !== 429 && response.status !== 503) break;
    if (i === 0) await sleep(2000);
  }

  if (lastStatus === 429 || lastStatus === 503) {
    throw new HttpError(429, "FirstDraft is very busy right now. Please wait a minute and try again.");
  }
  throw new HttpError(502, "The AI service returned an error. Please try again.");
}

// Streams the model's JSON text to the browser as plain text chunks.
// deno-lint-ignore no-explicit-any
export async function streamTurn(requestBody: any, headers: Record<string, string> = {}) {
  const upstream = await openGeminiStream(requestBody);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newline;
          while ((newline = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (!line.startsWith("data:")) continue;
            try {
              const event = JSON.parse(line.slice(5));
              const text = (event?.candidates?.[0]?.content?.parts ?? [])
                .filter((p: { thought?: boolean }) => !p.thought)
                .map((p: { text?: string }) => p.text || "")
                .join("");
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              /* ignore keep-alives / partial lines */
            }
          }
        }
      } catch (error) {
        console.error("Stream interrupted", error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      ...headers,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
