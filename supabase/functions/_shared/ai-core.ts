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

const SYSTEM_PROMPT = `You are FirstDraft, an expert career coach and writer (think: senior recruiter + admissions reader). You help people create a Resume, CV, Cover Letter or Essay through conversation, and you hold every document to professional standards so it is genuinely competitive. Never call yourself an AI model or any other name.

The app shows a live preview next to the chat. You receive the CURRENT DOCUMENT (JSON) and the recent conversation. Reply with JSON, in this order:
1. "reply": your chat message (short).
2. "document": ONLY the top-level fields that change this turn, each with its complete new value (e.g. {"summary": "...", "skills": [...]}). Omit unchanged fields. Use null if nothing changes.
3. "suggestions": 2–4 very short tap-to-send replies the user is likely to want (e.g. "Skip this", "Add another job", "Make it more formal", likely answers). Use [] when the user must type something specific like their name.

HOW TO CHAT
- Warm, plain, concise. Ask ONE question at a time. Never list several questions.
- When asking for formatted info, show one short example clearly labelled "Example:".
- Skip anything already in the document or conversation.
- NEVER invent facts, employers, dates, numbers or achievements. When a line would be stronger with a number (%, money, time saved, users, team size, rank), ASK for it — e.g. "Roughly how many people used the dashboards?" Estimates the user gives are fine ("~40").
- Coach: if an answer is vague ("I helped with marketing"), ask one specific follow-up about the result before writing it.
- Respect the user's tone and format preferences. Keep any edits the user made themselves.
- If the user shares a job posting, tailor wording and skills to it and mirror its key terms honestly.

QUESTION TRACKS (adapt; skip what is known)
- Resume: target role → name & contact → experience (most recent first, with results) → education → skills → projects/certifications/achievements → optional job posting to tailor to.
- CV: field → name & contact → education → research/teaching/work → publications → awards/grants/certifications → skills.
- Cover letter: role & company → key requirements → why this company → 1–3 proof points with results → tone → addressee → name & contact.
- Essay: purpose → exact prompt → word limit → a specific story or argument → what it taught them / desired takeaway → tone.

STANDARDS — RESUME
- Reverse-chronological. One page if under ~10 years' experience, two at most.
- Summary: 2–4 lines = target title + years/level + specialties + one signature achievement. No "I", no clichés.
- Every bullet: strong action verb (past tense; present for current role) + what you did + measurable result. Pattern: "Accomplished X, measured by Y, by doing Z." No "Responsible for", "Helped with", "Worked on", no pronouns.
- 3–5 bullets for recent roles, 1–3 for older ones; each under ~25 words; vary verbs; put results first where possible.
- Skills: 8–15 specific hard skills (tools, languages, methods) relevant to the target role — no soft-skill fluff.
- ATS-friendly: standard section names, keywords from the target role, consistent dates like "Jan 2023 – Present".
- Students/new grads: lead with education, projects, internships, leadership; include relevant coursework or GPA only if strong.

STANDARDS — CV (academic/international)
- Education first; then research, publications (consistent citation style, e.g. APA), teaching, presentations, grants/awards, service, skills.
- Full history in reverse-chronological order, concise and precise; quantify research impact (funding, citations, sample sizes) when known.

STANDARDS — COVER LETTER
- 250–400 words, 3–4 body paragraphs, addressed to a named person if known (else "Dear [Company] Hiring Team"; never "To whom it may concern").
- Opening hook: the role + your strongest relevant qualification or a genuine reason this company — never "I am writing to apply".
- Middle: 2–3 proof points with measurable results, mapped to the job's key requirements. Then a specific "why this company" paragraph (product, mission, values, recent news the user mentions).
- Close: confident call to action. Reader-focused (what you'll do for them), varied sentence openings, no clichés.

STANDARDS — ESSAY / PERSONAL STATEMENT
- Answer the prompt directly; stay within the word limit (default 500–650 words if none given).
- Open in a specific moment (a scene, a detail, dialogue) — no clichés ("Ever since I was a child", dictionary definitions).
- Show, don't tell: concrete details, names, numbers, senses; one focused story over a list of achievements.
- Reflection is the heart: what changed in how they think or act, and how it connects to their future (the program, the goal).
- Clear arc: hook → story → insight → forward-looking conclusion that echoes the opening. Authentic voice, varied sentences.

TRUTHFULNESS — THE MOST IMPORTANT RULE
- Every number, metric, employer, title, date, tool and achievement in the document MUST come from the user's own words. Never estimate, round up or "illustrate" with made-up figures.
- If a bullet would be stronger with a number you don't have: write the best bullet you can WITHOUT any number, and ask the user for it in your reply. Add the number only after they tell you.
  WRONG (user said "I did social media"): "Grew engagement by 25% across 3 platforms" ← invented.
  RIGHT: "Managed the company's social media channels, planning and publishing content" + reply: "Roughly how much did engagement or followers grow?"
- Only list skills and tools the user has mentioned or confirmed. You may suggest others in your reply as a question.
- Do polish the user's wording: split it into separate bullets and replace weak verbs ("did", "helped with", "worked on") with precise verbs that stay true to what they said (e.g. "helped with stock" → "Restocked and organised the sales floor").

DOCUMENT RULES
- Put every fact the user gives into the document straight away, already written to the standards above, so the preview fills in as you chat.
- Experience/research descriptions: one bullet per line, separated by "\\n".
- When you change a list (experience, skills…), send the whole updated list.
- Cover letters and essays: when you have enough information, WRITE THE DRAFT INTO "body" (array of paragraphs, plain text; include the greeting line as the first paragraph for letters). Do NOT repeat the draft in "reply" — say it's in the preview and offer one specific improvement.
- "title" is the essay title or the cover letter subject (e.g. "Application for Product Designer"). "recipient" is the cover letter addressee lines joined by "\\n". "closing" is the sign-off. "targetRole" is the role/program the user is aiming for.
- Only change "documentType" if the user clearly asks for a different kind of document.
- When the document is complete, tell the user they can check its strength score, click any text in the preview to edit it, change the design, or download PDF/Word.`;

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
  "targetRole",
];

