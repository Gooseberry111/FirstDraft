<script setup>
import ResumeTemplate from "./ResumeTemplate.vue";
import LetterTemplate from "./LetterTemplate.vue";
import { provideEditing } from "./editing";
import { isProseDocument } from "@/services/documentBuilder";

const props = defineProps({
  document: { type: Object, required: true },
  template: { type: String, default: "modern" },
  editable: { type: Boolean, default: false },
});

provideEditing(props.editable);
</script>

<template>
  <LetterTemplate v-if="isProseDocument(document.documentType)" :document="document" />
  <ResumeTemplate v-else :document="document" :variant="template" />
</template>
