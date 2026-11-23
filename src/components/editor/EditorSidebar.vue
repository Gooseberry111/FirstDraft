<script setup>
import { Plus, ArrowLeft, X, FileText, GraduationCap, Mail, PenLine } from "lucide-vue-next";
import BrandMark from "@/components/BrandMark.vue";
import { relativeTime } from "@/utils/format";

defineProps({
  drafts: { type: Array, default: () => [] },
  activeId: { type: String, default: "" },
  closable: { type: Boolean, default: false },
});

defineEmits(["close"]);

const icons = { resume: FileText, cv: GraduationCap, cover_letter: Mail, essay: PenLine };
</script>

<template>
  <div class="flex h-full w-full flex-col bg-surface">
    <div class="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
      <RouterLink to="/app/dashboard" aria-label="Back to dashboard">
        <BrandMark />
      </RouterLink>
      <button v-if="closable" class="icon-btn" aria-label="Close drafts" @click="$emit('close')">
        <X :size="18" />
      </button>
    </div>

    <div class="space-y-1 p-3">
      <RouterLink to="/app/draft/new" class="btn-primary w-full">
        <Plus :size="17" />
        New draft
      </RouterLink>
      <RouterLink to="/app/dashboard" class="btn-ghost w-full justify-start">
        <ArrowLeft :size="17" />
        Dashboard
      </RouterLink>
    </div>

    <p class="px-5 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-faint">
      Recent drafts
    </p>

    <nav class="scrollbar-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Drafts">
      <RouterLink
        v-for="draft in drafts"
        :key="draft.id"
        :to="`/app/draft/${draft.id}`"
        :aria-current="draft.id === activeId ? 'page' : undefined"
        :class="
          draft.id === activeId
            ? 'bg-raised text-white'
            : 'text-zinc-400 hover:bg-raised/60 hover:text-zinc-100'
        "
        class="flex items-start gap-2.5 rounded-lg px-3 py-2.5 transition"
        @click="$emit('close')"
      >
        <component
          :is="icons[draft.document_data?.documentType] || FileText"
          :size="16"
          :class="draft.id === activeId ? 'text-violet-400' : 'text-faint'"
          class="mt-0.5 shrink-0"
        />
        <span class="min-w-0">
          <span class="block truncate text-sm">{{ draft.title || "Untitled Draft" }}</span>
          <span class="block text-xs text-faint">{{ relativeTime(draft.updated_at || draft.created_at) }}</span>
        </span>
      </RouterLink>

      <p v-if="!drafts.length" class="px-3 py-2 text-sm text-faint">No drafts yet</p>
    </nav>
  </div>
</template>
