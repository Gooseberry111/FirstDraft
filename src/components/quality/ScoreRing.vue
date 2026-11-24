<script setup>
import { computed } from "vue";

const props = defineProps({
  score: { type: Number, default: 0 },
  size: { type: Number, default: 96 },
  stroke: { type: Number, default: 8 },
  showLabel: { type: Boolean, default: true },
});

const radius = computed(() => (props.size - props.stroke) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const offset = computed(() => circumference.value * (1 - Math.max(0, Math.min(100, props.score)) / 100));

// Red → orange → amber → green → emerald as the score rises.
const color = computed(() => {
  const s = props.score;
  if (s >= 90) return "#059669";
  if (s >= 75) return "#16a34a";
  if (s >= 60) return "#d97706";
  if (s >= 40) return "#ea580c";
  return "#e11d48";
});
</script>

<template>
  <div class="relative inline-grid shrink-0 place-items-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="-rotate-90" aria-hidden="true">
      <circle :cx="size / 2" :cy="size / 2" :r="radius" fill="none" stroke="#ede9f6" :stroke-width="stroke" />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="stroke"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        style="transition: stroke-dashoffset 0.6s ease, stroke 0.3s ease"
      />
    </svg>
    <span
      v-if="showLabel"
      class="absolute font-extrabold tabular-nums"
      :style="{ color, fontSize: `${Math.round(size * 0.3)}px` }"
    >
      {{ score }}
    </span>
  </div>
</template>
