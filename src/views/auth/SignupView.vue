<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Mail, Lock, ArrowRight } from "lucide-vue-next";

import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isLoading = ref(false);

async function handleLogin() {
  try {
    isLoading.value = true;
    errorMessage.value = "";

    await authStore.signUp(email.value.trim(), password.value);

    // If email confirmation is enabled
    router.push("/login");

    // If email confirmation is disabled, use:
    // router.push("/app");
  } catch (error) {
    errorMessage.value = error?.message || "Failed to create account";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-zinc-950 text-white">
    <!-- Left Side -->
    <div
      class="hidden lg:flex lg:w-1/2 flex-col justify-between border-r border-white/10 p-12"
    >
      <div>
        <h1 class="text-3xl font-semibold tracking-tight">FirstDraft</h1>

        <p class="mt-4 max-w-md text-zinc-400">
          Build resumes, CVs, cover letters and essays through conversation.
        </p>
      </div>

      <div>
        <h2 class="text-5xl font-semibold leading-tight">
          Turn ideas into polished documents.
        </h2>
      </div>
    </div>

    <!-- Right Side -->
    <div class="flex flex-1 items-center justify-center px-6 py-10">
      <div
        class="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl"
      >
        <div class="mb-8">
          <h2 class="text-3xl font-semibold">Welcome To FirstDraft</h2>

          <p class="mt-2 text-zinc-400">Sign up to start writing.</p>
        </div>

        <form class="space-y-5" @submit.prevent="handleLogin">
          <div>
            <label class="mb-2 block text-sm text-zinc-400"> Email </label>

            <div
              class="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3"
            >
              <Mail :size="18" />

              <input
                v-model="email"
                type="email"
                placeholder="you@example.com"
                class="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm text-zinc-400"> Password </label>

            <div
              class="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3"
            >
              <Lock :size="18" />

              <input
                v-model="password"
                type="password"
                placeholder="••••••••"
                class="w-full bg-transparent outline-none"
              />
            </div>
          </div>

          <p v-if="errorMessage" class="text-sm text-red-400">
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            :disabled="isLoading"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 font-medium text-black transition hover:scale-[1.02] disabled:opacity-50"
          >
            {{ isLoading ? "Creating Account..." : "Sign Up" }}

            <ArrowRight :size="18" />
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-zinc-400">
          Already have an account?

          <RouterLink to="/login" class="text-white"> Login </RouterLink>
        </p>
      </div>
    </div>
  </div>
</template>
