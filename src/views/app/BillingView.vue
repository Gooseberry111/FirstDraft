<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CheckCircle2, Crown, Loader2, ShieldCheck, XCircle } from "lucide-vue-next";
import { formatPrice, useBillingStore } from "@/stores/billing";
import { relativeTime } from "@/utils/format";

const billing = useBillingStore();
const route = useRoute();
const router = useRouter();

const history = ref([]);
const verifying = ref(false);
const verifyResult = ref(null); // "success" | "pending" | "failed"
const toggling = ref(false);
const error = ref("");

const ent = computed(() => billing.entitlement);
const proUntil = computed(() =>
  ent.value?.pro_until
    ? new Date(ent.value.pro_until).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : "",
);

onMounted(async () => {
  await billing.load().catch(() => {});
  billing.loadPlans().catch(() => {});

  // Back from Paystack: confirm the payment.
  const reference = route.query.reference || route.query.trxref;
  if (reference) {
    verifying.value = true;
    try {
      const result = await billing.verify(String(reference));
      verifyResult.value = result?.ok ? "success" : result?.status === "failed" || result?.status === "abandoned" ? "failed" : "pending";
    } catch (e) {
      error.value = e?.message || "Couldn't confirm the payment.";
    } finally {
      verifying.value = false;
      router.replace({ query: {} });
    }
  }

  history.value = await billing.listPayments().catch(() => []);
});

async function toggleBilling() {
  toggling.value = true;
  error.value = "";
  try {
    await billing.setBillingEnabled(!billing.billingEnabled);
  } catch (e) {
    error.value = e?.message || "Couldn't change the setting.";
  } finally {
    toggling.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 md:px-10 md:py-12">
    <h1 class="text-3xl font-semibold tracking-tight text-ink">Plan & billing</h1>
    <p class="mt-2 text-muted">Your plan and payments.</p>

    <!-- Payment result -->
    <div v-if="verifying" class="card mt-6 flex items-center gap-3 p-5 text-ink-2">
      <Loader2 :size="20" class="animate-spin" /> Confirming your payment…
    </div>
    <div v-else-if="verifyResult === 'success'" class="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-5 text-emerald-800 ring-1 ring-emerald-200">
      <CheckCircle2 :size="22" /> Payment received. Pro is active until {{ proUntil }}.
    </div>
    <div v-else-if="verifyResult === 'pending'" class="mt-6 rounded-2xl bg-amber-50 p-5 text-amber-800 ring-1 ring-amber-200">
      Your payment is still processing. Pro will switch on automatically as soon as it's confirmed.
    </div>
    <div v-else-if="verifyResult === 'failed'" class="mt-6 flex items-center gap-3 rounded-2xl bg-rose-50 p-5 text-rose-700 ring-1 ring-rose-200">
      <XCircle :size="22" /> The payment didn't go through. You haven't been charged.
    </div>

    <!-- Current plan -->
    <section class="card mt-6 p-6">
      <div v-if="!ent" class="grid place-items-center py-6 text-muted"><Loader2 :size="20" class="animate-spin" /></div>

      <div v-else-if="ent.is_admin" class="flex items-center gap-4">
        <span class="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow"><ShieldCheck :size="22" /></span>
        <div>
          <p class="text-lg font-bold text-ink">Admin account</p>
          <p class="text-sm text-muted">Full access, no limits, never charged.</p>
        </div>
      </div>

      <div v-else-if="ent.is_pro" class="flex items-center gap-4">
        <span class="grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white shadow-glow"><Crown :size="22" /></span>
        <div class="flex-1">
          <p class="text-lg font-bold text-ink">Pro</p>
          <p class="text-sm text-muted">Active until {{ proUntil }}.</p>
        </div>
        <button v-if="ent.billing_enabled" class="btn-secondary" @click="billing.openPaywall('Buying again adds 30 days to your current pass.')">Add 30 days</button>
      </div>

      <div v-else class="flex flex-wrap items-center gap-4">
        <div class="flex-1">
          <p class="text-lg font-bold text-ink">Free</p>
          <p class="text-sm text-muted">
            <template v-if="ent.billing_enabled">
              {{ Math.min(ent.docs_created, ent.free_docs) }} of {{ ent.free_docs }} free document{{ ent.free_docs === 1 ? "" : "s" }} used.
            </template>
            <template v-else>Everything is free right now.</template>
          </p>
        </div>
        <button v-if="ent.billing_enabled" class="btn-primary" @click="billing.openPaywall()">
          <Crown :size="16" /> Get Pro
          <span v-if="billing.proPlan" class="opacity-80">· {{ formatPrice(billing.proPlan.prices[billing.defaultCurrency], billing.defaultCurrency) }}</span>
        </button>
      </div>
    </section>

    <!-- Admin controls -->
    <section v-if="ent?.is_admin" class="card mt-6 p-6">
      <h2 class="font-semibold text-ink">Admin: charging users</h2>
      <p class="mt-1 text-sm text-muted">
        When this is on, new users get {{ ent.free_docs }} free document and then need a Pro pass. Turn it on only after
        Paystack is set up and verified.
      </p>
      <div class="mt-4 flex items-center justify-between gap-4 rounded-xl bg-subtle px-4 py-3">
        <div class="text-sm">
          <p class="font-semibold text-ink">Charging is {{ billing.billingEnabled ? "ON" : "OFF" }}</p>
          <p class="text-muted">
            Paystack:
            <span v-if="!billing.plans">checking…</span>
            <span v-else-if="!billing.plans.configured" class="font-semibold text-amber-600">not connected</span>
            <span v-else-if="billing.plans.testMode" class="font-semibold text-amber-600">connected (test mode)</span>
            <span v-else class="font-semibold text-emerald-600">connected (live)</span>
          </p>
        </div>
        <button
          class="relative h-7 w-12 shrink-0 rounded-full transition"
          :class="billing.billingEnabled ? 'bg-brand-gradient' : 'bg-line-strong'"
          role="switch"
          :aria-checked="billing.billingEnabled"
          aria-label="Charge users"
          :disabled="toggling"
          @click="toggleBilling"
        >
          <span class="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all" :class="billing.billingEnabled ? 'left-6' : 'left-1'" />
        </button>
      </div>
    </section>

    <p v-if="error" class="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">{{ error }}</p>

    <!-- History -->
    <section v-if="history.length" class="mt-8">
      <h2 class="mb-3 font-semibold text-ink">Payment history</h2>
      <ul class="card divide-y divide-line">
        <li v-for="p in history" :key="p.reference" class="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
          <span>
            <span class="block font-medium text-ink">Pro pass · {{ formatPrice(p.amount / 100, p.currency) }}</span>
            <span class="text-xs text-muted">{{ relativeTime(p.paid_at || p.created_at) }}</span>
          </span>
          <span
            class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="{
              'bg-emerald-100 text-emerald-700': p.status === 'success',
              'bg-amber-100 text-amber-700': p.status === 'pending',
              'bg-rose-100 text-rose-700': p.status === 'failed',
            }"
          >
            {{ p.status === "success" ? "Paid" : p.status === "pending" ? "Not completed" : "Failed" }}
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>
