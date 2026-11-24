<script setup>
import { MessageSquare, MousePointerClick, Download } from "lucide-vue-next";
import BrandMark from "@/components/BrandMark.vue";
import ThemeToggle from "@/components/ThemeToggle.vue";

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
});

const points = [
  { icon: MessageSquare, title: "Answer a few questions", text: "Type a short answer or tap one of the suggestions." },
  { icon: MousePointerClick, title: "See it as you go", text: "Your document fills in while you chat, and you can edit any line." },
  { icon: Download, title: "Download when you're happy", text: "Get a clean PDF or Word file." },
];
</script>

<template>
  <div class="flex min-h-full bg-canvas">
    <!-- Form -->
    <main class="flex flex-1 flex-col px-4 py-8 sm:px-8">
      <div class="flex items-center justify-between">
        <RouterLink to="/" aria-label="FirstDraft home"><BrandMark /></RouterLink>
        <ThemeToggle />
      </div>
      <div class="flex flex-1 items-center justify-center py-10">
        <div class="w-full max-w-sm animate-fade-up">
          <h1 class="text-3xl font-semibold tracking-tight text-ink">{{ title }}</h1>
          <p v-if="subtitle" class="mt-2 text-muted">{{ subtitle }}</p>
          <div class="mt-8">
            <slot />
          </div>
        </div>
      </div>
    </main>

    <!-- Showcase panel -->
    <aside class="relative hidden w-[46%] max-w-[620px] flex-col justify-center overflow-hidden bg-brand-gradient p-12 text-white lg:flex">
      <div class="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" aria-hidden="true" />
      <div class="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-sky-300/25 blur-3xl" aria-hidden="true" />

      <div class="relative">
        <h2 class="max-w-md text-4xl font-extrabold leading-tight tracking-tight">
          Write your CV by answering a few questions.
        </h2>
        <p class="mt-3 max-w-md text-white/80">Cover letters and essays too. Most people finish in about ten minutes.</p>

        <!-- Mini document mock (paper stays white) -->
        <div class="mt-10 max-w-sm rotate-[-1.5deg] rounded-xl bg-white p-6 text-gray-900 shadow-2xl" aria-hidden="true">
          <div class="h-3 w-32 rounded bg-gray-900" />
          <div class="mt-2 h-2 w-48 rounded bg-gray-300" />
          <div class="mt-4 h-[3px] w-10 rounded bg-[#6a3ef0]" />
          <div class="mt-5 h-2 w-16 rounded bg-[#d9ceff]" />
          <div class="mt-2 space-y-1.5">
            <div class="h-2 rounded bg-gray-200" />
            <div class="h-2 w-11/12 rounded bg-gray-200" />
            <div class="h-2 w-4/5 rounded bg-gray-200" />
          </div>
          <div class="mt-4 flex gap-1.5">
            <span class="h-4 w-12 rounded bg-[#f4f1ff]" />
            <span class="h-4 w-10 rounded bg-[#f4f1ff]" />
            <span class="h-4 w-14 rounded bg-[#f4f1ff]" />
          </div>
        </div>

        <ul class="mt-10 space-y-5">
          <li v-for="point in points" :key="point.title" class="flex items-start gap-3">
            <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 ring-1 ring-white/20 backdrop-blur">
              <component :is="point.icon" :size="18" />
            </span>
            <span>
              <span class="block font-semibold">{{ point.title }}</span>
              <span class="block text-sm text-white/75">{{ point.text }}</span>
            </span>
          </li>
        </ul>
      </div>
    </aside>
  </div>
</template>
