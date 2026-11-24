import { defineStore } from "pinia";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

async function payments(action, body = {}) {
  const { data, error } = await supabase.functions.invoke("payments", { body: { action, ...body } });
  if (error) {
    let message = "Couldn't reach the payment service. Please try again.";
    if (error instanceof FunctionsHttpError) {
      const details = await error.context.json().catch(() => null);
      if (details?.error) message = details.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

// People outside Nigeria see a USD price when it's available.
const inNigeria = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Lagos";
  } catch {
    return true;
  }
};

export const formatPrice = (amount, currency) =>
  new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

export const useBillingStore = defineStore("billing", {
  state: () => ({
    entitlement: null, // from my_entitlement()
    plans: null, // { configured, testMode, currencies, plans: [...] }
    paywallOpen: false,
    paywallReason: "",
  }),

  getters: {
    billingEnabled: (s) => !!s.entitlement?.billing_enabled,
    isAdmin: (s) => !!s.entitlement?.is_admin,
    isPro: (s) => !!s.entitlement?.is_pro,
    canCreate: (s) => s.entitlement?.can_create !== false,
    proPlan: (s) => s.plans?.plans?.find((p) => p.id === "pro30") || null,
    defaultCurrency: (s) => {
      const currencies = s.plans?.currencies || ["NGN"];
      return !inNigeria() && currencies.includes("USD") ? "USD" : currencies[0];
    },
  },

  actions: {
    async load() {
      const { data, error } = await supabase.rpc("my_entitlement");
      if (!error) this.entitlement = data;
      return this.entitlement;
    },

    async loadPlans() {
      if (!this.plans) this.plans = await payments("plans");
      return this.plans;
    },

    openPaywall(reason = "") {
      this.paywallReason = reason;
      this.paywallOpen = true;
      this.loadPlans().catch(() => {});
    },

    // Sends the user to Paystack's secure payment page.
    async checkout(currency) {
      const { url } = await payments("checkout", { plan: "pro30", currency });
      window.location.assign(url);
    },

    async verify(reference) {
      const result = await payments("verify", { reference });
      await this.load();
      return result;
    },

    async listPayments() {
      const { data, error } = await supabase
        .from("payments")
        .select("reference, plan, amount, currency, status, paid_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },

    async setBillingEnabled(enabled) {
      const { error } = await supabase
        .from("app_settings")
        .update({ value: enabled, updated_at: new Date().toISOString() })
        .eq("key", "billing_enabled");
      if (error) throw error;
      await this.load();
    },
  },
});

export const isPaymentRequired = (error) => /PAYMENT_REQUIRED/.test(error?.message || "");
