// Parses JSON that is still being streamed, e.g. `{"reply":"Hel` → { reply: "Hel" }.
// Closes any open string/array/object; if the tail is an incomplete key or
// value, it is trimmed back to the last comma and retried.
function close(text) {
  const stack = [];
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }

  let out = text;
  if (inString) {
    if (escaped) out = out.slice(0, -1);
    out = out.replace(/\\u[0-9a-fA-F]{0,3}$/, "") + '"';
  }
  out = out.replace(/[\s,:]+$/, "");
  return out + stack.reverse().map((c) => (c === "{" ? "}" : "]")).join("");
}

export function parsePartialJson(text) {
  let candidate = text.trim();
  for (let attempt = 0; attempt < 6 && candidate; attempt++) {
    try {
      return JSON.parse(close(candidate));
    } catch {
      const cut = candidate.lastIndexOf(",");
      if (cut <= 0) return null;
      candidate = candidate.slice(0, cut);
    }
  }
  return null;
}
