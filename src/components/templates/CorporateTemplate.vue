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
  <article class="font-serif text-[14px] leading-relaxed text-gray-800">
    <header class="doc-heading border-b-2 border-gray-900 pb-4 text-center">
      <h1 class="text-[28px] font-bold uppercase tracking-[0.08em] text-gray-900">
        {{ info.name || "Your Name" }}
      </h1>
      <p v-if="contact.length" class="mt-2 text-[12.5px] text-gray-600">
        <template v-for="(item, i) in contact" :key="i">
          <span v-if="i" class="mx-1.5" aria-hidden="true">|</span>
          <span class="break-all">{{ item }}</span>
        </template>
      </p>
    </header>

    <section v-if="document.summary" class="mt-6">
      <h2 class="doc-heading mb-2 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Professional Profile
      </h2>
      <p>{{ document.summary }}</p>
    </section>

    <section v-if="document.experience?.length" class="mt-6">
      <h2 class="doc-heading mb-1 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Professional Experience
      </h2>
      <div v-for="(job, i) in document.experience" :key="i" class="doc-entry mt-3">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="font-bold text-gray-900">{{ job.company || job.position }}</h3>
          <span class="shrink-0 text-[13px] text-gray-600">{{ job.date }}</span>
        </div>
        <p v-if="job.company && job.position" class="italic text-gray-700">{{ job.position }}</p>
        <EntryText :text="job.description" class="mt-1" />
      </div>
    </section>

    <section v-if="document.education?.length" class="mt-6">
      <h2 class="doc-heading mb-1 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Education
      </h2>
      <div v-for="(edu, i) in document.education" :key="i" class="doc-entry mt-3">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="font-bold text-gray-900">{{ edu.school || edu.degree }}</h3>
          <span class="shrink-0 text-[13px] text-gray-600">{{ edu.date }}</span>
        </div>
        <p v-if="edu.school && edu.degree" class="italic text-gray-700">{{ edu.degree }}</p>
        <EntryText :text="edu.details" class="mt-1" />
      </div>
    </section>

    <section v-if="document.projects?.length" class="mt-6">
      <h2 class="doc-heading mb-1 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Projects
      </h2>
      <div v-for="(project, i) in document.projects" :key="i" class="doc-entry mt-3">
        <h3 class="font-bold text-gray-900">{{ project.name }}</h3>
        <EntryText :text="project.description" class="mt-0.5" />
      </div>
    </section>

    <section v-if="document.research?.length" class="mt-6">
      <h2 class="doc-heading mb-1 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Research
      </h2>
      <div v-for="(item, i) in document.research" :key="i" class="doc-entry mt-3">
        <div class="flex items-baseline justify-between gap-4">
          <h3 class="font-bold text-gray-900">{{ item.title }}</h3>
          <span class="shrink-0 text-[13px] text-gray-600">{{ item.date }}</span>
        </div>
        <p v-if="item.institution" class="italic text-gray-700">{{ item.institution }}</p>
        <EntryText :text="item.description" class="mt-1" />
      </div>
    </section>

    <section v-if="document.publications?.length" class="mt-6">
      <h2 class="doc-heading mb-2 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Publications
      </h2>
      <ul class="space-y-1">
        <li v-for="(pub, i) in document.publications" :key="i" class="doc-entry">
          {{ pub.title }}<span v-if="pub.publisher">, <em>{{ pub.publisher }}</em></span><span v-if="pub.date"> ({{ pub.date }})</span>
        </li>
      </ul>
    </section>

    <section v-if="document.skills?.length" class="mt-6">
      <h2 class="doc-heading mb-2 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Skills
      </h2>
      <p>{{ document.skills.join(" · ") }}</p>
    </section>

    <section v-if="document.certifications?.length" class="mt-6">
      <h2 class="doc-heading mb-2 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Certifications
      </h2>
      <ul class="list-disc space-y-0.5 pl-5">
        <li v-for="(cert, i) in document.certifications" :key="i">{{ cert }}</li>
      </ul>
    </section>

    <section v-if="document.achievements?.length" class="mt-6">
      <h2 class="doc-heading mb-2 border-b border-gray-300 pb-1 text-[13px] font-bold uppercase tracking-[0.12em] text-gray-900">
        Achievements
      </h2>
      <ul class="list-disc space-y-0.5 pl-5">
        <li v-for="(item, i) in document.achievements" :key="i">{{ item }}</li>
      </ul>
    </section>
  </article>
</template>
