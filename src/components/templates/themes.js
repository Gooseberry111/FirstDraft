// Document designs: a style (layout/typography) plus an accent colour.
// Saved on the draft's `template` column as "style:accent", e.g. "sidebar:ocean".

export const ACCENTS = [
  { id: "violet", label: "Violet", hex: "#6a3ef0" },
  { id: "indigo", label: "Indigo", hex: "#3446c8" },
  { id: "ocean", label: "Ocean", hex: "#0e7490" },
  { id: "emerald", label: "Emerald", hex: "#0f7a55" },
  { id: "rose", label: "Rose", hex: "#c0265e" },
  { id: "crimson", label: "Crimson", hex: "#b42318" },
  { id: "amber", label: "Amber", hex: "#b45309" },
  { id: "graphite", label: "Graphite", hex: "#334155" },
];

export const RESUME_STYLES = [
  { id: "modern", label: "Modern" },
  { id: "sidebar", label: "Sidebar" },
  { id: "bold", label: "Bold" },
  { id: "minimal", label: "Minimal" },
  { id: "executive", label: "Executive" },
  { id: "corporate", label: "Classic" },
  { id: "academic", label: "Academic" },
];

export const LETTER_STYLES = [
  { id: "modern", label: "Modern" },
  { id: "bold", label: "Bold" },
  { id: "classic", label: "Classic" },
];

export const ESSAY_STYLES = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
];

export function stylesFor(documentType) {
  if (documentType === "cover_letter") return LETTER_STYLES;
  if (documentType === "essay") return ESSAY_STYLES;
  return RESUME_STYLES;
}

export function defaultStyle(documentType) {
  if (documentType === "cv") return "academic";
  return stylesFor(documentType)[0].id;
}

export function parseDesign(value, documentType) {
  const [style, accent] = String(value || "").split(":");
  const styles = stylesFor(documentType);
  return {
    style: styles.some((s) => s.id === style) ? style : defaultStyle(documentType),
    accent: ACCENTS.some((a) => a.id === accent) ? accent : ACCENTS[0].id,
  };
}

export const formatDesign = ({ style, accent }) => `${style}:${accent}`;

// ---- colour helpers ----
const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (hex, target, amount) => {
  const a = toRgb(hex);
  const b = toRgb(target);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
};

export function accentHex(accentId) {
  return (ACCENTS.find((a) => a.id === accentId) || ACCENTS[0]).hex;
}

// CSS variables used by the templates (`text-[color:var(--accent)]` etc.).
export function accentVars(accentId) {
  const hex = accentHex(accentId);
  return {
    "--accent": hex,
    "--accent-ink": mix(hex, "#000000", 0.28),
    "--accent-soft": mix(hex, "#ffffff", 0.78),
    "--accent-tint": mix(hex, "#ffffff", 0.92),
    "--accent-line": mix(hex, "#ffffff", 0.6),
  };
}

// Shown in the style picker before the user's own document has content.
export const SAMPLE_RESUME = {
  documentType: "resume",
  personalInfo: {
    name: "Alex Morgan",
    email: "alex@email.com",
    phone: "+1 555 0142",
    location: "Austin, TX",
    linkedin: "linkedin.com/in/alexm",
    website: "",
  },
  summary:
    "Product designer with 5 years of experience turning complex problems into simple, delightful experiences for millions of users.",
  experience: [
    {
      position: "Senior Product Designer",
      company: "Northwind",
      date: "2022 - Present",
      description: "Led the redesign of the mobile app, lifting retention by 18%\nBuilt and maintained the company design system",
    },
    {
      position: "Product Designer",
      company: "Bluebird Labs",
      date: "2019 - 2022",
      description: "Shipped 12 features across web and mobile\nRan weekly user research sessions",
    },
  ],
  education: [{ degree: "BA Interaction Design", school: "University of Texas", date: "2015 - 2019", details: "" }],
  skills: ["Figma", "Prototyping", "User research", "Design systems", "HTML/CSS"],
  projects: [],
  certifications: ["Google UX Design Certificate"],
  achievements: ["Webby Award nominee, 2023"],
  research: [],
  publications: [],
  title: "",
  recipient: "",
  body: [],
  closing: "",
};

export const SAMPLE_LETTER = {
  ...SAMPLE_RESUME,
  documentType: "cover_letter",
  title: "Application for Senior Product Designer",
  recipient: "Hiring Team\nNorthwind",
  body: [
    "Dear Hiring Team,",
    "I'm excited to apply for the Senior Product Designer role. Over the past five years I've helped teams turn complex problems into simple, delightful products.",
    "At Northwind I led a redesign that lifted retention by 18%, and I'd love to bring that same focus on outcomes to your team.",
    "Thanks for reading. I'd love the chance to talk.",
  ],
  closing: "Kind regards,",
};

export const SAMPLE_ESSAY = {
  ...SAMPLE_RESUME,
  documentType: "essay",
  title: "What the Night Shift Taught Me",
  body: [
    "The first time I closed the café alone, I learned that responsibility is quiet. Nobody watches you mop the floor at midnight, but everyone notices when it isn't done.",
    "Over two years of late shifts I learned to plan, to listen, and to stay calm when things went wrong. I still lean on those lessons every week.",
    "Those nights shaped how I want to study and work: carefully, generously, and with pride in the unseen parts of the job.",
  ],
};

export function sampleFor(documentType) {
  if (documentType === "cover_letter") return SAMPLE_LETTER;
  if (documentType === "essay") return SAMPLE_ESSAY;
  return { ...SAMPLE_RESUME, documentType };
}
