<script setup>
defineProps({
  size: { type: String, default: "md" },
});
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <span
      :class="size === 'lg' ? 'h-9 w-9' : 'h-7 w-7'"
      class="grid shrink-0 place-items-center rounded-lg bg-brand-600 shadow-sm"
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" :class="size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'">
        <path d="M10 8h9l4 4v12a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" fill="#fff" />
        <path d="M19 8v3a1 1 0 0 0 1 1h3" fill="#d4c9ff" />
        <path d="M12.5 16h7M12.5 19h7M12.5 22h4" stroke="#6a43ee" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    </span>
    <span :class="size === 'lg' ? 'text-2xl' : 'text-[17px]'" class="font-semibold tracking-tight text-ink">
      FirstDraft
    </span>
  </span>
</template>
