import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import AppLayout from "@/layout/AppLayout.vue";
import LoginView from "@/views/auth/LoginView.vue";
import SignupView from "@/views/auth/SignupView.vue";

const routes = [
  {
    path: "/",
    name: "landing",
    component: () => import("@/views/LandingView.vue"),
    meta: { guestOnly: true, title: "Write a CV that gets you noticed" },
  },
  {
    path: "/s/:shareId",
    name: "shared",
    component: () => import("@/views/SharedView.vue"),
    meta: { public: true, title: "Shared document" },
  },
  {
    path: "/forgot-password",
    name: "forgot-password",
    component: () => import("@/views/auth/ForgotPasswordView.vue"),
    meta: { guestOnly: true, title: "Reset password" },
  },
  {
    path: "/reset-password",
    name: "reset-password",
    component: () => import("@/views/auth/ResetPasswordView.vue"),
    meta: { public: true, title: "Choose a new password" },
  },
  { path: "/app", redirect: "/app/dashboard" },

  {
    path: "/login",
    name: "login",
    component: LoginView,
    meta: { guestOnly: true, title: "Sign in" },
  },
  {
    path: "/signup",
    name: "signup",
    component: SignupView,
    meta: { guestOnly: true, title: "Create account" },
  },

  {
    path: "/app",
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "dashboard",
        name: "dashboard",
        component: () => import("@/views/app/DashboardView.vue"),
        meta: { title: "Dashboard" },
      },
      {
        path: "profile",
        name: "profile",
        component: () => import("@/views/app/ProfileView.vue"),
        meta: { title: "Profile" },
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("@/views/app/SettingsView.vue"),
        meta: { title: "Settings" },
      },
    ],
  },

  // The editor is full-screen with its own sidebar, so it sits outside AppLayout.
  {
    path: "/app/draft/:id",
    name: "draft",
    component: () => import("@/views/app/DraftView.vue"),
    meta: { requiresAuth: true, title: "Editor" },
  },

  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.init();

  if (to.matched.some((r) => r.meta.requiresAuth) && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: "dashboard" };
  }
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · FirstDraft` : "FirstDraft";
});

export default router;
