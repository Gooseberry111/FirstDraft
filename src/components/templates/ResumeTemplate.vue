<script setup>
import { computed } from "vue";
import Editable from "./Editable.vue";
import ResumeSection from "./ResumeSection.vue";
import { useEditing } from "./editing";

// Resume/CV template with seven styles. Colours come from the accent CSS
// variables set by DocumentRenderer, so every style works with every accent.
const props = defineProps({
  document: { type: Object, required: true },
  variant: { type: String, default: "modern" },
});

const edit = useEditing();
const info = computed(() => props.document.personalInfo || {});

const CONTACT_FIELDS = [
  { key: "email", placeholder: "Email" },
  { key: "phone", placeholder: "Phone" },
  { key: "location", placeholder: "Location" },
  { key: "linkedin", placeholder: "LinkedIn" },
  { key: "website", placeholder: "Website" },
];
const contactFields = computed(() => CONTACT_FIELDS.filter((f) => edit || info.value[f.key]));

const ALL = ["summary", "experience", "projects", "education", "research", "publications", "skills", "certifications", "achievements"];

const STYLES = {
  modern: {
    header: "left",
    root: "font-doc text-[13.5px] leading-relaxed text-gray-700",
    name: "text-[30px] font-bold leading-tight tracking-tight text-gray-900",
    contact: "mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-gray-500",
    section: "mt-7",
    heading: "mb-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]",
    entryTitle: "font-semibold text-gray-900",
    entrySub: "text-[13px] font-medium text-[color:var(--accent-ink)]",
    date: "shrink-0 text-[12.5px] text-gray-500",
    skills: "chips",
    order: ["summary", "skills", "experience", "projects", "education", "research", "publications", "certifications", "achievements"],
  },
  sidebar: {
    header: "sidebar",
    root: "font-doc text-[13px] leading-relaxed text-gray-700",
    name: "text-[25px] font-bold leading-tight tracking-tight text-[color:var(--accent-ink)]",
    section: "mt-6",
    heading: "mb-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[color:var(--accent)]",
    sideHeading: "mb-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[color:var(--accent-ink)]",
    entryTitle: "font-semibold text-gray-900",
    entrySub: "text-[12.5px] font-medium text-[color:var(--accent-ink)]",
    date: "shrink-0 text-[12px] text-gray-500",
    skills: "chips",
    main: ["summary", "experience", "projects", "research", "publications"],
    side: ["skills", "education", "certifications", "achievements"],
  },
  bold: {
    header: "band",
    root: "font-doc text-[13.5px] leading-relaxed text-gray-700",
    name: "text-[32px] font-extrabold leading-tight tracking-tight text-white",
    contact: "mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-white/85",
    section: "mt-7",
    headingStyle: "bar",
    heading: "mb-2.5 text-[13.5px] font-extrabold uppercase tracking-[0.08em] text-gray-900",
    entryTitle: "font-bold text-gray-900",
    entrySub: "text-[13px] font-semibold text-[color:var(--accent)]",
    date: "shrink-0 rounded bg-[color:var(--accent-tint)] px-2 py-0.5 text-[11.5px] font-semibold text-[color:var(--accent-ink)]",
    skills: "outline",
    order: ["summary", "experience", "skills", "projects", "education", "research", "publications", "certifications", "achievements"],
  },
  minimal: {
    header: "minimal",
    root: "font-doc text-[13px] leading-[1.75] text-gray-600",
    name: "text-[34px] font-light leading-tight tracking-tight text-gray-900",
    contact: "mt-3 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-gray-500",
    section: "mt-8",
    heading: "mb-3 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-gray-400",
    entryTitle: "font-medium text-gray-900",
    entrySub: "text-[12.5px] text-gray-500",
    date: "text-[12px] font-medium text-[color:var(--accent)]",
    dateColumn: true,
    skills: "inline",
    skillSeparator: "  /  ",
    order: ["summary", "experience", "projects", "education", "research", "publications", "skills", "certifications", "achievements"],
  },
  executive: {
    header: "executive",
    root: "font-serif text-[14px] leading-relaxed text-gray-800",
    name: "font-display text-[36px] font-semibold leading-tight text-[color:var(--accent-ink)]",
    contact: "mt-2 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[12.5px] text-gray-600",
    section: "mt-6",
    headingStyle: "lines",
    heading: "mb-3 text-[12px] font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]",
    entryTitle: "font-semibold text-gray-900",
    entrySub: "italic text-gray-600",
    date: "shrink-0 text-[13px] italic text-gray-500",
    skills: "inline",
    skillSeparator: " · ",
    order: ["summary", "experience", "education", "projects", "research", "publications", "skills", "certifications", "achievements"],
  },
  corporate: {
    header: "center",
    root: "font-serif text-[14px] leading-relaxed text-gray-800",
    name: "text-[27px] font-bold uppercase tracking-[0.08em] text-gray-900",
    contact: "mt-2 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[12.5px] text-gray-600",
    section: "mt-6",
    heading: "mb-2 border-b border-[color:var(--accent-line)] pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-[color:var(--accent-ink)]",
    entryTitle: "font-bold text-gray-900",
    entrySub: "italic text-gray-700",
    date: "shrink-0 text-[13px] text-gray-600",
    skills: "inline",
    skillSeparator: " · ",
    order: ["summary", "experience", "education", "projects", "research", "publications", "skills", "certifications", "achievements"],
  },
  academic: {
    header: "academic",
    root: "font-serif text-[14px] leading-relaxed text-gray-800",
    name: "text-[30px] font-semibold leading-tight text-gray-900",
    contact: "mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-gray-600",
    section: "mt-6 border-t border-gray-300 pt-4",
    heading: "mb-2 text-[15px] font-semibold text-[color:var(--accent-ink)]",
    entryTitle: "font-semibold text-gray-900",
    entrySub: "italic text-gray-600",
    date: "text-[13px] text-gray-500",
    dateColumn: true,
    numberedPubs: true,
    skills: "inline",
    skillSeparator: ", ",
    order: ["summary", "education", "research", "publications", "experience", "projects", "achievements", "certifications", "skills"],
  },
};

