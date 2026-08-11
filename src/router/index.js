import { createRouter, createWebHistory } from "vue-router";

import LoginView from "@/views/auth/LoginView.vue";
import SignupView from "@/views/auth/SignupView.vue";

import DashboardView from "@/views/app/DashboardView.vue";
import DraftView from "@/views/app/DraftView.vue";
import ProfileView from "@/views/app/ProfileView.vue";
import SettingsView from "@/views/app/SettingsView.vue";
import AppLayout from "../layout/AppLayout.vue";

const routes = [
  {
    path: "/",
    redirect: "/app/dashboard",
  },

  {
    path: "/login",
    name: "login",
    component: LoginView,
  },

  {
    path: "/signup",
    name: "signup",
    component: SignupView,
  },

  {
    path: "/app/dashboard",
    name: "dashboard",
    component: DashboardView,
  },

  {
    path: "/app/draft/:id",
    name: "draft",
    component: DraftView,
  },

  {
    path: "/app/profile",
    name: "profile",
    component: ProfileView,
  },

  {
    path: "/app/settings",
    name: "settings",
    component: SettingsView,
  },
  {
    path: "/app/applayout",
    name: "applayout",
    component: AppLayout,
  },
  {
    path: "/app/draft/:id",
    name: "draft",
    component: DraftView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
