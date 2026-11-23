const escapeHtml = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const inline = (value) =>
  value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");

// Renders the small subset of Markdown the AI uses (paragraphs, bullet and
// numbered lists, bold, italics, inline code). Input is HTML-escaped first,
// so the result is safe to use with v-html.
export function formatMessage(content = "") {
  const lines = escapeHtml(content).split(/\r?\n/);
  const html = [];
  let list = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) html.push(`<p>${paragraph.map(inline).join("<br>")}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (list) html.push(`</${list}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-*•])\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    const heading = line.match(/^#{1,6}\s+(.*)$/);

    if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? "ul" : "ol";
      if (list !== tag) {
        closeList();
        html.push(`<${tag}>`);
        list = tag;
      }
      html.push(`<li>${inline((bullet || numbered)[1])}</li>`);
    } else if (!line) {
      flushParagraph();
      closeList();
    } else if (heading) {
      flushParagraph();
      closeList();
      html.push(`<p><strong>${inline(heading[1])}</strong></p>`);
    } else {
      closeList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  closeList();
  return html.join("");
}

export function relativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (seconds < 60) return "just now";
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), "minute");
  if (seconds < 86400) return rtf.format(-Math.round(seconds / 3600), "hour");
  if (seconds < 604800) return rtf.format(-Math.round(seconds / 86400), "day");

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function safeFileName(value, fallback = "FirstDraft") {
  const name = (value || "").replace(/[\\/:*?"<>|]+/g, "").trim();
  return name || fallback;
}
