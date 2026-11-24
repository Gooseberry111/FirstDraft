<script setup>
import { computed } from "vue";
import ResumeTemplate from "./ResumeTemplate.vue";
import LetterTemplate from "./LetterTemplate.vue";
import { provideEditing } from "./editing";
import { accentVars, parseDesign } from "./themes";
import { isProseDocument } from "@/services/documentBuilder";

const props = defineProps({
  document: { type: Object, required: true },
  // "style:accent", e.g. "sidebar:ocean" (see themes.js)
  design: { type: String, default: "" },
  editable: { type: Boolean, default: false },
});

provideEditing(props.editable);

const resolved = computed(() => parseDesign(props.design, props.document.documentType));
const vars = computed(() => accentVars(resolved.value.accent));
</script>

<template>
  <div :style="vars">
    <LetterTemplate
      v-if="isProseDocument(document.documentType)"
      :document="document"
      :variant="resolved.style"
    />
    <ResumeTemplate v-else :document="document" :variant="resolved.style" />
  </div>
</template>
