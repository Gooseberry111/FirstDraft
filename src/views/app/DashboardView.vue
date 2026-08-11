<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const goToDraft = () => {
  router.push("/app/draft/new");
};
</script>

<template>
  <div class="p-6 md:p-10">
    <div class="mb-10 flex items-center justify-between">
      <div>
        <h1 class="text-4xl font-semibold tracking-tight">Welcome back</h1>

        <p class="mt-2 text-zinc-400">
          Continue a draft or start something new.
        </p>
      </div>

      <button
        @click="goToDraft"
        class="rounded-xl bg-violet-600 px-4 py-3 font-medium text-white"
      >
        New Draft
      </button>
    </div>

    <!-- Stats -->
    <div class="grid gap-4 md:grid-cols-3">
      <div class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p class="text-sm text-zinc-400">Total Drafts</p>

        <h2 class="mt-3 text-4xl font-semibold">0</h2>
      </div>

      <div class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p class="text-sm text-zinc-400">Resumes</p>

        <h2 class="mt-3 text-4xl font-semibold">0</h2>
      </div>

      <div class="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
        <p class="text-sm text-zinc-400">Cover Letters</p>

        <h2 class="mt-3 text-4xl font-semibold">0</h2>
      </div>
    </div>

    <!-- Recent Drafts -->
    <section class="mt-10">
      <div class="mb-5 flex items-center justify-between">
        <h2 class="text-xl font-semibold">Recent Drafts</h2>
      </div>

      <div
        class="flex min-h-[300px] items-center justify-center rounded-3xl border border-dashed border-zinc-700"
      >
        <div class="text-center">
          <h3 class="text-lg font-medium">No drafts yet</h3>

          <p class="mt-2 text-zinc-400">
            Create your first CV, Resume, Cover Letter or Essay.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
