<script setup>
import { computed } from "vue";
import ModernTemplate from "./ModernTemplate.vue";
import CorporateTemplate from "./CorporateTemplate.vue";
import AcademicTemplate from "./AcademicTemplate.vue";
import LetterTemplate from "./LetterTemplate.vue";
import { isProseDocument } from "@/services/documentBuilder";

const props = defineProps({
  document: { type: Object, required: true },
  template: { type: String, default: "modern" },
});

const templates = {
  modern: ModernTemplate,
  corporate: CorporateTemplate,
  academic: AcademicTemplate,
};

const component = computed(() =>
  isProseDocument(props.document.documentType)
    ? LetterTemplate
    : templates[props.template] || ModernTemplate,
);
</script>

<template>
  <component :is="component" :document="document" />
</template>
