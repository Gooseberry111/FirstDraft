<script setup>
import { ref } from "vue";
import { Lock, Loader2, Check } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";

const MIN_PASSWORD = 8;
const auth = useAuthStore();

const password = ref("");
const confirmPassword = ref("");
const saving = ref(false);
const error = ref("");
const saved = ref(false);

async function changePassword() {
  error.value = "";
  saved.value = false;

  if (password.value.length < MIN_PASSWORD) {
    error.value = `Password must be at least ${MIN_PASSWORD} characters.`;
    return;
  }
  if (password.value !== confirmPassword.value) {
    error.value = "Passwords don't match.";
    return;
  }

  saving.value = true;
  try {
    await auth.updatePassword(password.value);
    saved.value = true;
    password.value = "";
    confirmPassword.value = "";
  } catch (e) {
    error.value = e?.message || "Couldn't update your password.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
    <h1 class="text-3xl font-semibold tracking-tight text-white">Settings</h1>
    <p class="mt-2 text-muted">Manage your account security.</p>

    <section class="card mt-8 p-6">
      <h2 class="font-semibold text-white">Change password</h2>
      <p class="mt-1 text-sm text-muted">Use at least {{ MIN_PASSWORD }} characters.</p>

      <form class="mt-6 grid gap-5 sm:max-w-sm" @submit.prevent="changePassword">
        <div>
          <label for="new-password" class="label">New password</label>
          <div class="field">
            <Lock :size="18" aria-hidden="true" />
            <input
              id="new-password"
              v-model="password"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
        </div>

        <div>
          <label for="confirm-password" class="label">Confirm new password</label>
          <div class="field">
            <Lock :size="18" aria-hidden="true" />
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              required
            />
          </div>
        </div>

        <p v-if="error" role="alert" class="text-sm text-red-300">{{ error }}</p>
        <p v-if="saved" role="status" class="flex items-center gap-2 text-sm text-emerald-400">
          <Check :size="16" /> Password updated.
        </p>

        <button type="submit" :disabled="saving" class="btn-primary justify-self-start">
          <Loader2 v-if="saving" :size="17" class="animate-spin" />
          {{ saving ? "Saving…" : "Update password" }}
        </button>
      </form>
    </section>
  </div>
</template>
