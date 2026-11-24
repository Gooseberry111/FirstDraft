<script setup>
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useBillingStore } from "@/stores/billing";
import UpgradeDialog from "@/components/billing/UpgradeDialog.vue";

const auth = useAuthStore();
const billing = useBillingStore();

// Keep the plan (free / Pro / admin) up to date for whoever is signed in.
watch(
  () => auth.user?.id,
  (id) => {
    if (id) billing.load().catch(() => {});
    else billing.entitlement = null;
  },
  { immediate: true },
);
const route = useRoute();
const router = useRouter();

// If the session ends (sign-out in another tab, expired token), leave the app.
watch(
  () => auth.user,
  (user) => {
    if (!user && auth.ready && route.matched.some((r) => r.meta.requiresAuth)) {
      router.replace({ name: "login" });
    }
  },
);
</script>

<template>
  <RouterView />
  <UpgradeDialog />
</template>
