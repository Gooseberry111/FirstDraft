<script setup>
import { computed } from "vue";
import Editable from "./Editable.vue";
import EditControls from "./EditControls.vue";
import { useEditing } from "./editing";

// Cover letters (modern / bold / classic) and essays (classic / modern).
const props = defineProps({
  document: { type: Object, required: true },
  variant: { type: String, default: "modern" },
});

const edit = useEditing();
const info = computed(() => props.document.personalInfo || {});
const isLetter = computed(() => props.document.documentType === "cover_letter");
const v = computed(() => props.variant);

const CONTACT_FIELDS = [
  { key: "email", placeholder: "Email" },
  { key: "phone", placeholder: "Phone" },
  { key: "location", placeholder: "Location" },
  { key: "linkedin", placeholder: "LinkedIn" },
  { key: "website", placeholder: "Website" },
];
const contactFields = computed(() => CONTACT_FIELDS.filter((f) => edit || info.value[f.key]));

const today = new Date().toLocaleDateString(undefined, {
  day: "numeric",
  month: "long",
  year: "numeric",
});
</script>

<template>
  <!-- ===================== Cover letter ===================== -->
  <article
    v-if="isLetter"
    :class="v === 'classic' ? 'font-serif text-[14.5px] leading-[1.7] text-gray-800' : 'font-doc text-[14px] leading-[1.75] text-gray-700'"
  >
    <!-- Header -->
    <header
      class="group/entry"
      :class="{
        'doc-bleed-x doc-bleed-top rounded-[var(--band-radius,10px)] bg-gradient-to-br from-[color:var(--accent)] to-[color:var(--accent-ink)] px-[var(--band-px,28px)] pb-7 pt-[var(--band-py,24px)] text-white': v === 'bold',
        'border-b border-gray-300 pb-4': v === 'classic',
      }"
    >
      <Editable
        tag="h1"
        :class="{
          'text-[28px] font-extrabold tracking-tight text-white': v === 'bold',
          'text-[28px] font-bold tracking-tight text-gray-900': v === 'modern',
          'text-[24px] font-semibold text-gray-900': v === 'classic',
        }"
        :path="['personalInfo', 'name']"
        :value="info.name"
        placeholder="Your Name"
      />
      <p
        class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px]"
        :class="v === 'bold' ? 'text-white/85' : v === 'modern' ? 'text-[color:var(--accent-ink)]' : 'text-gray-600'"
      >
        <Editable
          v-for="field in contactFields"
          :key="field.key"
          :class="!info[field.key] && 'hidden group-hover/entry:inline focus:inline'"
          :path="['personalInfo', field.key]"
          :value="info[field.key]"
          :placeholder="`+ ${field.placeholder}`"
        />
      </p>
      <div v-if="v === 'modern'" class="mt-5 h-[3px] w-12 rounded-full bg-[color:var(--accent)]" />
    </header>

    <p class="mt-7" :class="v === 'classic' ? 'text-gray-600' : 'text-[13px] font-medium text-gray-500'">{{ today }}</p>

    <Editable
      v-if="document.recipient || edit"
      tag="p"
      class="mt-4 block"
      multiline
      :path="['recipient']"
      :value="document.recipient"
      placeholder="Recipient — e.g. Hiring Manager, Company name"
    />

    <p
      v-if="document.title || edit"
      class="mt-5 font-semibold"
      :class="v === 'classic' ? 'text-gray-900' : 'text-[color:var(--accent-ink)]'"
    >
      Re: <Editable :path="['title']" :value="document.title" placeholder="Subject, e.g. Application for Product Designer" />
    </p>

    <div v-if="document.body?.length" class="group/section mt-5 space-y-4">
      <div v-for="(paragraph, i) in document.body" :key="i" class="group/entry relative">
        <Editable tag="p" class="block" multiline :path="['body', i]" :value="paragraph" placeholder="Paragraph" />
        <EditControls mode="remove" section="body" :index="i" label="Paragraph" />
      </div>
      <EditControls mode="add" section="body" label="Add paragraph" />
    </div>
    <p v-else class="mt-6 italic text-gray-400">
      Your letter will appear here once FirstDraft writes the first draft.
    </p>

    <div v-if="document.body?.length" class="doc-entry mt-8">
      <Editable tag="p" :path="['closing']" :value="document.closing || 'Sincerely,'" placeholder="Sincerely," />
      <p
        class="mt-6 font-semibold"
        :class="v === 'classic' ? 'text-gray-900' : 'text-[16px] text-[color:var(--accent-ink)]'"
      >
        {{ info.name }}
      </p>
    </div>
  </article>

  <!-- ===================== Essay ===================== -->
  <article
    v-else
    :class="v === 'modern' ? 'font-doc text-[14.5px] leading-[1.85] text-gray-700' : 'font-serif text-[15px] leading-[1.8] text-gray-800'"
  >
    <header :class="v === 'modern' ? '' : 'text-center'">
      <p v-if="v === 'modern'" class="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--accent)]">
        Essay
      </p>
      <Editable
        tag="h1"
        class="block"
        :class="v === 'modern' ? 'text-[30px] font-bold leading-tight tracking-tight text-gray-900' : 'text-[26px] font-semibold leading-tight text-gray-900'"
        :path="['title']"
        :value="document.title"
        placeholder="Essay title"
      />
      <p v-if="info.name || edit" class="mt-2" :class="v === 'modern' ? 'text-[13px] font-medium text-[color:var(--accent-ink)]' : 'text-gray-500'">
        <Editable :path="['personalInfo', 'name']" :value="info.name" placeholder="Your name" />
      </p>
      <div v-if="v === 'modern'" class="mt-5 h-[3px] w-12 rounded-full bg-[color:var(--accent)]" />
      <div v-else class="mx-auto mt-5 flex w-40 items-center gap-2">
        <span class="h-px flex-1 bg-[color:var(--accent-line)]" />
        <span class="h-1.5 w-1.5 rotate-45 bg-[color:var(--accent)]" />
        <span class="h-px flex-1 bg-[color:var(--accent-line)]" />
      </div>
    </header>

    <div v-if="document.body?.length" class="group/section mt-8 space-y-4">
      <div v-for="(paragraph, i) in document.body" :key="i" class="group/entry relative">
        <Editable
          tag="p"
          class="block"
          :class="v === 'modern' ? '' : 'indent-8'"
          multiline
          :path="['body', i]"
          :value="paragraph"
          placeholder="Paragraph"
        />
        <EditControls mode="remove" section="body" :index="i" label="Paragraph" />
      </div>
      <EditControls mode="add" section="body" label="Add paragraph" />
    </div>
    <p v-else class="mt-8 italic text-gray-400" :class="v === 'modern' ? '' : 'text-center'">
      Your essay will appear here once FirstDraft writes the first draft.
    </p>
  </article>
</template>
