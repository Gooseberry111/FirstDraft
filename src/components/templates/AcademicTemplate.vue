<script setup>
defineProps({
  document: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <div class="space-y-8">
    <!-- Header -->
    <div class="border-b border-gray-300 pb-6">
      <h1 class="text-4xl font-bold text-gray-900">
        {{ document.personalInfo.name || "Your Name" }}
      </h1>

      <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
        <span v-if="document.personalInfo.email">
          {{ document.personalInfo.email }}
        </span>

        <span v-if="document.personalInfo.phone">
          {{ document.personalInfo.phone }}
        </span>

        <span v-if="document.personalInfo.location">
          {{ document.personalInfo.location }}
        </span>

        <span v-if="document.personalInfo.linkedin">
          {{ document.personalInfo.linkedin }}
        </span>

        <span v-if="document.personalInfo.website">
          {{ document.personalInfo.website }}
        </span>
      </div>
    </div>

    <!-- Education -->
    <section v-if="document.education?.length">
      <h2
        class="mb-4 border-b border-gray-300 pb-2 text-lg font-bold uppercase tracking-wider"
      >
        Education
      </h2>

      <div
        v-for="(education, index) in document.education"
        :key="index"
        class="mb-5"
      >
        <div class="flex justify-between">
          <div>
            <h3 class="font-semibold">
              {{ education.degree }}
            </h3>

            <p class="text-gray-600">
              {{ education.school }}
            </p>
          </div>

          <span class="text-sm text-gray-500">
            {{ education.date }}
          </span>
        </div>
      </div>
    </section>
    <section v-if="document.research?.length" class="mt-8">
      <h2 class="mb-3 border-b pb-2 font-semibold">Research</h2>

      <div
        v-for="(research, index) in document.research"
        :key="index"
        class="mb-4"
      >
        <h3 class="font-medium">
          {{ research.title }}
        </h3>

        <p class="text-sm text-gray-600">
          {{ research.institution }}
        </p>

        <p class="text-sm">
          {{ research.description }}
        </p>
      </div>
    </section>

    <section v-if="document.publications?.length" class="mt-8">
      <h2 class="mb-3 border-b pb-2 font-semibold">Publications</h2>

      <div
        v-for="(publication, index) in document.publications"
        :key="index"
        class="mb-2"
      >
        <p>
          {{ publication.title }}
        </p>

        <p class="text-sm text-gray-600">
          {{ publication.publisher }}
          {{ publication.date }}
        </p>
      </div>
    </section>

    <!-- Projects / Research -->
    <section v-if="document.projects?.length">
      <h2
        class="mb-4 border-b border-gray-300 pb-2 text-lg font-bold uppercase tracking-wider"
      >
        Research & Projects
      </h2>

      <div
        v-for="(project, index) in document.projects"
        :key="index"
        class="mb-5"
      >
        <h3 class="font-semibold">
          {{ project.name }}
        </h3>

        <p v-if="project.description" class="mt-2 text-gray-700">
          {{ project.description }}
        </p>
      </div>
    </section>

    <!-- Certifications -->
    <section v-if="document.certifications?.length">
      <h2
        class="mb-4 border-b border-gray-300 pb-2 text-lg font-bold uppercase tracking-wider"
      >
        Certifications
      </h2>

      <ul class="space-y-2">
        <li
          v-for="(certification, index) in document.certifications"
          :key="index"
        >
          {{ certification }}
        </li>
      </ul>
    </section>

    <!-- Achievements -->
    <section v-if="document.achievements?.length">
      <h2
        class="mb-4 border-b border-gray-300 pb-2 text-lg font-bold uppercase tracking-wider"
      >
        Awards & Achievements
      </h2>

      <ul class="space-y-2">
        <li v-for="(achievement, index) in document.achievements" :key="index">
          {{ achievement }}
        </li>
      </ul>
    </section>

    <!-- Skills -->
    <section v-if="document.skills?.length">
      <h2
        class="mb-4 border-b border-gray-300 pb-2 text-lg font-bold uppercase tracking-wider"
      >
        Skills
      </h2>

      <p class="leading-7">
        {{ document.skills.join(" • ") }}
      </p>
    </section>

    <!-- Experience -->
    <section v-if="document.experience?.length">
      <h2
        class="mb-4 border-b border-gray-300 pb-2 text-lg font-bold uppercase tracking-wider"
      >
        Professional Experience
      </h2>

      <div
        v-for="(job, index) in document.experience"
        :key="index"
        class="mb-5"
      >
        <div class="flex justify-between">
          <div>
            <h3 class="font-semibold">
              {{ job.position }}
            </h3>

            <p class="text-gray-600">
              {{ job.company }}
            </p>
          </div>

          <span class="text-sm text-gray-500">
            {{ job.date }}
          </span>
        </div>

        <p v-if="job.description" class="mt-2 text-gray-700">
          {{ job.description }}
        </p>
      </div>
    </section>
  </div>
</template>
