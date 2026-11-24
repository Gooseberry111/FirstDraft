<script setup>
import Editable from "./Editable.vue";
import EntryText from "./EntryText.vue";
import EditControls from "./EditControls.vue";
import { useEditing } from "./editing";

// Renders one resume/CV section in the look described by `s` (a style config
// from ResumeTemplate). `compact` is used for narrow sidebar columns.
defineProps({
  sectionKey: { type: String, required: true },
  title: { type: String, required: true },
  document: { type: Object, required: true },
  s: { type: Object, required: true },
  compact: { type: Boolean, default: false },
});

const edit = useEditing();

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
  projects: { title: "name", text: "description", ph: { title: "Project name" }, noun: "Project" },
};

const LISTS = {
  skills: { ph: "Skill", noun: "Skill" },
  certifications: { ph: "Certification", noun: "Certification" },
  achievements: { ph: "Achievement", noun: "Achievement" },
};
</script>

<template>
  <section class="group/section" :class="s.section">
    <!-- Heading -->
    <h2 v-if="s.headingStyle === 'lines'" class="doc-heading flex items-center gap-3" :class="s.heading">
      <span class="h-px flex-1 bg-[color:var(--accent-line)]" />{{ title }}<span class="h-px flex-1 bg-[color:var(--accent-line)]" />
    </h2>
    <h2 v-else-if="s.headingStyle === 'bar'" class="doc-heading flex items-center gap-2.5" :class="s.heading">
      <span class="h-[15px] w-[4px] rounded-full bg-[color:var(--accent)]" />{{ title }}
    </h2>
    <h2 v-else class="doc-heading" :class="compact ? s.sideHeading : s.heading">{{ title }}</h2>

    <!-- Summary -->
    <Editable
      v-if="sectionKey === 'summary'"
      tag="p"
      multiline
      :path="['summary']"
      :value="document.summary"
      placeholder="A short professional summary"
    />

    <!-- Entries -->
    <template v-else-if="ENTRIES[sectionKey]">
      <div
        v-for="(item, i) in document[sectionKey]"
        :key="i"
        class="doc-entry group/entry relative"
        :class="[
          i ? (compact ? 'mt-3' : 'mt-4') : 'mt-1',
          !compact && s.dateColumn && ENTRIES[sectionKey].ph.date ? 'grid grid-cols-[104px_1fr] gap-4' : '',
        ]"
      >
        <Editable
          v-if="!compact && s.dateColumn && ENTRIES[sectionKey].ph.date"
          :class="s.date"
          class="pt-px"
          :path="[sectionKey, i, 'date']"
          :value="item.date"
          :placeholder="ENTRIES[sectionKey].ph.date"
        />
        <div>
          <div :class="compact ? '' : 'flex items-baseline justify-between gap-4'">
            <Editable
              tag="h3"
              :class="s.entryTitle"
              :path="[sectionKey, i, ENTRIES[sectionKey].title]"
              :value="item[ENTRIES[sectionKey].title]"
              :placeholder="ENTRIES[sectionKey].ph.title"
            />
            <Editable
              v-if="!compact && !s.dateColumn && ENTRIES[sectionKey].ph.date"
              :class="s.date"
              :path="[sectionKey, i, 'date']"
              :value="item.date"
              :placeholder="ENTRIES[sectionKey].ph.date"
            />
          </div>
          <Editable
            v-if="ENTRIES[sectionKey].subtitle"
            tag="p"
            :class="s.entrySub"
            :path="[sectionKey, i, ENTRIES[sectionKey].subtitle]"
            :value="item[ENTRIES[sectionKey].subtitle]"
            :placeholder="ENTRIES[sectionKey].ph.subtitle"
          />
          <Editable
            v-if="compact && ENTRIES[sectionKey].ph.date"
            tag="p"
            :class="s.date"
            :path="[sectionKey, i, 'date']"
            :value="item.date"
            :placeholder="ENTRIES[sectionKey].ph.date"
          />
          <div class="mt-1">
            <EntryText :text="item[ENTRIES[sectionKey].text]" :path="[sectionKey, i, ENTRIES[sectionKey].text]" />
          </div>
        </div>
        <EditControls mode="remove" :section="sectionKey" :index="i" :label="ENTRIES[sectionKey].noun" />
      </div>
      <EditControls mode="add" :section="sectionKey" :label="`Add ${ENTRIES[sectionKey].noun.toLowerCase()}`" />
    </template>

    <!-- Publications -->
    <template v-else-if="sectionKey === 'publications'">
      <ol :class="s.numberedPubs ? 'list-decimal space-y-1.5 pl-6' : 'space-y-1.5'">
        <li v-for="(pub, i) in document.publications" :key="i" class="doc-entry group/entry relative">
          <Editable class="font-medium" :path="['publications', i, 'title']" :value="pub.title" placeholder="Title" />
          <span v-if="pub.publisher || edit">, </span>
          <Editable class="italic" :path="['publications', i, 'publisher']" :value="pub.publisher" placeholder="Publisher" />
          <span v-if="pub.date || edit"> (</span><Editable :path="['publications', i, 'date']" :value="pub.date" placeholder="Year" /><span v-if="pub.date || edit">)</span>
          <EditControls mode="remove" section="publications" :index="i" label="Publication" />
        </li>
      </ol>
      <EditControls mode="add" section="publications" label="Add publication" />
    </template>

    <!-- Skills -->
    <template v-else-if="sectionKey === 'skills'">
      <ul v-if="compact || s.skills === 'chips' || s.skills === 'outline'" class="flex flex-wrap gap-1.5">
        <li
          v-for="(skill, i) in document.skills"
          :key="i"
          class="rounded-md px-2 py-0.5 text-[12.5px] font-medium"
          :class="
            compact
              ? 'bg-white/70 text-[color:var(--accent-ink)]'
              : s.skills === 'outline'
                ? 'border border-[color:var(--accent-line)] text-[color:var(--accent-ink)]'
                : 'bg-[color:var(--accent-tint)] text-[color:var(--accent-ink)]'
          "
        >
          <Editable :path="['skills', i]" :value="skill" placeholder="Skill" />
        </li>
      </ul>
      <p v-else>
        <template v-for="(skill, i) in document.skills" :key="i">
          <span v-if="i" class="text-[color:var(--accent-line)]" aria-hidden="true">{{ s.skillSeparator || " · " }}</span>
          <Editable :path="['skills', i]" :value="skill" placeholder="Skill" />
        </template>
      </p>
      <EditControls mode="add" section="skills" label="Add skill" />
    </template>

    <!-- Bullet lists -->
    <template v-else-if="LISTS[sectionKey]">
      <ul class="list-disc space-y-1 pl-5 marker:text-[color:var(--accent-line)]">
        <li v-for="(item, i) in document[sectionKey]" :key="i" class="doc-entry">
          <Editable :path="[sectionKey, i]" :value="item" :placeholder="LISTS[sectionKey].ph" />
        </li>
      </ul>
      <EditControls mode="add" :section="sectionKey" :label="`Add ${LISTS[sectionKey].noun.toLowerCase()}`" />
    </template>
  </section>
</template>