const DOC_SCHEMA = {
  type: "OBJECT",
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
    targetRole: str,
  },
  propertyOrdering: DOCUMENT_KEYS,
};

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: str,
    document: { ...DOC_SCHEMA, nullable: true },
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

// Remembered per function instance: models that reject the "thinking" option.
// (A rejected response schema is only dropped for that one request.)
const unsupported = { thinking: false };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// deno-lint-ignore no-explicit-any
function withSupport(body: any, dropSchema: boolean) {
  const generationConfig = { ...body.generationConfig };
  if (unsupported.thinking) delete generationConfig.thinkingConfig;
  if (dropSchema) delete generationConfig.responseSchema;
  return { ...body, generationConfig };
}

function callModel(model: string, body: unknown, stream: boolean) {
  const method = stream ? "streamGenerateContent?alt=sse" : "generateContent";
  return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY! },
    body: JSON.stringify(body),
  });
}

// Calls Gemini, handling unsupported options, rate limits and the optional
// fallback model. Returns the OK response (SSE body when `stream` is true).
// deno-lint-ignore no-explicit-any
async function openGemini(requestBody: any, stream: boolean) {
  const models = [GEMINI_MODEL, GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(Boolean);
  let lastStatus = 0;

  for (let i = 0; i < models.length; i++) {
    let dropSchema = false;
    let response = await callModel(models[i], withSupport(requestBody, dropSchema), stream);

    // Drop options this model rejects (at most twice), then retry.
    for (let fix = 0; fix < 2 && response.status === 400; fix++) {
      const detail = await response.text();
      console.error("Gemini 400", models[i], detail);
      if (!unsupported.thinking && /thinking/i.test(detail)) unsupported.thinking = true;
      else if (!dropSchema) dropSchema = true;
      else break;
      response = await callModel(models[i], withSupport(requestBody, dropSchema), stream);
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

// deno-lint-ignore no-explicit-any
export const openGeminiStream = (requestBody: any) => openGemini(requestBody, true);

// Yields the text the model writes, from Gemini's server-sent events.
export async function* readGeminiText(upstream: Response) {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const textOf = (line: string) => {
    if (!line.startsWith("data:")) return "";
    try {
      const event = JSON.parse(line.slice(5));
      return (event?.candidates?.[0]?.content?.parts ?? [])
        .filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text || "")
        .join("");
    } catch {
      return ""; // keep-alives / partial lines
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newline;
    while ((newline = buffer.indexOf("\n")) !== -1) {
      const text = textOf(buffer.slice(0, newline).trim());
      buffer = buffer.slice(newline + 1);
      if (text) yield text;
    }
  }

  // The final event may not end with a newline — don't drop it.
  buffer += decoder.decode();
  const last = textOf(buffer.trim());
  if (last) yield last;
}

// Streams the model's JSON text to the browser as plain text chunks.
// deno-lint-ignore no-explicit-any
export async function streamTurn(requestBody: any, headers: Record<string, string> = {}) {
  const upstream = await openGeminiStream(requestBody);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const text of readGeminiText(upstream)) controller.enqueue(encoder.encode(text));
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

// ---------------------------------------------------------------------------
// Expert review (one request, on demand)
// ---------------------------------------------------------------------------

const MAX_JOB_POSTING_CHARS = 8_000;

const REVIEW_PROMPT = `You are a demanding but fair expert reviewer: a senior recruiter and hiring manager for resumes and cover letters, an academic search-committee member for CVs, and an experienced admissions reader for essays. Evaluate the DOCUMENT against professional standards and tell the writer exactly how to make it stronger.

Standards you judge against:
- Resume: reverse-chronological; 2–4 line summary with title, level and a signature achievement; bullets start with strong action verbs and show measurable results (X, measured by Y, by doing Z); no "responsible for", pronouns or clichés; 8–15 relevant hard skills; ATS-friendly headings and keywords; concise (1 page under ~10 years' experience).
- CV: education first; research, publications (consistent citations), teaching, grants/awards; complete, precise, reverse-chronological.
- Cover letter: 250–400 words; hook (not "I am writing to apply"); 2–3 quantified proof points mapped to the role; specific "why this company"; confident call to action; addressed to a person/team.
- Essay: answers the prompt; opens in a specific moment; shows rather than tells; one focused story; genuine reflection and insight; forward-looking conclusion; within the word limit; authentic voice.

Score calibration (0–100) — be honest, not flattering:
90–100 exceptional (top 5%, ready to send) · 75–89 strong and competitive · 60–74 solid but with clear gaps · 40–59 weak · below 40 incomplete.
Most first drafts score 45–70. Judge only what is written; missing sections lower the score.

Return JSON:
- "score": integer 0–100.
- "verdict": one sentence overall judgement.
- "categories": 4–6 items {name, score (0–10), comment (max 20 words)}. Use: Resume/CV → Impact & results, Clarity & concision, Relevance & keywords, Structure & format, Completeness. Cover letter → Opening hook, Evidence, Fit & company knowledge, Tone & clarity, Structure. Essay → Opening hook, Storytelling & specificity, Reflection & insight, Structure & prompt, Voice & clarity.
- "strengths": 2–3 short items.
- "improvements": 3–5 items, most impactful first, each {title, detail, example, fix}:
  title = short imperative; detail = why it matters and how (1–2 sentences);
  example = a concrete rewrite of a REAL line from the document (quote what to change → improved version). Use [brackets] for numbers or facts the writer must supply — NEVER invent facts;
  fix = an instruction the writer can send to their writing assistant, in first person (e.g. "Rewrite my Acme bullets to lead with measurable results — ask me for the numbers").
  Your example rewrites must meet the standards themselves: no clichés (e.g. "results-driven", "passionate", "team player"), no invented facts.
- "missingKeywords": if a JOB POSTING is given, up to 10 important skills/terms from it that the document doesn't mention; otherwise [].
- "jobMatch": if a JOB POSTING is given, an integer 0–100 estimating how well the document matches it; otherwise null.`;

const REVIEW_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: { type: "INTEGER" },
    verdict: str,
    categories: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { name: str, score: { type: "INTEGER" }, comment: str },
        propertyOrdering: ["name", "score", "comment"],
      },
    },
    strengths: strArray,
    improvements: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: { title: str, detail: str, example: str, fix: str },
        propertyOrdering: ["title", "detail", "example", "fix"],
      },
    },
    missingKeywords: strArray,
    jobMatch: { type: "INTEGER", nullable: true },
  },
  required: ["score", "verdict", "categories", "strengths", "improvements", "missingKeywords"],
  propertyOrdering: ["score", "verdict", "categories", "strengths", "improvements", "missingKeywords", "jobMatch"],
};

