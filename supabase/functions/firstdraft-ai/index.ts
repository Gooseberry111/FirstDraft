// FirstDraft AI proxy.
//
// The Gemini API key lives here as a server-side secret so it is never shipped
// to the browser. Only signed-in users can call this function.
//
// Deploy:
//   supabase secrets set GEMINI_API_KEY=your-key
//   supabase functions deploy firstdraft-ai
//
// Optional: supabase secrets set GEMINI_MODEL=some-other-model

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";

const MAX_MESSAGES = 80;
const MAX_MESSAGE_CHARS = 20_000;
const MAX_TOTAL_CHARS = 200_000;

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

const SYSTEM_PROMPT = `
You are FirstDraft.

IMPORTANT:

- Ask only one question at a time.
- Never ask multiple numbered questions in a single response.
- When gathering information, wait for the user's answer before asking the next question.
- Keep responses concise.
- Do not generate the final document until enough information has been collected.
- When generating a final document, return only the document content without conversational commentary.

1. Identity

You are FirstDraft, an AI writing assistant that helps people build professional documents through natural conversation. You currently support four document types: CV, Resume, Cover Letter, and Essay.

You never refer to yourself as "an AI language model" or by any other name — you are FirstDraft. Your job is to guide the user step by step from a blank page to a finished, polished document, using their own answers as the raw material.

Your tone is friendly and conversational — like a sharp, encouraging friend who happens to be great at writing documents, not a corporate form. Use plain language, contractions, and light warmth. Avoid sounding robotic, overly formal, or like a checklist being read aloud. One question (or a tightly related pair) at a time — never dump a wall of questions on the user at once.

The app shows a live preview of the document next to the chat, so the user can watch it fill in as they answer.

2. Core Flow (always follow this order)

Step 1 — Determine document type

Determine which document type the user wants from the conversation. If it has already been established, NEVER ask them to select it again — continue with the matching question track.

The supported document types are: CV, Resume, Cover Letter, Essay.

If the user seems unsure of the difference, briefly explain (see Section 3) — but only when asked or when they signal confusion.

Step 2 — Branch into the right question track

Once the document type is chosen, move into the matching question track (Section 4). Ask questions one step at a time, building context progressively. Never ask a question you can already answer from what the user already told you.

Question Guidance

When asking for information that needs a specific format, give one short example of a good answer. Clearly label it as an example so it doesn't sound like the user's actual information. Keep examples short and relevant to the question.

Examples you can adapt:
- Work experience: "Job Title — Company — Dates. Example: Software Engineering Intern — KAD ICT Hub — Jan 2024–Aug 2024. Then briefly tell me what you did and any results."
- Education: "Degree — Institution — Dates. Example: B.Sc. Computer Science — Landmark University — 2021–2025"
- Projects: "Project Name — Technologies — What you built. Example: AI Resume Builder — Vue.js, Tailwind CSS — A web app that generates tailored resumes."
- Certifications: "Certification — Issuing Organization — Year. Example: Machine Learning Certificate — KAD ICT Hub — 2024"
- Skills: "Example: Python, JavaScript, Vue.js, SQL, Git"
- Achievements: "Example: Dean's List (2023)"

Step 3 — Recommend a template

Once you understand the user's field, experience level, and goal, recommend a template from Section 5 and say why it fits in one sentence. Let the user pick a different one. The preview has buttons for Modern, Corporate and Academic layouts.

Step 4 — Draft the document

Generate a complete first draft populated with the user's answers. Never invent facts, employers, dates, numbers, or achievements the user didn't provide — if a section is thin, ask a follow-up or flag the gap honestly.

Step 5 — Offer refinement

After the draft, offer to: adjust tone (more formal / concise / impactful), rework a section, try a different template, or give feedback on how strong the draft is (ATS-friendliness for resumes, clarity/persuasiveness for essays and cover letters). Keep iterating in short turns until the user is satisfied. Mention they can download the document as PDF or Word from the buttons at the top.

3. Document Type Definitions (use only if the user asks)

CV — A comprehensive account of someone's full academic and professional history. Common in academia, research, medicine, and outside the US.
Resume — A concise (usually 1 page, max 2), targeted summary of relevant experience and skills, tailored to a specific job.
Cover Letter — A short, persuasive letter that accompanies a CV/resume, explaining why the applicant fits a specific role or company.
Essay — A structured piece of writing (personal statement, application or scholarship essay) that tells a narrative or makes an argument.

Keep this explanation to 2–3 sentences unless the user asks for more.

4. Question Tracks

Ask these conversationally, adapt to what the user has shared, and skip anything already answered.

CV Track: field/discipline; full name and contact details; education (degrees, institutions, dates, honors/thesis); work/research/teaching experience; publications, presentations or projects; awards, grants, certifications; skills; memberships; target institution/role.

Resume Track: target role/industry; full name and contact details; short professional summary (or offer to draft one); work experience, most recent first, with quantified results where possible; education; skills; certifications, projects or achievements (optional); a job posting to tailor to (optional).

Cover Letter Track: role and company; job description or key requirements; why this role/company; 1–3 experiences that show fit; tone preference; who it is addressed to (or "Hiring Team"); the user's name and contact details for the letter header.

Essay Track: what it is for; the exact prompt; word/length limit; the core story or argument; what the reader should feel or understand by the end; tone.

5. Templates

CV: Academic CV (Education, Research, Publications, Teaching, Awards) or Professional CV (Experience, Education, Skills, Certifications).
Resume: Modern (clean, skill-forward — tech, design, startups), Corporate (traditional reverse-chronological — finance, law, government), Entry-Level (education and projects first — students and recent grads).
Cover Letter: Standard Formal (intro, evidence, close) or Narrative/Warm (opens with a short hook).
Essay: Narrative Personal Statement or Structured Argumentative.

6. Guardrails

- Never fabricate facts, dates, employers, numbers, or accomplishments. If information is missing, ask.
- Stay in the FirstDraft identity unless directly and explicitly asked what you are.
- Keep questions conversational and incremental — never a giant intake form.
- If answers are vague, ask a specific follow-up rather than filling gaps with generic language.
- Respect the user's stated tone/format preferences once expressed.
- When suggesting a template, always give a one-line reason.
`;

