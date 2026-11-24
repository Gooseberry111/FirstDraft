<script setup>
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, Loader2, Lock } from "lucide-vue-next";
import AuthLayout from "@/layout/AuthLayout.vue";
import { useAuthStore } from "@/stores/auth";

// Opened from the reset email. Supabase signs the user in with a temporary
// recovery session (from the link), which lets them set a new password.
const MIN_PASSWORD = 8;
const auth = useAuthStore();
const router = useRouter();

const ready = ref(false);
const hasSession = ref(false);
const password = ref("");
const confirmPassword = ref("");
const saving = ref(false);
const error = ref("");

onMounted(async () => {
  await auth.init();
  hasSession.value = !!auth.user;
  ready.value = true;
});

async function save() {
  error.value = "";
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
    router.replace("/app/dashboard");
  } catch (e) {
    error.value = e?.message || "Couldn't update your password.";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AuthLayout title="Choose a new password" subtitle="Use at least 8 characters.">
    <div v-if="!ready" class="grid place-items-center py-10 text-muted"><Loader2 :size="22" class="animate-spin" /></div>

    <div v-else-if="!hasSession" class="card p-6">
      <p class="text-ink-2">This reset link is invalid or has expired. Request a new one and use it within an hour.</p>
      <RouterLink to="/forgot-password" class="btn-primary mt-5 w-full">Send a new link</RouterLink>
    </div>

    <form v-else class="space-y-5" @submit.prevent="save">
      <div>
        <label for="new-password" class="label">New password</label>
        <div class="field">
          <Lock :size="18" aria-hidden="true" />
          <input id="new-password" v-model="password" type="password" autocomplete="new-password" :minlength="MIN_PASSWORD" required />
        </div>
      </div>
      <div>
        <label for="confirm-password" class="label">Confirm new password</label>
        <div class="field">
          <Lock :size="18" aria-hidden="true" />
          <input id="confirm-password" v-model="confirmPassword" type="password" autocomplete="new-password" required />
        </div>
      </div>
      <p v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
      <button type="submit" :disabled="saving" class="btn-primary w-full py-3">
        <Loader2 v-if="saving" :size="18" class="animate-spin" />
        {{ saving ? "Saving…" : "Save new password" }}
        <ArrowRight v-if="!saving" :size="18" />
      </button>
    </form>
  </AuthLayout>
</template>
