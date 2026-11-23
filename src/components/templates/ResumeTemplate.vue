<script setup>
import { computed } from "vue";
import Editable from "./Editable.vue";
import EntryText from "./EntryText.vue";
import EditControls from "./EditControls.vue";
import { useEditing } from "./editing";

// One resume/CV template with three visual styles: modern, corporate, academic.
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
const contactFields = computed(() =>
  CONTACT_FIELDS.filter((f) => edit || info.value[f.key]),
);

// Entry-style sections share one layout.
const ENTRIES = {
  experience: {
    title: "position",
    subtitle: "company",
    text: "description",
    ph: { title: "Job title", subtitle: "Company", date: "Dates" },
    noun: "Job",
  },
  education: {
    title: "degree",
    subtitle: "school",
    text: "details",
    ph: { title: "Degree", subtitle: "School / university", date: "Dates" },
    noun: "Education",
  },
  research: {
    title: "title",
    subtitle: "institution",
    text: "description",
    ph: { title: "Research title", subtitle: "Institution", date: "Dates" },
    noun: "Research",
  },
  projects: {
    title: "name",
    text: "description",
    ph: { title: "Project name" },
    noun: "Project",
  },
};

const LISTS = {
  skills: { ph: "Skill", noun: "Skill" },
  certifications: { ph: "Certification", noun: "Certification" },
  achievements: { ph: "Achievement", noun: "Achievement" },
};

const STYLES = {
  modern: {
    root: "font-sans text-[13.5px] leading-relaxed text-gray-700",
    header: "",
    name: "text-[30px] font-bold leading-tight tracking-tight text-gray-900",
    contact: "mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px] text-gray-500",
    rule: "mt-5 h-[3px] w-12 rounded-full bg-[#6a43ee]",
    section: "mt-7",
    heading: "mb-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-[#5833d6]",
    entryTitle: "font-semibold text-gray-900",
    entrySub: "text-[13px] font-medium text-gray-500",
    date: "shrink-0 text-[12.5px] text-gray-500",
    order: ["summary", "skills", "experience", "projects", "education", "research", "publications", "certifications", "achievements"],
  },
  corporate: {
    root: "font-serif text-[14px] leading-relaxed text-gray-800",
    header: "border-b-2 border-gray-900 pb-4 text-center",
    name: "text-[27px] font-bold uppercase tracking-[0.08em] text-gray-900",
    contact: "mt-2 flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-[12.5px] text-gray-600",
    rule: "",
    section: "mt-6",
    heading: "mb-2 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900",
    entryTitle: "font-bold text-gray-900",
    entrySub: "italic text-gray-700",
    date: "shrink-0 text-[13px] text-gray-600",
    order: ["summary", "experience", "education", "projects", "research", "publications", "skills", "certifications", "achievements"],
  },
  academic: {
    root: "font-serif text-[14px] leading-relaxed text-gray-800",
    header: "pb-1",
    name: "text-[30px] font-semibold text-gray-900",
    contact: "mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12.5px] text-gray-600",
    rule: "",
    section: "mt-6 border-t border-gray-300 pt-4",
    heading: "mb-2 text-[15px] font-semibold text-gray-900",
    entryTitle: "font-semibold text-gray-900",
    entrySub: "italic text-gray-600",
    date: "text-[13px] text-gray-500",
    order: ["summary", "education", "research", "publications", "experience", "projects", "achievements", "certifications", "skills"],
  },
};

