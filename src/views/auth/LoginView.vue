<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-vue-next";
import AuthLayout from "@/layout/AuthLayout.vue";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isLoading = ref(false);

async function handleLogin() {
  if (isLoading.value) return;

  try {
    isLoading.value = true;
    errorMessage.value = "";

    await authStore.signIn(email.value.trim(), password.value);

    const redirect = route.query.redirect;
    router.replace(
      typeof redirect === "string" && redirect.startsWith("/app")
        ? redirect
        : "/app/dashboard",
    );
  } catch (error) {
    errorMessage.value = error?.message || "Couldn't sign you in.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Welcome back" subtitle="Sign in to continue writing.">
    <form class="space-y-5" @submit.prevent="handleLogin">
      <div>
        <label for="email" class="label">Email</label>
        <div class="field">
          <Mail :size="18" aria-hidden="true" />
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
      </div>

      <div>
        <div class="mb-1.5 flex items-center justify-between">
          <label for="password" class="label mb-0">Password</label>
          <RouterLink to="/forgot-password" class="text-sm font-medium text-brand-600 hover:text-brand-700">Forgot password?</RouterLink>
        </div>
        <div class="field">
          <Lock :size="18" aria-hidden="true" />
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      <p
        v-if="errorMessage"
        role="alert"
        class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
      >
        {{ errorMessage }}
      </p>

      <button type="submit" :disabled="isLoading" class="btn-primary w-full py-3">
        <Loader2 v-if="isLoading" :size="18" class="animate-spin" />
        {{ isLoading ? "Signing in…" : "Sign in" }}
        <ArrowRight v-if="!isLoading" :size="18" />
      </button>
    </form>

    <p class="mt-8 text-center text-sm text-muted">
      Don't have an account?
      <RouterLink to="/signup" class="font-medium text-brand-600 hover:text-brand-700">
        Create one
      </RouterLink>
    </p>
  </AuthLayout>
</template>
