import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { normalizeDocument } from "@/services/documentBuilder";

// All AI calls go through the `firstdraft-ai` Supabase Edge Function so the
// Gemini API key never reaches the browser. One call per user message returns
// the reply, the updated document and quick-reply suggestions together.
// See supabase/functions/firstdraft-ai/index.ts.

const FUNCTION_NAME = "firstdraft-ai";
const HISTORY_MESSAGES = 10;

export async function chatTurn(messages, document) {
  const history = messages
    .filter((m) => !m.pending && !m.failed && m.content?.trim())
    .slice(-HISTORY_MESSAGES)
    .map(({ role, content }) => ({ role, content }));

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action: "turn", messages: history, document },
  });

  if (error) {
    let message = "Couldn't reach FirstDraft. Check your connection and try again.";
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      if (details?.error) message = details.error;
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(data.error);

  return {
    reply: data.reply?.trim() || "Done — take a look at the preview.",
    document: data.document ? normalizeDocument(data.document, document?.documentType) : null,
    suggestions: data.suggestions || [],
    usage: data.usage || null,
  };
}
