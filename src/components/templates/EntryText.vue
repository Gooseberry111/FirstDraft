<script setup>
import { computed } from "vue";
import { toLines } from "@/services/documentBuilder";

const props = defineProps({
  text: { type: String, default: "" },
});

const lines = computed(() => toLines(props.text));
</script>

<!-- Multi-line descriptions become bullet points; single lines stay a paragraph. -->
<template>
  <ul v-if="lines.length > 1" class="list-disc space-y-1 pl-5 marker:text-gray-400">
    <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
  </ul>
  <p v-else-if="lines.length">{{ lines[0] }}</p>
</template>
