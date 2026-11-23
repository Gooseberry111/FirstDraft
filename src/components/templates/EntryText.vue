<script setup>
import { computed, ref } from "vue";
import { toLines } from "@/services/documentBuilder";
import Editable from "./Editable.vue";
import { useEditing } from "./editing";

const props = defineProps({
  text: { type: String, default: "" },
  path: { type: Array, default: null },
  placeholder: { type: String, default: "Add details — one point per line" },
});

const edit = useEditing();
const editing = ref(false);
const lines = computed(() => toLines(props.text));
const editable = computed(() => !!(edit && props.path));
</script>

<!-- Multi-line descriptions show as bullet points; click to edit the raw lines. -->
<template>
  <Editable
    v-if="editable && editing"
    tag="div"
    :path="path"
    :value="lines.join('\n')"
    :placeholder="placeholder"
    multiline
    autofocus
    @done="editing = false"
  />
  <div
    v-else-if="editable"
    class="editable"
    :class="!lines.length && 'hidden focus:block group-hover/entry:block'"
    tabindex="0"
    role="button"
    :aria-label="`Edit: ${placeholder}`"
    @click="editing = true"
    @keydown.enter.prevent="editing = true"
  >
    <ul v-if="lines.length > 1" class="list-disc space-y-1 pl-5 marker:text-gray-400">
      <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
    </ul>
    <p v-else-if="lines.length">{{ lines[0] }}</p>
    <p v-else class="text-[12px] italic text-gray-400">{{ placeholder }}</p>
  </div>
  <template v-else>
    <ul v-if="lines.length > 1" class="list-disc space-y-1 pl-5 marker:text-gray-400">
      <li v-for="(line, i) in lines" :key="i">{{ line }}</li>
    </ul>
    <p v-else-if="lines.length">{{ lines[0] }}</p>
  </template>
</template>
