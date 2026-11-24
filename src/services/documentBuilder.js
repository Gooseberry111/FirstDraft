export const DOCUMENT_TYPES = {
  resume: "Resume",
  cv: "CV",
  cover_letter: "Cover Letter",
  essay: "Essay",
};

export function isProseDocument(documentType) {
  return documentType === "cover_letter" || documentType === "essay";
}

export function createEmptyDocument(documentType = "resume") {
  return {
    documentType,
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      website: "",
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    achievements: [],
    research: [],
    publications: [],
    // Cover letters and essays
    title: "",
    recipient: "",
    body: [],
    closing: "",
  };
}

const text = (value) => {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join("\n");
  if (typeof value === "object") return Object.values(value).map(text).join(" ");
  return String(value).trim();
};

const textList = (value) => {
  if (typeof value === "string") {
    return value
      .split(/\n|,(?![^(]*\))/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
};

const objectList = (value, keys) =>
  (Array.isArray(value) ? value : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => Object.fromEntries(keys.map((key) => [key, text(item[key])])))
    .filter((item) => keys.some((key) => item[key]));

// Coerces whatever the AI (or an old saved draft) returns into the exact shape
// the templates expect, so a malformed response can never crash the preview.
export function normalizeDocument(raw, fallbackType = "resume") {
  const source = raw && typeof raw === "object" ? raw : {};
  const documentType = DOCUMENT_TYPES[source.documentType]
    ? source.documentType
    : DOCUMENT_TYPES[fallbackType]
      ? fallbackType
      : "resume";

  const doc = createEmptyDocument(documentType);
  const info = source.personalInfo || {};

  for (const key of Object.keys(doc.personalInfo)) {
    doc.personalInfo[key] = text(info[key]);
  }

  doc.summary = text(source.summary);
  doc.experience = objectList(source.experience, [
    "position",
    "company",
    "date",
    "description",
  ]);
  doc.education = objectList(source.education, [
    "degree",
    "school",
    "date",
    "details",
  ]);
  doc.projects = objectList(source.projects, ["name", "description"]);
  doc.research = objectList(source.research, [
    "title",
    "institution",
    "date",
    "description",
  ]);
  doc.publications = objectList(source.publications, [
    "title",
    "publisher",
    "date",
  ]);
  doc.skills = textList(source.skills);
  doc.certifications = textList(source.certifications);
  doc.achievements = textList(source.achievements);

  doc.title = text(source.title);
  doc.recipient = text(source.recipient);
  doc.closing = text(source.closing);
  doc.body = (
    typeof source.body === "string"
      ? source.body.split(/\n\s*\n/)
      : Array.isArray(source.body)
        ? source.body.map(text)
        : []
  )
    .map((p) => p.trim())
    .filter(Boolean);

  return doc;
}

export function isDocumentEmpty(doc) {
  if (!doc) return true;
  const hasInfo = Object.values(doc.personalInfo || {}).some(Boolean);
  return (
    !hasInfo &&
    !doc.summary &&
    !doc.title &&
    !doc.body?.length &&
    ![
      "experience",
      "education",
      "skills",
      "projects",
      "certifications",
      "achievements",
      "research",
      "publications",
    ].some((key) => doc[key]?.length)
  );
}

// Splits multi-line descriptions into bullet points for display/export.
export function toLines(value) {
  return text(value)
    .split("\n")
    .map((line) => line.replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
}

const isEmptyValue = (value) =>
  value == null ||
  (typeof value === "string" && !value.trim()) ||
  (Array.isArray(value) && value.length === 0);

// The AI sends only the fields that changed. Empty values are treated as
// "no change" so a half-filled answer can never wipe existing content.
export function applyDocumentPatch(base, patch) {
  if (!patch || typeof patch !== "object") return normalizeDocument(base, base?.documentType);

  const merged = { ...base, personalInfo: { ...(base?.personalInfo || {}) } };
  for (const [key, value] of Object.entries(patch)) {
    if (key === "personalInfo" && value && typeof value === "object") {
      for (const [field, fieldValue] of Object.entries(value)) {
        if (!isEmptyValue(fieldValue)) merged.personalInfo[field] = fieldValue;
      }
    } else if (key === "documentType") {
      if (DOCUMENT_TYPES[value]) merged.documentType = value;
    } else if (key in merged && !isEmptyValue(value)) {
      merged[key] = value;
    }
  }
  return normalizeDocument(merged, base?.documentType);
}