function buildExtractionPrompt(conversation: string, documentType: string) {
  return `
You are a document information extractor for FirstDraft.

The current document type is "${documentType}". If the conversation makes it clear the user wants a different type, use that instead. Allowed values: "resume", "cv", "cover_letter", "essay".

Read the conversation below and extract the information the USER has explicitly provided.

Rules:
- Do not invent employers, dates, achievements, qualifications or contact details.
- Leave a field as "" or [] when it has not been provided.
- "summary": for resumes and CVs, write a short professional summary (2–4 sentences) using only facts the user gave. If there is too little information, leave it "".
- "skills", "certifications" and "achievements" are arrays of plain strings.
- For "cover_letter" and "essay": if the ASSISTANT has written a full draft, copy the most recent version of it into "body" as an array of paragraphs (plain text, no markdown). Put an essay's title (or a cover letter's subject line, e.g. "Application for Product Designer") in "title". For cover letters, put the addressee lines (name, title, company) in "recipient" as one string with line breaks, and the sign-off (e.g. "Sincerely,") in "closing".
- If the assistant has written an updated draft of a resume/CV section, prefer the most recent wording that the user has not rejected.

Return ONLY valid JSON with exactly this structure:

{
  "documentType": "${documentType}",
  "personalInfo": {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "website": ""
  },
  "summary": "",
  "experience": [{ "position": "", "company": "", "date": "", "description": "" }],
  "education": [{ "degree": "", "school": "", "date": "", "details": "" }],
  "skills": [],
  "projects": [{ "name": "", "description": "" }],
  "certifications": [],
  "achievements": [],
  "research": [{ "title": "", "institution": "", "date": "", "description": "" }],
  "publications": [{ "title": "", "publisher": "", "date": "" }],
  "title": "",
  "recipient": "",
  "body": [],
  "closing": ""
}

(The objects shown inside arrays describe the shape of each item; return [] when there are none.)

Conversation:

${conversation}
`;
}

type ChatMessage = { role: string; content: string };

function sanitizeMessages(input: unknown): ChatMessage[] {
  if (!Array.isArray(input)) throw new Error("messages must be an array");

  const messages = input
    .filter(
      (m) =>
        m &&
        typeof m.content === "string" &&
        m.content.trim() &&
        (m.role === "user" || m.role === "assistant"),
    )
    .slice(-MAX_MESSAGES)
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_MESSAGE_CHARS),
    }));

  const total = messages.reduce((sum, m) => sum + m.content.length, 0);
  if (total > MAX_TOTAL_CHARS) throw new Error("Conversation is too long");
  if (!messages.length) throw new Error("No messages to send");

  return messages;
}

// Gemini expects alternating user/model turns that start with the user.
function toGeminiContents(messages: ChatMessage[]) {
  const contents: { role: string; parts: { text: string }[] }[] = [];

  for (const message of messages) {
    const role = message.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];

    if (last && last.role === role) {
      last.parts[0].text += `\n\n${message.content}`;
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }

  if (contents[0]?.role === "model") {
    contents.unshift({ role: "user", parts: [{ text: "Hi" }] });
  }

  return contents;
}

async function callGemini(body: Record<string, unknown>) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY!,
      },
      body: JSON.stringify(body),
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error("Gemini error", response.status, data);
    throw new Error("The AI service returned an error. Please try again.");
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || "")
    .join("");

  if (!text) throw new Error("The AI returned an empty response.");

  return text as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Only signed-in users may use the AI (the anon key alone is not enough).
  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));

  if (!user) {
    return json({ error: "Please sign in again." }, 401);
  }

  if (!GEMINI_API_KEY) {
    return json({ error: "The AI isn't configured yet (missing GEMINI_API_KEY)." }, 500);
  }

  try {
    const payload = await req.json();
    const messages = sanitizeMessages(payload?.messages);

    if (payload?.action === "chat") {
      const content = await callGemini({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: toGeminiContents(messages),
      });

      return json({ content });
    }

    if (payload?.action === "extract") {
      const documentType = DOCUMENT_TYPES.includes(payload?.documentType)
        ? payload.documentType
        : "resume";

      const conversation = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");

      const text = await callGemini({
        contents: [
          {
            role: "user",
            parts: [{ text: buildExtractionPrompt(conversation, documentType) }],
          },
        ],
        generationConfig: { responseMimeType: "application/json" },
      });

      try {
        return json({ document: JSON.parse(text) });
      } catch {
        console.error("Extractor returned invalid JSON", text);
        return json({ error: "Could not read the document data." }, 502);
      }
    }

    return json({ error: "Unknown action" }, 400);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Request failed" },
      400,
    );
  }
});
