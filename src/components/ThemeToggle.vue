<script setup>
import { computed } from "vue";
import { Monitor, Moon, Sun } from "lucide-vue-next";
import { useTheme } from "@/composables/useTheme";

// Small button that cycles Light → Dark → System.
const { theme, cycle } = useTheme();

const current = computed(
  () =>
    ({
      light: { icon: Sun, label: "Light mode" },
      dark: { icon: Moon, label: "Dark mode" },
      system: { icon: Monitor, label: "Match my device" },
    })[theme.value],
);
</script>

<template>
  <button class="icon-btn" :title="`${current.label} (click to change)`" :aria-label="`Theme: ${current.label}. Click to change.`" @click="cycle">
    <component :is="current.icon" :size="18" />
  </button>
</template>
