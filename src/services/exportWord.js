import { isProseDocument, toLines } from "@/services/documentBuilder";
import { safeFileName } from "@/utils/format";

// `docx` is large, so it is loaded only when the user actually exports.
export async function exportWord(document, fileName) {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Packer,
    Paragraph,
    TabStopType,
    TextRun,
  } = await import("docx");

  const FONT = "Calibri";
  const RIGHT_TAB = 9638; // A4 text width in twips with 2cm margins
  const info = document.personalInfo || {};
  const children = [];

  const contactLine = ["email", "phone", "location", "linkedin", "website"]
    .map((key) => info[key])
    .filter(Boolean)
    .join("  |  ");

  const heading = (title) =>
    new Paragraph({
      keepNext: true,
      spacing: { before: 280, after: 100 },
      border: {
        bottom: { style: BorderStyle.SINGLE, color: "9CA3AF", size: 6, space: 2 },
      },
      children: [
        new TextRun({ text: title.toUpperCase(), bold: true, size: 21, color: "4C1D95" }),
      ],
    });

  const paragraph = (text, options = {}) =>
    new Paragraph({
      spacing: { after: 80 },
      ...options,
      children: [new TextRun({ text, ...(options.run || {}) })],
    });

  // "Title ............ Date" on one line using a right-aligned tab stop.
  const titleRow = (left, right) =>
    new Paragraph({
      keepNext: true,
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      spacing: { before: 140 },
      children: [
        new TextRun({ text: left || "", bold: true }),
        ...(right ? [new TextRun({ text: `\t${right}`, color: "6B7280" })] : []),
      ],
    });

  const subtitle = (text) =>
    text
      ? [
          new Paragraph({
            keepNext: true,
            spacing: { after: 40 },
            children: [new TextRun({ text, italics: true, color: "4B5563" })],
          }),
        ]
      : [];

  const description = (text) => {
    const lines = toLines(text);
    if (lines.length <= 1) return lines.map((line) => paragraph(line));
    return lines.map(
      (line) => new Paragraph({ text: line, bullet: { level: 0 }, spacing: { after: 40 } }),
    );
  };

  const bulletList = (items) =>
    items.map((item) => new Paragraph({ text: item, bullet: { level: 0 }, spacing: { after: 40 } }));

  // ---------- Header ----------
  if (document.documentType !== "essay") {
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: info.name || "Your Name", bold: true, size: 36 })],
      }),
    );
    if (contactLine) {
      children.push(paragraph(contactLine, { spacing: { after: 200 }, run: { size: 19, color: "4B5563" } }));
    }
  }

  if (isProseDocument(document.documentType)) {
    // ---------- Cover letter / essay ----------
    if (document.documentType === "essay") {
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: document.title || "Untitled Essay", bold: true, size: 32 })],
        }),
      );
      if (info.name) {
        children.push(paragraph(info.name, { alignment: AlignmentType.CENTER, spacing: { after: 360 } }));
      }
    } else {
      children.push(
        paragraph(
          new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }),
          { spacing: { before: 200, after: 200 } },
        ),
      );
      for (const line of (document.recipient || "").split("\n").filter(Boolean)) {
        children.push(paragraph(line, { spacing: { after: 0 } }));
      }
      if (document.title) {
        children.push(paragraph(`Re: ${document.title}`, { spacing: { before: 240 }, run: { bold: true } }));
      }
    }

    for (const text of document.body || []) {
      children.push(
        paragraph(text, {
          spacing: { before: 200, line: document.documentType === "essay" ? 360 : 276 },
          indent: document.documentType === "essay" ? { firstLine: 567 } : undefined,
        }),
      );
    }

    if (document.documentType === "cover_letter" && document.body?.length) {
      children.push(paragraph(document.closing || "Sincerely,", { spacing: { before: 360, after: 480 } }));
      children.push(paragraph(info.name || "", { run: { bold: true } }));
    }
  } else {
    // ---------- Resume / CV ----------
    if (document.summary) {
      children.push(heading("Summary"), paragraph(document.summary));
    }

    if (document.experience?.length) {
      children.push(heading("Experience"));
      for (const job of document.experience) {
        children.push(titleRow(job.position, job.date), ...subtitle(job.company), ...description(job.description));
      }
    }

    if (document.education?.length) {
      children.push(heading("Education"));
      for (const edu of document.education) {
        children.push(titleRow(edu.degree, edu.date), ...subtitle(edu.school), ...description(edu.details));
      }
    }

    if (document.research?.length) {
      children.push(heading("Research"));
      for (const item of document.research) {
        children.push(titleRow(item.title, item.date), ...subtitle(item.institution), ...description(item.description));
      }
    }

    if (document.publications?.length) {
      children.push(heading("Publications"));
      children.push(
        ...bulletList(
          document.publications.map((pub) =>
            [pub.title, pub.publisher, pub.date].filter(Boolean).join(", "),
          ),
        ),
      );
    }

    if (document.projects?.length) {
      children.push(heading("Projects"));
      for (const project of document.projects) {
        children.push(titleRow(project.name), ...description(project.description));
      }
    }

    if (document.skills?.length) {
      children.push(heading("Skills"), paragraph(document.skills.join(" • ")));
    }

    if (document.certifications?.length) {
      children.push(heading("Certifications"), ...bulletList(document.certifications));
    }

    if (document.achievements?.length) {
      children.push(heading("Achievements"), ...bulletList(document.achievements));
    }
  }

  const doc = new Document({
    creator: "FirstDraft",
    title: fileName || info.name || "FirstDraft",
    styles: {
      default: { document: { run: { font: FONT, size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(fileName || info.name)}.docx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