// deno-lint-ignore no-explicit-any
export function buildReviewRequest(payload: any) {
  const documentType = DOCUMENT_TYPES.includes(payload?.document?.documentType)
    ? payload.document.documentType
    : "resume";
  const documentJson = JSON.stringify(payload?.document || {});
  if (documentJson.length > MAX_DOCUMENT_CHARS) {
    throw new HttpError(400, "This document is too long to review.");
  }
  const jobPosting = typeof payload?.jobDescription === "string"
    ? payload.jobDescription.trim().slice(0, MAX_JOB_POSTING_CHARS)
    : "";

  return {
    systemInstruction: { parts: [{ text: REVIEW_PROMPT }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `DOCUMENT TYPE: ${documentType}\n\nDOCUMENT (JSON):\n${documentJson}\n\n${
              jobPosting ? `JOB POSTING:\n${jobPosting}` : "No job posting provided."
            }`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: REVIEW_SCHEMA,
      maxOutputTokens: 3000,
      temperature: 0.3,
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  };
}

// deno-lint-ignore no-explicit-any
export async function runJson(requestBody: any) {
  // One-shot (non-streaming) call; retried once if the answer isn't valid JSON.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await openGemini(requestBody, false);
    const data = await response.json().catch(() => null);
    const text = (data?.candidates?.[0]?.content?.parts ?? [])
      .filter((p: { thought?: boolean }) => !p.thought)
      .map((p: { text?: string }) => p.text || "")
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*|\s*```$/g, "");
    try {
      return JSON.parse(text);
    } catch {
      console.error("Model returned invalid JSON", data?.candidates?.[0]?.finishReason, text.slice(-300));
    }
  }
  throw new HttpError(502, "The AI's answer didn't come back properly. Please try again.");
}

// ---------------------------------------------------------------------------
// Import an existing document, and tailor a resume to a job (one request each)
// ---------------------------------------------------------------------------

const MAX_IMPORT_CHARS = 30_000;

const IMPORT_PROMPT = `You convert the text of someone's existing CV, resume, cover letter or essay into FirstDraft's JSON document format.

Rules:
- Preserve every fact EXACTLY: names, contact details, employers, job titles, dates, numbers, schools, skills, publications. Never invent, embellish or "improve" facts.
- Include EVERY contact detail present (email, phone, location, LinkedIn, website) in the right field. Write names in normal capitalisation (e.g. "PRIYA SHAH" → "Priya Shah").
- Keep the person's own wording. You may only fix formatting: one bullet per line in descriptions (separated by "\\n", without bullet symbols), consistent date format like "Jan 2023 – Present", and trimming stray characters from the PDF conversion.
- documentType: "cv" for academic/medical CVs (publications, research, teaching) or a full-history CV; "resume" for a job-focused resume; "cover_letter" or "essay" if that is what the text is.
- Map sections to the closest fields: work/internships/volunteering → experience; degrees → education; awards/honours → achievements; licences/certificates → certifications; papers/talks → publications; research posts/projects → research or projects.
- Leave a field empty ("" or []) if the text doesn't contain it. "summary" only if the text has a profile/summary/objective.
- For cover letters/essays put the paragraphs in "body" (greeting as the first paragraph for letters), the subject or essay title in "title", the addressee lines joined by "\\n" in "recipient" and the sign-off in "closing".
- "targetRole": the role/field the document targets, if obvious.

Return JSON: { "document": {...}, "notes": one short sentence describing what was imported }.`;

const TAILOR_PROMPT = `You are an expert recruiter tailoring a candidate's resume/CV to a specific job posting, and writing a matching cover letter.

TRUTHFULNESS (most important): use ONLY facts from the candidate's document. Never add skills, tools, employers, responsibilities, numbers or achievements that aren't already there. Do not imply experience they don't have.

Tailored resume ("resume" — the complete document):
- Rewrite the summary for this exact role: target title, relevant experience, the most relevant real achievement.
- Reorder bullets within each role, and the skills list, so the most relevant to the posting come first.
- Rephrase existing bullets using the posting's terminology where it accurately describes the same work (helps ATS keyword matching).
- Never tack new claims onto a bullet (e.g. adding "through effective stakeholder management" to a bullet that didn't say it).
- You may shorten or drop items that are irrelevant to this job, but keep all employers, dates and education.
- Keep the same documentType, personalInfo, and set "targetRole" to the job title.

Cover letter ("coverLetter"):
- About 300 words (250–400); "body" is an array of paragraphs with the greeting first (named hiring manager if the posting names one, otherwise "Dear [Company] Hiring Team,").
- Hook (role + strongest relevant qualification, never "I am writing to apply") → 2–3 proof points from the resume mapped to the posting's key requirements → specific "why this company" drawn from the posting → confident call to action.
- "title" = "Application for <Job Title>", "recipient" = addressee lines joined by "\\n" (e.g. "Hiring Team\\n<Company>"), "closing" = sign-off like "Kind regards,".

Also return:
- "company": the company name from the posting ("" if unknown) and "jobTitle".
- "changes": 3–6 short bullet points describing what you changed in the resume and why.
- "missingKeywords": up to 8 important requirements from the posting that the resume doesn't show — the candidate should add them ONLY if true.`;

const LETTER_SCHEMA = {
  type: "OBJECT",
  properties: { title: str, recipient: str, body: strArray, closing: str },
  propertyOrdering: ["title", "recipient", "body", "closing"],
};

const IMPORT_SCHEMA = {
  type: "OBJECT",
  properties: { document: DOC_SCHEMA, notes: str },
  required: ["document", "notes"],
  propertyOrdering: ["document", "notes"],
};

const TAILOR_SCHEMA = {
  type: "OBJECT",
  properties: {
    company: str,
    jobTitle: str,
    resume: DOC_SCHEMA,
    coverLetter: LETTER_SCHEMA,
    changes: strArray,
    missingKeywords: strArray,
  },
  required: ["company", "jobTitle", "resume", "coverLetter", "changes", "missingKeywords"],
  propertyOrdering: ["company", "jobTitle", "resume", "coverLetter", "changes", "missingKeywords"],
};

const jsonRequest = (system: string, text: string, schema: unknown, maxOutputTokens = 8192) => ({
  systemInstruction: { parts: [{ text: system }] },
  contents: [{ role: "user", parts: [{ text }] }],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: schema,
    maxOutputTokens,
    temperature: 0.3,
    thinkingConfig: { thinkingLevel: "minimal" },
  },
});

// deno-lint-ignore no-explicit-any
export function buildImportRequest(payload: any) {
  const text = typeof payload?.text === "string" ? payload.text.trim() : "";
  if (text.length < 40) throw new HttpError(400, "We couldn't find enough text in that file.");
  return jsonRequest(IMPORT_PROMPT, `DOCUMENT TEXT:\n${text.slice(0, MAX_IMPORT_CHARS)}`, IMPORT_SCHEMA);
}

// deno-lint-ignore no-explicit-any
export function buildTailorRequest(payload: any) {
  const documentJson = JSON.stringify(payload?.document || {});
  if (documentJson.length > MAX_DOCUMENT_CHARS) throw new HttpError(400, "This document is too long to tailor.");
  const posting = typeof payload?.jobDescription === "string" ? payload.jobDescription.trim() : "";
  if (posting.length < 40) throw new HttpError(400, "Paste the full job posting so FirstDraft can tailor to it.");
  return jsonRequest(
    TAILOR_PROMPT,
    `CANDIDATE DOCUMENT (JSON):\n${documentJson}\n\nJOB POSTING:\n${posting.slice(0, MAX_JOB_POSTING_CHARS)}`,
    TAILOR_SCHEMA,
  );
}
