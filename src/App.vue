<script setup>
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
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
</template>
