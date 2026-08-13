<script setup>
defineProps({
  document: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <!-- Header -->
  <div class="border-b border-gray-300 pb-6">
    <h1 class="text-3xl font-bold tracking-tight text-gray-900">
      {{ document.personalInfo?.name || "Your Name" }}
    </h1>

    <div
      v-if="
        document.personalInfo?.email ||
        document.personalInfo?.phone ||
        document.personalInfo?.location ||
        document.personalInfo?.linkedin ||
        document.personalInfo?.website
      "
      class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500"
    >
      <span v-if="document.personalInfo?.email">
        {{ document.personalInfo.email }}
      </span>

      <span v-if="document.personalInfo?.phone">
        {{ document.personalInfo.phone }}
      </span>

      <span v-if="document.personalInfo?.location">
        {{ document.personalInfo.location }}
      </span>

      <span v-if="document.personalInfo?.linkedin">
        {{ document.personalInfo.linkedin }}
      </span>

      <span v-if="document.personalInfo?.website">
        {{ document.personalInfo.website }}
      </span>
    </div>
  </div>

  <!-- Empty State -->
  <div
    v-if="
      !document.summary &&
      !document.experience?.length &&
      !document.education?.length &&
      !document.skills?.length &&
      !document.projects?.length &&
      !document.certifications?.length
    "
    class="flex min-h-[800px] items-center justify-center"
  >
    <div class="text-center">
      <h2 class="text-2xl font-semibold text-gray-800">
        Your document will appear here
      </h2>

      <p class="mt-2 text-sm text-gray-500">
        Start chatting with FirstDraft to build your resume.
      </p>
    </div>
  </div>

  <!-- Summary -->
  <section v-if="document.summary" class="mt-8">
    <h2
      class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
    >
      Professional Summary
    </h2>

    <p class="mt-3 text-sm leading-6 text-gray-700">
      {{ document.summary }}
    </p>
  </section>

  <!-- Experience -->
  <section v-if="document.experience?.length" class="mt-8">
    <h2
      class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
    >
      Experience
    </h2>

    <div v-for="(job, index) in document.experience" :key="index" class="mt-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="font-semibold text-gray-900">
            {{ job.position }}
          </h3>

          <p class="text-sm text-gray-600">
            {{ job.company }}
          </p>
        </div>

        <span class="shrink-0 text-sm text-gray-500">
          {{ job.date }}
        </span>
      </div>

      <p v-if="job.description" class="mt-2 text-sm leading-6 text-gray-700">
        {{ job.description }}
      </p>
    </div>
  </section>

  <!-- Education -->
  <section v-if="document.education?.length" class="mt-8">
    <h2
      class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
    >
      Education
    </h2>

    <div
      v-for="(education, index) in document.education"
      :key="index"
      class="mt-5"
    >
      <div class="flex items-start justify-between gap-4">
        <div>
          <h3 class="font-semibold text-gray-900">
            {{ education.degree }}
          </h3>

          <p class="text-sm text-gray-600">
            {{ education.school }}
          </p>
        </div>

        <span class="shrink-0 text-sm text-gray-500">
          {{ education.date }}
        </span>
      </div>
    </div>
  </section>

  <!-- Skills -->
  <section v-if="document.skills?.length" class="mt-8">
    <h2
      class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
    >
      Skills
    </h2>

    <p class="mt-3 text-sm leading-6 text-gray-700">
      {{ document.skills.join(" • ") }}
    </p>
  </section>

  <!-- Projects -->
  <section v-if="document.projects?.length" class="mt-8">
    <h2
      class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
    >
      Projects
    </h2>

    <div
      v-for="(project, index) in document.projects"
      :key="index"
      class="mt-5"
    >
      <h3 class="font-semibold text-gray-900">
        {{ project.name }}
      </h3>

      <p
        v-if="project.description"
        class="mt-1 text-sm leading-6 text-gray-700"
      >
        {{ project.description }}
      </p>
    </div>
  </section>

  <!-- Certifications -->
  <section v-if="document.certifications?.length" class="mt-8">
    <h2
      class="border-b border-gray-300 pb-2 text-sm font-bold uppercase tracking-widest text-gray-800"
    >
      Certifications
    </h2>

    <ul class="mt-3 space-y-2">
      <li
        v-for="(certification, index) in document.certifications"
        :key="index"
        class="text-sm text-gray-700"
      >
        {{ certification }}
      </li>
    </ul>
  </section>
</template>
