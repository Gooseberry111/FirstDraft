<script setup>
import { computed } from "vue";
import EntryText from "./EntryText.vue";

const props = defineProps({
  document: { type: Object, required: true },
});

const info = computed(() => props.document.personalInfo || {});
const contact = computed(() =>
  ["email", "phone", "location", "linkedin", "website"]
    .map((key) => info.value[key])
    .filter(Boolean),
);
</script>

<template>
  <article class="font-sans text-[13.5px] leading-relaxed text-gray-700">
    <header class="doc-heading">
      <h1 class="text-[30px] font-bold leading-tight tracking-tight text-gray-900">
        {{ info.name || "Your Name" }}
      </h1>
      <p v-if="contact.length" class="mt-2 flex flex-wrap gap-x-2 text-[12.5px] text-gray-500">
        <template v-for="(item, i) in contact" :key="i">
          <span v-if="i" class="text-violet-300" aria-hidden="true">•</span>
          <span class="break-all">{{ item }}</span>
        </template>
      </p>
      <div class="mt-5 h-[3px] w-12 rounded-full bg-violet-600" />
    </header>

    <section v-if="document.summary" class="mt-7">
      <h2 class="doc-heading mb-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
        Summary
      </h2>
      <p>{{ document.summary }}</p>
    </section>

    <section v-if="document.skills?.length" class="mt-7">
      <h2 class="doc-heading mb-2.5 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
        Skills
      </h2>
      <ul class="flex flex-wrap gap-1.5">
        <li
          v-for="(skill, i) in document.skills"
          :key="i"
          class="rounded-md bg-violet-50 px-2 py-0.5 text-[12.5px] font-medium text-violet-800"
        >
          {{ skill }}
        </li>
      </ul>
    </section>

    <section v-if="document.experience?.length" class="mt-7">
      <h2 class="doc-heading mb-1 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
        Experience
      </h2>
      <div v-for="(job, i) in document.experience" :key="i" class="doc-entry mt-4">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="font-semibold text-gray-900">{{ job.position }}</h3>
          <span class="shrink-0 text-[12.5px] text-gray-500">{{ job.date }}</span>
        </div>
        <p v-if="job.company" class="text-[13px] font-medium text-gray-500">{{ job.company }}</p>
        <EntryText :text="job.description" class="mt-1.5" />
      </div>
    </section>

    <section v-if="document.projects?.length" class="mt-7">
      <h2 class="doc-heading mb-1 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
        Projects
      </h2>
      <div v-for="(project, i) in document.projects" :key="i" class="doc-entry mt-4">
        <h3 class="font-semibold text-gray-900">{{ project.name }}</h3>
        <EntryText :text="project.description" class="mt-1" />
      </div>
    </section>

    <section v-if="document.education?.length" class="mt-7">
      <h2 class="doc-heading mb-1 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
        Education
      </h2>
      <div v-for="(edu, i) in document.education" :key="i" class="doc-entry mt-4">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="font-semibold text-gray-900">{{ edu.degree }}</h3>
          <span class="shrink-0 text-[12.5px] text-gray-500">{{ edu.date }}</span>
        </div>
        <p v-if="edu.school" class="text-[13px] font-medium text-gray-500">{{ edu.school }}</p>
        <EntryText :text="edu.details" class="mt-1" />
      </div>
    </section>

    <section v-if="document.research?.length" class="mt-7">
      <h2 class="doc-heading mb-1 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
        Research
      </h2>
      <div v-for="(item, i) in document.research" :key="i" class="doc-entry mt-4">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="font-semibold text-gray-900">{{ item.title }}</h3>
          <span class="shrink-0 text-[12.5px] text-gray-500">{{ item.date }}</span>
        </div>
        <p v-if="item.institution" class="text-[13px] font-medium text-gray-500">{{ item.institution }}</p>
        <EntryText :text="item.description" class="mt-1" />
      </div>
    </section>

    <section v-if="document.publications?.length" class="mt-7">
      <h2 class="doc-heading mb-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
        Publications
      </h2>
      <ul class="space-y-1.5">
        <li v-for="(pub, i) in document.publications" :key="i" class="doc-entry">
          <span class="font-medium text-gray-900">{{ pub.title }}</span>
          <span v-if="pub.publisher || pub.date" class="text-gray-500">
            — {{ [pub.publisher, pub.date].filter(Boolean).join(", ") }}
          </span>
        </li>
      </ul>
    </section>

    <div
      v-if="document.certifications?.length || document.achievements?.length"
      class="mt-7 grid gap-7 sm:grid-cols-2 print:grid-cols-2"
    >
      <section v-if="document.certifications?.length">
        <h2 class="doc-heading mb-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
          Certifications
        </h2>
        <ul class="list-disc space-y-1 pl-5 marker:text-gray-400">
          <li v-for="(cert, i) in document.certifications" :key="i">{{ cert }}</li>
        </ul>
      </section>
      <section v-if="document.achievements?.length">
        <h2 class="doc-heading mb-2 text-[11.5px] font-bold uppercase tracking-[0.16em] text-violet-700">
          Achievements
        </h2>
        <ul class="list-disc space-y-1 pl-5 marker:text-gray-400">
          <li v-for="(item, i) in document.achievements" :key="i">{{ item }}</li>
        </ul>
      </section>
    </div>
  </article>
</template>
