<script setup>
import { computed } from "vue";
import Editable from "./Editable.vue";
import EditControls from "./EditControls.vue";
import { useEditing } from "./editing";

const props = defineProps({
  document: { type: Object, required: true },
});

const edit = useEditing();
const info = computed(() => props.document.personalInfo || {});
const isLetter = computed(() => props.document.documentType === "cover_letter");

const CONTACT_FIELDS = [
  { key: "email", placeholder: "Email" },
  { key: "phone", placeholder: "Phone" },
  { key: "location", placeholder: "Location" },
  { key: "linkedin", placeholder: "LinkedIn" },
  { key: "website", placeholder: "Website" },
];

const today = new Date().toLocaleDateString(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
});
</script>

<template>
  <!-- Cover letter -->
  <article v-if="isLetter" class="font-serif text-[14.5px] leading-[1.7] text-gray-800">
    <header class="group/entry border-b border-gray-300 pb-4">
      <Editable tag="h1" class="text-[24px] font-semibold text-gray-900" :path="['personalInfo', 'name']" :value="info.name" placeholder="Your Name" />
      <p class="mt-1 flex flex-wrap gap-x-3 text-[12.5px] text-gray-600">
        <template v-for="field in CONTACT_FIELDS" :key="field.key">
          <Editable
            v-if="info[field.key]"
            :path="['personalInfo', field.key]"
            :value="info[field.key]"
            :placeholder="field.placeholder"
          />
          <Editable
            v-else-if="edit"
            class="hidden group-hover/entry:inline focus:inline"
            :path="['personalInfo', field.key]"
            value=""
            :placeholder="`+ ${field.placeholder}`"
          />
        </template>
      </p>
    </header>

    <p class="mt-6 text-gray-600">{{ today }}</p>

    <Editable
      v-if="document.recipient || edit"
      tag="p"
      class="mt-4"
      multiline
      :path="['recipient']"
      :value="document.recipient"
      placeholder="Recipient — e.g. Hiring Manager, Company name"
    />

    <p v-if="document.title || edit" class="mt-5 font-semibold text-gray-900">
      Re: <Editable :path="['title']" :value="document.title" placeholder="Subject, e.g. Application for Product Designer" />
    </p>

    <div v-if="document.body?.length" class="group/section mt-5 space-y-4">
      <div v-for="(paragraph, i) in document.body" :key="i" class="group/entry relative">
        <Editable tag="p" multiline :path="['body', i]" :value="paragraph" placeholder="Paragraph" />
        <EditControls mode="remove" section="body" :index="i" label="Paragraph" />
      </div>
      <EditControls mode="add" section="body" label="Add paragraph" />
    </div>
    <p v-else class="mt-5 italic text-gray-400">
      Your letter will appear here once FirstDraft writes the first draft.
    </p>

    <div v-if="document.body?.length" class="doc-entry mt-8">
      <Editable tag="p" :path="['closing']" :value="document.closing || 'Sincerely,'" placeholder="Sincerely," />
      <p class="mt-6 font-semibold text-gray-900">{{ info.name }}</p>
    </div>
  </article>

  <!-- Essay -->
  <article v-else class="font-serif text-[15px] leading-[1.8] text-gray-800">
    <Editable
      tag="h1"
      class="block text-center text-[26px] font-semibold leading-tight text-gray-900"
      :path="['title']"
      :value="document.title"
      placeholder="Essay title"
    />
    <p v-if="info.name || edit" class="mt-2 text-center text-gray-500">
      <Editable :path="['personalInfo', 'name']" :value="info.name" placeholder="Your name" />
    </p>

    <div v-if="document.body?.length" class="group/section mt-8 space-y-4">
      <div v-for="(paragraph, i) in document.body" :key="i" class="group/entry relative">
        <Editable tag="p" class="block indent-8" multiline :path="['body', i]" :value="paragraph" placeholder="Paragraph" />
        <EditControls mode="remove" section="body" :index="i" label="Paragraph" />
      </div>
      <EditControls mode="add" section="body" label="Add paragraph" />
    </div>
    <p v-else class="mt-8 text-center italic text-gray-400">
      Your essay will appear here once FirstDraft writes the first draft.
    </p>
  </article>
</template>
