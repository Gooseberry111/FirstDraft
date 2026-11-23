<script setup>
import { nextTick, onMounted, ref, watch } from "vue";
import { plaintextOnlySupported, useEditing } from "./editing";

const props = defineProps({
  path: { type: Array, required: true },
  value: { type: String, default: "" },
  tag: { type: String, default: "span" },
  placeholder: { type: String, default: "" },
  multiline: { type: Boolean, default: false },
  autofocus: { type: Boolean, default: false },
});

const emit = defineEmits(["done"]);

const edit = useEditing();
const el = ref(null);

function render() {
  if (el.value && document.activeElement !== el.value) {
    el.value.textContent = props.value || "";
  }
}

onMounted(() => {
  render();
  if (props.autofocus && el.value) {
    nextTick(() => {
      el.value.focus();
      const range = document.createRange();
      range.selectNodeContents(el.value);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }
});
watch(() => props.value, render);

function commit() {
  let text = (el.value?.innerText || "").replace(/ /g, " ");
  text = props.multiline
    ? text.replace(/\n{3,}/g, "\n\n").trim()
    : text.replace(/\s*\n\s*/g, " ").trim();

  if (text !== (props.value || "")) edit?.edit(props.path, text);
  else render();
  emit("done");
}

function onKeydown(event) {
  if (event.key === "Escape") {
    el.value.textContent = props.value || "";
    el.value.blur();
  } else if (event.key === "Enter" && (!props.multiline || event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    el.value.blur();
  }
}

function onPaste(event) {
  event.preventDefault();
  const text = event.clipboardData?.getData("text/plain") || "";
  document.execCommand("insertText", false, props.multiline ? text : text.replace(/\s*\n\s*/g, " "));
}
</script>

<template>
  <component
    :is="tag"
    v-if="edit"
    ref="el"
    :contenteditable="plaintextOnlySupported ? 'plaintext-only' : 'true'"
    :data-placeholder="placeholder"
    :class="['editable', multiline && 'whitespace-pre-line']"
    spellcheck="true"
    role="textbox"
    :aria-label="placeholder || 'Edit text'"
    :aria-multiline="multiline || undefined"
    @focus="edit.focus()"
    @blur="commit"
    @keydown="onKeydown"
    @paste="onPaste"
  />
  <component :is="tag" v-else>{{ value }}</component>
</template>
