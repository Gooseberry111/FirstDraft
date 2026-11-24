import { FileText, GraduationCap, Mail, PenLine } from "lucide-vue-next";

// Visual identity for each document type (icon + colours), used across the app.
export const DOC_TYPE_STYLES = {
  resume: {
    icon: FileText,
    tile: "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_8px_18px_-8px_rgb(109_40_217/0.7)]",
    soft: "bg-violet-100 text-violet-700",
    text: "1–2 pages, tailored to a job",
  },
  cv: {
    icon: GraduationCap,
    tile: "bg-gradient-to-br from-sky-400 to-blue-600 shadow-[0_8px_18px_-8px_rgb(2_132_199/0.7)]",
    soft: "bg-sky-100 text-sky-700",
    text: "Full academic & career history",
  },
  cover_letter: {
    icon: Mail,
    tile: "bg-gradient-to-br from-pink-500 to-rose-600 shadow-[0_8px_18px_-8px_rgb(225_29_72/0.7)]",
    soft: "bg-rose-100 text-rose-700",
    text: "To go with a job application",
  },
  essay: {
    icon: PenLine,
    tile: "bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_8px_18px_-8px_rgb(234_88_12/0.7)]",
    soft: "bg-amber-100 text-amber-700",
    text: "Personal statement, scholarship…",
  },
};

export const docTypeStyle = (type) => DOC_TYPE_STYLES[type] || DOC_TYPE_STYLES.resume;
