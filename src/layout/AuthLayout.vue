<script setup>
import { FileText, MessageSquare, Download } from "lucide-vue-next";
import BrandMark from "@/components/BrandMark.vue";

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
});

const points = [
  { icon: MessageSquare, text: "Answer a few questions in plain language" },
  { icon: FileText, text: "Watch your document build itself live" },
  { icon: Download, text: "Download as PDF or Word when you're done" },
];
</script>

<template>
  <div class="flex min-h-full bg-canvas">
    <!-- Brand panel -->
    <aside
      class="relative hidden w-[46%] max-w-[640px] flex-col justify-between overflow-hidden border-r border-line bg-surface p-12 lg:flex"
    >
      <div
        class="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden="true"
      />

      <BrandMark size="lg" class="relative" />

      <div class="relative">
        <h2 class="max-w-md text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
          Turn a conversation into a polished document.
        </h2>
        <p class="mt-4 max-w-md text-muted">
          Resumes, CVs, cover letters and essays — written with you, not for you.
        </p>

        <ul class="mt-10 space-y-4">
          <li
            v-for="point in points"
            :key="point.text"
            class="flex items-center gap-3 text-zinc-300"
          >
            <span class="grid h-9 w-9 place-items-center rounded-lg border border-line bg-raised text-violet-400">
              <component :is="point.icon" :size="18" />
            </span>
            {{ point.text }}
          </li>
        </ul>
      </div>

      <p class="relative text-sm text-faint">© {{ new Date().getFullYear() }} FirstDraft</p>
    </aside>

    <!-- Form -->
    <main class="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
      <div class="w-full max-w-sm animate-fade-up">
        <BrandMark class="mb-10 lg:hidden" />

        <h1 class="text-3xl font-semibold tracking-tight text-white">{{ title }}</h1>
        <p v-if="subtitle" class="mt-2 text-muted">{{ subtitle }}</p>

        <div class="mt-8">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>
