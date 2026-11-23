import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { normalizeDocument } from "@/services/documentBuilder";

// All AI calls go through the `firstdraft-ai` Supabase Edge Function so the
// Gemini API key never reaches the browser.
// See supabase/functions/firstdraft-ai/index.ts.

const FUNCTION_NAME = "firstdraft-ai";

async function callAI(body) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body,
  });

  if (error) {
    let message = "Couldn't reach FirstDraft's AI. Please try again.";

    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      if (details?.error) message = details.error;
    }

    throw new Error(message);
  }

  if (data?.error) throw new Error(data.error);

  return data;
}

function toPayload(messages) {
  return messages
    .filter((m) => !m.pending && !m.failed && m.content?.trim())
    .map(({ role, content }) => ({ role, content }));
}

export async function sendToAI(messages) {
  const data = await callAI({
    action: "chat",
    messages: toPayload(messages),
  });

  return { role: "assistant", content: data.content };
}

export async function extractDocument(messages, documentType = "resume") {
  const data = await callAI({
    action: "extract",
    documentType,
    messages: toPayload(messages),
  });

  return normalizeDocument(data.document);
}
