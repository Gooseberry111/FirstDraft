<script setup>
import { computed, ref, watch } from "vue";
import { Check, Crown, Loader2, Lock } from "lucide-vue-next";
import BaseModal from "@/components/BaseModal.vue";
import { formatPrice, useBillingStore } from "@/stores/billing";

const billing = useBillingStore();
const currency = ref("NGN");
const paying = ref(false);
const error = ref("");

const BENEFITS = [
  "Unlimited resumes, CVs, cover letters and essays",
  "Tailor your CV to any job, with a matching cover letter",
  "Import your old CV and improve it",
  "Expert reviews and more AI messages each day",
];

watch(
  () => billing.paywallOpen,
  (open) => {
    if (!open) return;
    error.value = "";
    billing.loadPlans().then(() => (currency.value = billing.defaultCurrency)).catch(() => {});
  },
);

const price = computed(() => billing.proPlan?.prices?.[currency.value]);
const currencies = computed(() => billing.plans?.currencies || ["NGN"]);

async function pay() {
  paying.value = true;
  error.value = "";
  try {
    await billing.checkout(currency.value);
  } catch (e) {
    error.value = e?.message || "Couldn't start the payment.";
    paying.value = false;
  }
}
</script>

<template>
  <BaseModal :open="billing.paywallOpen" title="Upgrade to Pro" subtitle="One payment, no subscription" :icon="Crown" @close="billing.paywallOpen = false">
    <p v-if="billing.paywallReason" class="mb-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-ink-2 ring-1 ring-brand-100">
      {{ billing.paywallReason }}
    </p>

    <div class="card p-5">
      <div class="flex items-end justify-between gap-3">
        <div>
          <p class="text-sm font-semibold text-muted">30-day Pro pass</p>
          <p class="mt-1 text-3xl font-extrabold text-ink">
            <template v-if="price">{{ formatPrice(price, currency) }}</template>
            <Loader2 v-else :size="22" class="animate-spin text-muted" />
          </p>
        </div>
        <div v-if="currencies.length > 1" class="flex rounded-lg bg-subtle p-0.5" role="radiogroup" aria-label="Currency">
          <button
            v-for="c in currencies"
            :key="c"
            role="radio"
            :aria-checked="currency === c"
            class="rounded-md px-3 py-1 text-sm font-semibold transition"
            :class="currency === c ? 'bg-surface text-ink shadow-sm' : 'text-muted'"
            @click="currency = c"
          >
            {{ c }}
          </button>
        </div>
      </div>
      <p class="mt-1 text-xs text-muted">Doesn't renew. Pay again only if you need more time.</p>

      <ul class="mt-5 space-y-2.5">
        <li v-for="b in BENEFITS" :key="b" class="flex items-start gap-2.5 text-sm text-ink-2">
          <Check :size="16" class="mt-0.5 shrink-0 text-emerald-600" /> {{ b }}
        </li>
      </ul>
    </div>

    <p v-if="billing.plans && !billing.plans.configured" class="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
      Payments aren't switched on yet. Please check back soon.
    </p>
    <p v-if="error" class="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{{ error }}</p>

    <button class="btn-primary mt-5 w-full py-3.5 text-base" :disabled="paying || !price || !billing.plans?.configured" @click="pay">
      <Loader2 v-if="paying" :size="18" class="animate-spin" />
      {{ paying ? "Opening secure payment…" : price ? `Pay ${formatPrice(price, currency)}` : "Pay" }}
    </button>
    <p class="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
      <Lock :size="12" /> Secure payment by Paystack. Card, bank transfer or USSD.
      <span v-if="billing.plans?.testMode" class="font-semibold text-amber-600">Test mode</span>
    </p>
  </BaseModal>
</template>
