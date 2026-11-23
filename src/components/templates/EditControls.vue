<script setup>
import { Plus, X } from "lucide-vue-next";
import { useEditing } from "./editing";

// mode="remove": small × shown on hover over an entry (parent needs `group/entry relative`).
// mode="add":    "+ Add …" button shown on hover over a section (parent needs `group/section`).
defineProps({
  mode: { type: String, required: true },
  section: { type: String, required: true },
  index: { type: Number, default: -1 },
  label: { type: String, default: "Add" },
});

const edit = useEditing();
</script>

<template>
  <template v-if="edit">
    <button
      v-if="mode === 'remove'"
      type="button"
      class="absolute -right-7 top-0 grid h-6 w-6 place-items-center rounded-md text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 focus:opacity-100 group-hover/entry:opacity-100"
      :aria-label="`Remove this ${label.toLowerCase()}`"
      title="Remove"
      @click="edit.remove(section, index)"
    >
      <X :size="14" />
    </button>
    <button
      v-else
      type="button"
      class="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-sans text-[12px] font-medium text-brand-600 opacity-0 transition hover:bg-brand-50 focus:opacity-100 group-hover/section:opacity-100"
      @click="edit.add(section)"
    >
      <Plus :size="13" /> {{ label }}
    </button>
  </template>
</template>
