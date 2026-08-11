<script setup>
import { isDocumentEmpty } from "@/services/documentBuilder";

defineProps({
  doc: { type: Object, default: null },
  loading: { type: Boolean, default: false },
});

const docTypeLabels = {
  cv: "Curriculum Vitae",
  resume: "Resume",
  cover_letter: "Cover Letter",
  essay: "Essay",
};
</script>

<template>
  <div
    v-if="isDocumentEmpty(doc)"
    class="flex min-h-[900px] items-center justify-center"
  >
    <div class="text-center">
      <h2 class="text-2xl font-semibold text-zinc-800">
        Select a document type
      </h2>
      <p class="mt-2 text-zinc-500">
        FirstDraft will build your document as you chat.
      </p>
    </div>
  </div>

  <div v-else class="relative">
    <span
      v-if="loading"
      class="absolute -top-8 right-0 text-xs uppercase tracking-wider text-zinc-400"
    >
      Updating…
    </span>

    <div class="border-b pb-6">
      <p
        v-if="doc.docType"
        class="mb-1 text-xs uppercase tracking-widest text-zinc-400"
      >
        {{ docTypeLabels[doc.docType] || doc.docType }}
      </p>

      <h1 class="text-4xl font-bold text-zinc-900">
        {{ doc.title || "Untitled Document" }}
      </h1>

      <p v-if="doc.subtitle" class="mt-2 text-zinc-500">
        {{ doc.subtitle }}
      </p>
    </div>

    <div class="mt-8 space-y-8">
      <div v-for="(section, sIndex) in doc.sections" :key="sIndex">
        <h3
          class="mb-3 text-sm font-semibold uppercase tracking-wider text-violet-700"
        >
          {{ section.heading }}
        </h3>

        <div
          v-if="section.body"
          class="whitespace-pre-line leading-relaxed text-zinc-800"
        >
          {{ section.body }}
        </div>

        <div v-if="section.items?.length" class="space-y-5">
          <div v-for="(item, iIndex) in section.items" :key="iIndex">
            <div class="flex items-baseline justify-between gap-4">
              <div>
                <p class="font-semibold text-zinc-900">{{ item.heading }}</p>
                <p v-if="item.subheading" class="text-sm text-zinc-600">
                  {{ item.subheading }}
                </p>
              </div>

              <p v-if="item.dateRange" class="shrink-0 text-sm text-zinc-500">
                {{ item.dateRange }}
              </p>
            </div>

            <ul
              v-if="item.bullets?.length"
              class="mt-2 list-disc space-y-1 pl-5 text-zinc-700"
            >
              <li v-for="(bullet, bIndex) in item.bullets" :key="bIndex">
                {{ bullet }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