const TITLES = {
  corporate: { summary: "Professional Profile", experience: "Professional Experience" },
  executive: { summary: "Executive Profile", achievements: "Key Achievements" },
  academic: { summary: "Profile", research: "Research Experience", achievements: "Awards & Honours", experience: "Professional Experience" },
  minimal: { summary: "About" },
};
const DEFAULT_TITLES = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  research: "Research",
  projects: "Projects",
  publications: "Publications",
  skills: "Skills",
  certifications: "Certifications",
  achievements: "Achievements",
};

const s = computed(() => STYLES[props.variant] || STYLES.modern);
const title = (key) => TITLES[props.variant]?.[key] || DEFAULT_TITLES[key];
const visible = (key) =>
  key === "summary"
    ? !!props.document.summary || !!edit?.shown("summary")
    : props.document[key]?.length > 0 || !!edit?.shown(key);

const order = computed(() => (s.value.order || ALL).filter(visible));
const mainSections = computed(() => (s.value.main || []).filter(visible));
const sideSections = computed(() => (s.value.side || []).filter(visible));
</script>

<template>
  <!-- ===== Sidebar layout ===== -->
  <article v-if="s.header === 'sidebar'" :class="s.root">
    <div class="doc-bleed-x doc-bleed-top doc-bleed-bottom grid min-h-[var(--page-h,0px)] grid-cols-[35%_1fr]">
      <aside class="rounded-[var(--band-radius,10px)] bg-[color:var(--accent-tint)] py-[var(--band-py,24px)] pl-[var(--band-px,22px)] pr-6">
        <div class="doc-heading group/entry">
          <Editable tag="h1" :class="s.name" :path="['personalInfo', 'name']" :value="info.name" placeholder="Your Name" />
          <div class="mt-3 h-[3px] w-10 rounded-full bg-[color:var(--accent)]" />
          <ul class="mt-4 space-y-1 text-[12px] text-gray-600">
            <li v-for="field in contactFields" :key="field.key" :class="!info[field.key] && 'hidden group-hover/entry:block'">
              <Editable class="break-all" :path="['personalInfo', field.key]" :value="info[field.key]" :placeholder="`+ ${field.placeholder}`" />
            </li>
          </ul>
        </div>
        <ResumeSection
          v-for="key in sideSections"
          :key="key"
          :section-key="key"
          :title="title(key)"
          :document="document"
          :s="s"
          compact
        />
      </aside>
      <div class="py-[var(--band-py,24px)] pl-8 pr-[var(--page-px,0px)]">
        <ResumeSection
          v-for="(key, i) in mainSections"
          :key="key"
          :section-key="key"
          :title="title(key)"
          :document="document"
          :s="{ ...s, section: i ? s.section : '' }"
        />
      </div>
    </div>
  </article>

  <!-- ===== Single-column layouts ===== -->
  <article v-else :class="s.root">
    <!-- Band header (Bold) -->
    <header
      v-if="s.header === 'band'"
      class="doc-heading doc-bleed-x doc-bleed-top group/entry rounded-[var(--band-radius,10px)] bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-ink)] px-[var(--band-px,28px)] pb-8 pt-[var(--band-py,24px)]"
    >
      <Editable tag="h1" :class="s.name" :path="['personalInfo', 'name']" :value="info.name" placeholder="Your Name" />
      <p v-if="contactFields.length" :class="s.contact">
        <template v-for="field in contactFields" :key="field.key">
          <Editable
            :class="info[field.key] ? 'break-all' : 'hidden group-hover/entry:inline focus:inline'"
            :path="['personalInfo', field.key]"
            :value="info[field.key]"
            :placeholder="`+ ${field.placeholder}`"
          />
        </template>
      </p>
    </header>

    <!-- Other headers -->
    <header
      v-else
      class="doc-heading group/entry"
      :class="{
        'text-center': s.header === 'center' || s.header === 'executive',
        'border-b-2 border-[color:var(--accent-ink)] pb-4': s.header === 'center',
      }"
    >
      <Editable tag="h1" :class="s.name" :path="['personalInfo', 'name']" :value="info.name" placeholder="Your Name" />
      <p v-if="contactFields.length" :class="s.contact">
        <template v-for="field in contactFields" :key="field.key">
          <Editable
            :class="info[field.key] ? 'break-all' : 'hidden group-hover/entry:inline focus:inline'"
            :path="['personalInfo', field.key]"
            :value="info[field.key]"
            :placeholder="`+ ${field.placeholder}`"
          />
        </template>
      </p>
      <div v-if="s.header === 'left'" class="mt-5 h-[3px] w-12 rounded-full bg-[color:var(--accent)]" />
      <div v-else-if="s.header === 'minimal'" class="mt-6 h-px w-full bg-gray-200" />
      <div v-else-if="s.header === 'executive'" class="mt-4 flex items-center gap-2">
        <span class="h-px flex-1 bg-[color:var(--accent-line)]" />
        <span class="h-1.5 w-1.5 rotate-45 bg-[color:var(--accent)]" />
        <span class="h-px flex-1 bg-[color:var(--accent-line)]" />
      </div>
    </header>

    <ResumeSection
      v-for="key in order"
      :key="key"
      :section-key="key"
      :title="title(key)"
      :document="document"
      :s="s"
    />
  </article>
</template>
