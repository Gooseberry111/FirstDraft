<script setup>
import { X } from "lucide-vue-next";

defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  subtitle: { type: String, default: "" },
  icon: { type: [Object, Function], default: null },
  wide: { type: Boolean, default: false },
});
const emit = defineEmits(["close"]);
</script>

<template>
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <div
        class="flex max-h-[92dvh] w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-canvas shadow-2xl sm:rounded-3xl"
        :class="wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'"
        role="dialog"
        :aria-label="title"
      >
        <header class="flex items-center gap-3 border-b border-line bg-surface/80 px-5 py-4">
          <span v-if="icon" class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow">
            <component :is="icon" :size="18" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="font-bold text-ink">{{ title }}</h2>
            <p v-if="subtitle" class="text-xs text-muted">{{ subtitle }}</p>
          </div>
          <button class="icon-btn" aria-label="Close" @click="emit('close')"><X :size="18" /></button>
        </header>
        <div class="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5">
          <slot />
        </div>
      </div>
    </div>
  </Transition>
</template>
