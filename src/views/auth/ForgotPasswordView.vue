<script setup>
import { ref } from "vue";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-vue-next";
import AuthLayout from "@/layout/AuthLayout.vue";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const email = ref("");
const sending = ref(false);
const sentTo = ref("");
const error = ref("");

async function send() {
  if (sending.value) return;
  sending.value = true;
  error.value = "";
  try {
    await auth.requestPasswordReset(email.value.trim());
    sentTo.value = email.value.trim();
  } catch (e) {
    error.value = e?.message || "Couldn't send the reset email.";
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <AuthLayout
    :title="sentTo ? 'Check your email' : 'Reset your password'"
    :subtitle="sentTo ? 'A reset link is on its way.' : 'We\'ll email you a link to choose a new one.'"
  >
    <div v-if="sentTo" class="card p-6">
      <MailCheck :size="28" class="text-brand-600" />
      <p class="mt-4 text-ink-2">
        If an account exists for <span class="font-semibold text-ink">{{ sentTo }}</span>, you'll get an email with a link to
        reset your password. Check your spam folder if it doesn't arrive in a few minutes.
      </p>
    </div>

    <form v-else class="space-y-5" @submit.prevent="send">
      <div>
        <label for="email" class="label">Email</label>
        <div class="field">
          <Mail :size="18" aria-hidden="true" />
          <input id="email" v-model="email" type="email" autocomplete="email" placeholder="you@example.com" required />
        </div>
      </div>
      <p v-if="error" role="alert" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error }}</p>
      <button type="submit" :disabled="sending" class="btn-primary w-full py-3">
        <Loader2 v-if="sending" :size="18" class="animate-spin" />
        {{ sending ? "Sending…" : "Send reset link" }}
      </button>
    </form>

    <RouterLink to="/login" class="btn-ghost mt-6 w-full">
      <ArrowLeft :size="16" /> Back to sign in
    </RouterLink>
  </AuthLayout>
</template>
