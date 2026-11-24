<script setup>
import DocumentRenderer from "./DocumentRenderer.vue";

// A miniature, read-only A4 page (used by the style picker and the dashboard).
const props = defineProps({
  document: { type: Object, required: true },
  design: { type: String, default: "" },
  width: { type: Number, default: 160 },
});

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const scale = props.width / PAGE_WIDTH;
</script>

<template>
  <div
    class="pointer-events-none relative select-none overflow-hidden bg-white"
    :style="{ width: `${width}px`, height: `${Math.round(PAGE_HEIGHT * scale)}px` }"
    aria-hidden="true"
  >
    <div
      class="absolute left-0 top-0 origin-top-left px-[60px] py-[56px] text-gray-900"
      :style="{
        width: `${PAGE_WIDTH}px`,
        minHeight: `${PAGE_HEIGHT}px`,
        transform: `scale(${scale})`,
        '--page-px': '60px',
        '--page-py': '56px',
        '--page-h': `${PAGE_HEIGHT}px`,
        '--band-px': '60px',
        '--band-py': '48px',
        '--band-radius': '0px',
      }"
    >
      <DocumentRenderer :document="document" :design="design" />
    </div>
  </div>
</template>