const TITLES = {
  modern: { summary: "Summary" },
  corporate: { summary: "Professional Profile", experience: "Professional Experience" },
  academic: { summary: "Profile", research: "Research Experience", achievements: "Awards & Honours", experience: "Professional Experience" },
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
</script>

<template>
  <article :class="s.root">
    <!-- Header -->
    <header :class="['doc-heading group/entry', s.header]">
      <Editable tag="h1" :class="s.name" :path="['personalInfo', 'name']" :value="info.name" placeholder="Your Name">
      </Editable>
      <p v-if="contactFields.length" :class="s.contact">
        <template v-for="field in contactFields" :key="field.key">
          <Editable
            v-if="info[field.key]"
            class="break-all"
            :path="['personalInfo', field.key]"
            :value="info[field.key]"
            :placeholder="field.placeholder"
          />
          <Editable
            v-else
            class="hidden group-hover/entry:inline focus:inline"
            :path="['personalInfo', field.key]"
            value=""
            :placeholder="`+ ${field.placeholder}`"
          />
        </template>
      </p>
      <div v-if="s.rule" :class="s.rule" />
    </header>

    <template v-for="key in s.order" :key="key">
      <section v-if="visible(key)" :class="['group/section', s.section]">
        <h2 :class="['doc-heading', s.heading]">{{ title(key) }}</h2>

        <!-- Summary -->
        <Editable
          v-if="key === 'summary'"
          tag="p"
          multiline
          :path="['summary']"
          :value="document.summary"
          placeholder="A short professional summary"
        />

        <!-- Entries -->
        <template v-else-if="ENTRIES[key]">
          <div
            v-for="(item, i) in document[key]"
            :key="i"
            class="doc-entry group/entry relative"
            :class="[
              i ? 'mt-4' : 'mt-1',
              variant === 'academic' && ENTRIES[key].ph.date ? 'grid grid-cols-[96px_1fr] gap-4' : '',
            ]"
          >
            <Editable
              v-if="variant === 'academic' && ENTRIES[key].ph.date"
              :class="s.date"
              :path="[key, i, 'date']"
              :value="item.date"
              :placeholder="ENTRIES[key].ph.date"
            />
            <div>
              <div class="flex items-baseline justify-between gap-4">
                <Editable
                  tag="h3"
                  :class="s.entryTitle"
                  :path="[key, i, ENTRIES[key].title]"
                  :value="item[ENTRIES[key].title]"
                  :placeholder="ENTRIES[key].ph.title"
                />
                <Editable
                  v-if="variant !== 'academic' && ENTRIES[key].ph.date"
                  :class="s.date"
                  :path="[key, i, 'date']"
                  :value="item.date"
                  :placeholder="ENTRIES[key].ph.date"
                />
              </div>
              <Editable
                v-if="ENTRIES[key].subtitle"
                tag="p"
                :class="s.entrySub"
                :path="[key, i, ENTRIES[key].subtitle]"
                :value="item[ENTRIES[key].subtitle]"
                :placeholder="ENTRIES[key].ph.subtitle"
              />
              <div class="mt-1">
                <EntryText :text="item[ENTRIES[key].text]" :path="[key, i, ENTRIES[key].text]" />
              </div>
            </div>
            <EditControls mode="remove" :section="key" :index="i" :label="ENTRIES[key].noun" />
          </div>
          <EditControls mode="add" :section="key" :label="`Add ${ENTRIES[key].noun.toLowerCase()}`" />
        </template>

        <!-- Publications -->
        <template v-else-if="key === 'publications'">
          <component
            :is="variant === 'academic' ? 'ol' : 'ul'"
            :class="variant === 'academic' ? 'list-decimal space-y-1.5 pl-6' : 'space-y-1.5'"
          >
            <li v-for="(pub, i) in document.publications" :key="i" class="doc-entry group/entry relative">
              <Editable :class="variant === 'modern' && 'font-medium text-gray-900'" :path="['publications', i, 'title']" :value="pub.title" placeholder="Title" />
              <span v-if="pub.publisher || edit">, </span>
              <Editable class="italic" :path="['publications', i, 'publisher']" :value="pub.publisher" placeholder="Publisher" />
              <span v-if="pub.date || edit"> (</span><Editable :path="['publications', i, 'date']" :value="pub.date" placeholder="Year" /><span v-if="pub.date || edit">)</span>
              <EditControls mode="remove" section="publications" :index="i" label="Publication" />
            </li>
          </component>
          <EditControls mode="add" section="publications" label="Add publication" />
        </template>

        <!-- Skills as chips (modern) -->
        <template v-else-if="key === 'skills' && variant === 'modern'">
          <ul class="flex flex-wrap gap-1.5">
            <li
              v-for="(skill, i) in document.skills"
              :key="i"
              class="rounded-md bg-[#f3f0ff] px-2 py-0.5 text-[12.5px] font-medium text-[#4527b8]"
            >
              <Editable :path="['skills', i]" :value="skill" placeholder="Skill" />
            </li>
          </ul>
          <EditControls mode="add" section="skills" label="Add skill" />
        </template>

        <!-- Skills as text (corporate / academic) -->
        <template v-else-if="key === 'skills'">
          <p>
            <template v-for="(skill, i) in document.skills" :key="i">
              <span v-if="i" aria-hidden="true">{{ variant === "corporate" ? " · " : ", " }}</span>
              <Editable :path="['skills', i]" :value="skill" placeholder="Skill" />
            </template>
          </p>
          <EditControls mode="add" section="skills" label="Add skill" />
        </template>

        <!-- Bullet lists -->
        <template v-else-if="LISTS[key]">
          <ul class="list-disc space-y-1 pl-5 marker:text-gray-400">
            <li v-for="(item, i) in document[key]" :key="i" class="doc-entry">
              <Editable :path="[key, i]" :value="item" :placeholder="LISTS[key].ph" />
            </li>
          </ul>
          <EditControls mode="add" :section="key" :label="`Add ${LISTS[key].noun.toLowerCase()}`" />
        </template>
      </section>
    </template>
  </article>
</template>
