<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { Mail, Lock, ArrowRight, Loader2, MailCheck } from "lucide-vue-next";
import AuthLayout from "@/layout/AuthLayout.vue";
import { useAuthStore } from "@/stores/auth";

const MIN_PASSWORD = 8;

const router = useRouter();
const authStore = useAuthStore();

const email = ref("");
const password = ref("");
const errorMessage = ref("");
const isLoading = ref(false);
const confirmationSentTo = ref("");

async function handleSignup() {
  if (isLoading.value) return;

  errorMessage.value = "";

  if (password.value.length < MIN_PASSWORD) {
    errorMessage.value = `Password must be at least ${MIN_PASSWORD} characters.`;
    return;
  }

  try {
    isLoading.value = true;

    const data = await authStore.signUp(email.value.trim(), password.value);

    if (data.session) {
      // Email confirmation is disabled — the user is already signed in.
      router.replace("/app/dashboard");
    } else {
      confirmationSentTo.value = email.value.trim();
    }
  } catch (error) {
    errorMessage.value = error?.message || "Failed to create account.";
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <AuthLayout
    v-if="confirmationSentTo"
    title="Check your email"
    subtitle="One last step before you start writing."
  >
    <div class="card p-6">
      <MailCheck :size="28" class="text-brand-600" />
      <p class="mt-4 text-ink-2">
        We sent a confirmation link to
        <span class="font-medium text-ink">{{ confirmationSentTo }}</span>.
        Open it to activate your account, then sign in.
      </p>
    </div>
    <RouterLink to="/login" class="btn-primary mt-6 w-full py-3">
      Go to sign in
      <ArrowRight :size="18" />
    </RouterLink>
  </AuthLayout>

  <AuthLayout v-else title="Create your account" subtitle="It takes less than a minute.">
    <form class="space-y-5" @submit.prevent="handleSignup">
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
        <label for="password" class="label">Password</label>
        <div class="field">
          <Lock :size="18" aria-hidden="true" />
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            placeholder="At least 8 characters"
            :minlength="MIN_PASSWORD"
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
        {{ isLoading ? "Creating account…" : "Create account" }}
        <ArrowRight v-if="!isLoading" :size="18" />
      </button>
    </form>

    <p class="mt-8 text-center text-sm text-muted">
      Already have an account?
      <RouterLink to="/login" class="font-medium text-brand-600 hover:text-brand-700">
        Sign in
      </RouterLink>
    </p>
  </AuthLayout>
</template>
