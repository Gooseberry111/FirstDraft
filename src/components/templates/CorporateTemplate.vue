<script setup>
defineProps({
  document: Object,
});
</script>

<template>
  <div class="space-y-8">
    <div class="border-b pb-6">
      <h1 class="text-4xl font-bold">
        {{ document.personalInfo.name || "Your Name" }}
      </h1>

      <p class="mt-2 text-sm text-gray-600">
        {{ document.personalInfo.email }}
        •
        {{ document.personalInfo.phone }}
        •
        {{ document.personalInfo.location }}
      </p>
    </div>

    <section v-if="document.summary">
      <h2 class="mb-3 text-lg font-bold uppercase">Professional Profile</h2>

      <p>
        {{ document.summary }}
      </p>
    </section>

    <section v-if="document.experience?.length">
      <h2 class="mb-3 text-lg font-bold uppercase">Experience</h2>

      <div
        v-for="(job, index) in document.experience"
        :key="index"
        class="mb-5"
      >
        <h3 class="font-semibold">
          {{ job.position }}
        </h3>

        <p class="text-gray-600">
          {{ job.company }}
        </p>

        <p class="text-sm">
          {{ job.date }}
        </p>

        <p class="mt-2">
          {{ job.description }}
        </p>
      </div>
    </section>

    <section v-if="document.education?.length">
      <h2 class="mb-3 text-lg font-bold uppercase">Education</h2>

      <div v-for="(edu, index) in document.education" :key="index">
        {{ edu.degree }} — {{ edu.school }}
      </div>
    </section>

    <section v-if="document.certifications?.length">
      <h2 class="mb-3 text-lg font-bold uppercase">Certifications</h2>

      <div v-for="(cert, index) in document.certifications" :key="index">
        {{ cert }}
      </div>
    </section>

    <section v-if="document.skills?.length">
      <h2 class="mb-3 text-lg font-bold uppercase">Skills</h2>

      <p>
        {{ document.skills.join(" • ") }}
      </p>
    </section>
  </div>
</template>
