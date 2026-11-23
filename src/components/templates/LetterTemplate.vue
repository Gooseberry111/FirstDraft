<script setup>
import { computed } from "vue";

const props = defineProps({
  document: { type: Object, required: true },
});

const info = computed(() => props.document.personalInfo || {});
const isLetter = computed(() => props.document.documentType === "cover_letter");
const contact = computed(() =>
  ["email", "phone", "location", "linkedin", "website"]
    .map((key) => info.value[key])
    .filter(Boolean),
);
const today = new Date().toLocaleDateString(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
});
</script>

<template>
  <!-- Cover letter -->
  <article v-if="isLetter" class="font-serif text-[14.5px] leading-[1.7] text-gray-800">
    <header class="border-b border-gray-300 pb-4">
      <h1 class="text-[24px] font-semibold text-gray-900">
        {{ info.name || "Your Name" }}
      </h1>
      <p v-if="contact.length" class="mt-1 text-[12.5px] text-gray-600">
        {{ contact.join("  ·  ") }}
      </p>
    </header>

    <p class="mt-6 text-gray-600">{{ today }}</p>

    <p v-if="document.recipient" class="mt-4 whitespace-pre-line">{{ document.recipient }}</p>

    <p v-if="document.title" class="mt-5 font-semibold text-gray-900">
      Re: {{ document.title }}
    </p>

    <div v-if="document.body?.length" class="mt-5 space-y-4">
      <p v-for="(paragraph, i) in document.body" :key="i">{{ paragraph }}</p>
    </div>
    <p v-else class="mt-5 italic text-gray-400">
      Your letter will appear here once FirstDraft writes the first draft.
    </p>

    <div v-if="document.body?.length" class="doc-entry mt-8">
      <p>{{ document.closing || "Sincerely," }}</p>
      <p class="mt-6 font-semibold text-gray-900">{{ info.name }}</p>
    </div>
  </article>

  <!-- Essay -->
  <article v-else class="font-serif text-[15px] leading-[1.8] text-gray-800">
    <h1 class="text-center text-[26px] font-semibold leading-tight text-gray-900">
      {{ document.title || "Untitled Essay" }}
    </h1>
    <p v-if="info.name" class="mt-2 text-center text-gray-500">{{ info.name }}</p>

    <div v-if="document.body?.length" class="mt-8 space-y-4">
      <p v-for="(paragraph, i) in document.body" :key="i" class="indent-8">
        {{ paragraph }}
      </p>
    </div>
    <p v-else class="mt-8 text-center italic text-gray-400">
      Your essay will appear here once FirstDraft writes the first draft.
    </p>
  </article>
</template>
