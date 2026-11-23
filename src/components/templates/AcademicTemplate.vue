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
    <header class="doc-heading pb-5">
      <h1 class="text-[30px] font-semibold text-gray-900">
        {{ info.name || "Your Name" }}
      </h1>
      <p v-if="info.location" class="text-gray-600">{{ info.location }}</p>
      <p v-if="contact.length" class="mt-1 flex flex-wrap gap-x-4 text-[12.5px] text-gray-600">
        <span
          v-for="(item, i) in contact.filter((c) => c !== info.location)"
          :key="i"
          class="break-all"
        >
          {{ item }}
        </span>
      </p>
    </header>

    <section v-if="document.summary" class="border-t border-gray-300 pt-4">
      <h2 class="doc-heading mb-2 text-[15px] font-semibold text-gray-900">Profile</h2>
      <p>{{ document.summary }}</p>
    </section>

    <section v-if="document.education?.length" class="mt-6 border-t border-gray-300 pt-4">
      <h2 class="doc-heading text-[15px] font-semibold text-gray-900">Education</h2>
      <div
        v-for="(edu, i) in document.education"
        :key="i"
        class="doc-entry mt-3 grid grid-cols-[96px_1fr] gap-4"
      >
        <span class="text-[13px] text-gray-500">{{ edu.date }}</span>
        <div>
          <h3 class="font-semibold text-gray-900">{{ edu.degree }}</h3>
          <p class="italic text-gray-600">{{ edu.school }}</p>
          <EntryText :text="edu.details" class="mt-1" />
        </div>
      </div>
    </section>

    <section v-if="document.research?.length" class="mt-6 border-t border-gray-300 pt-4">
      <h2 class="doc-heading text-[15px] font-semibold text-gray-900">Research Experience</h2>
      <div
        v-for="(item, i) in document.research"
        :key="i"
        class="doc-entry mt-3 grid grid-cols-[96px_1fr] gap-4"
      >
        <span class="text-[13px] text-gray-500">{{ item.date }}</span>
        <div>
          <h3 class="font-semibold text-gray-900">{{ item.title }}</h3>
          <p v-if="item.institution" class="italic text-gray-600">{{ item.institution }}</p>
          <EntryText :text="item.description" class="mt-1" />
        </div>
      </div>
    </section>

    <section v-if="document.publications?.length" class="mt-6 border-t border-gray-300 pt-4">
      <h2 class="doc-heading mb-2 text-[15px] font-semibold text-gray-900">Publications</h2>
      <ol class="list-decimal space-y-1.5 pl-6">
        <li v-for="(pub, i) in document.publications" :key="i" class="doc-entry">
          “{{ pub.title }}.”<span v-if="pub.publisher"> <em>{{ pub.publisher }}</em></span><span v-if="pub.date">, {{ pub.date }}</span>.
        </li>
      </ol>
    </section>

    <section v-if="document.experience?.length" class="mt-6 border-t border-gray-300 pt-4">
      <h2 class="doc-heading text-[15px] font-semibold text-gray-900">Professional Experience</h2>
      <div
        v-for="(job, i) in document.experience"
        :key="i"
        class="doc-entry mt-3 grid grid-cols-[96px_1fr] gap-4"
      >
        <span class="text-[13px] text-gray-500">{{ job.date }}</span>
        <div>
          <h3 class="font-semibold text-gray-900">{{ job.position }}</h3>
          <p v-if="job.company" class="italic text-gray-600">{{ job.company }}</p>
          <EntryText :text="job.description" class="mt-1" />
        </div>
      </div>
    </section>

    <section v-if="document.projects?.length" class="mt-6 border-t border-gray-300 pt-4">
      <h2 class="doc-heading text-[15px] font-semibold text-gray-900">Projects</h2>
      <div v-for="(project, i) in document.projects" :key="i" class="doc-entry mt-3">
        <h3 class="font-semibold text-gray-900">{{ project.name }}</h3>
        <EntryText :text="project.description" class="mt-0.5" />
      </div>
    </section>

    <section v-if="document.achievements?.length" class="mt-6 border-t border-gray-300 pt-4">
      <h2 class="doc-heading mb-2 text-[15px] font-semibold text-gray-900">Awards &amp; Honours</h2>
      <ul class="list-disc space-y-0.5 pl-5">
        <li v-for="(item, i) in document.achievements" :key="i">{{ item }}</li>
      </ul>
    </section>

    <section v-if="document.certifications?.length" class="mt-6 border-t border-gray-300 pt-4">
      <h2 class="doc-heading mb-2 text-[15px] font-semibold text-gray-900">Certifications</h2>
      <ul class="list-disc space-y-0.5 pl-5">
        <li v-for="(cert, i) in document.certifications" :key="i">{{ cert }}</li>
      </ul>
    </section>

    <section v-if="document.skills?.length" class="mt-6 border-t border-gray-300 pt-4">
      <h2 class="doc-heading mb-2 text-[15px] font-semibold text-gray-900">Skills</h2>
      <p>{{ document.skills.join(", ") }}</p>
    </section>
  </article>
</template>
