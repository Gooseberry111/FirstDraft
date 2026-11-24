// Extracts plain text from an uploaded CV in the browser (nothing is uploaded
// except the extracted text). The parsers are loaded only when needed.

export const ACCEPTED_FILES = ".pdf,.docx,.txt,.md";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

async function pdfText(file) {
  const pdfjs = await import("pdfjs-dist/build/pdf.min.mjs");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let n = 1; n <= Math.min(pdf.numPages, 10); n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    // Rebuild lines from positioned text so bullets/sections stay separate.
    let lastY = null;
    let line = "";
    const lines = [];
    for (const item of content.items) {
      const y = Math.round(item.transform?.[5] ?? 0);
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = "";
      }
      line += item.str + (item.hasEOL ? "\n" : "");
      lastY = y;
    }
    lines.push(line.trim());
    pages.push(lines.filter(Boolean).join("\n"));
  }
  return pages.join("\n\n");
}

async function docxText(file) {
  const mammoth = await import("mammoth/mammoth.browser.min.js");
  const lib = mammoth.default || mammoth;
  const { value } = await lib.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

export async function extractText(file) {
  if (!file) throw new Error("No file selected.");
  if (file.size > MAX_FILE_BYTES) throw new Error("That file is over 10 MB. Please choose a smaller one.");

  const name = file.name.toLowerCase();
  let text = "";
  if (name.endsWith(".pdf")) text = await pdfText(file);
  else if (name.endsWith(".docx")) text = await docxText(file);
  else if (name.endsWith(".txt") || name.endsWith(".md")) text = await file.text();
  else if (name.endsWith(".doc")) throw new Error("Old .doc files aren't supported. Save it as .docx or PDF and try again.");
  else throw new Error("Please upload a PDF, Word (.docx) or text file.");

  text = text.replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 40) {
    throw new Error(
      "We couldn't find any text in that file. If it's a scanned image, try exporting it as a text-based PDF or Word file.",
    );
  }
  return text;
}
