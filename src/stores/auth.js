import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";

let initPromise = null;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null,
    ready: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    // Resolves once the stored session has been read. Safe to call repeatedly.
    init() {
      if (!initPromise) {
        initPromise = supabase.auth.getSession().then(({ data }) => {
          this.user = data.session?.user ?? null;
          this.ready = true;

          supabase.auth.onAuthStateChange((_event, session) => {
            this.user = session?.user ?? null;
          });
        });
      }

      return initPromise;
    },

    async signUp(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      // `session` is null when email confirmation is required.
      this.user = data.session ? data.user : null;
      return data;
    },

    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      this.user = data.user;
      return data;
    },

    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },

    async updatePassword(password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },

    async signOut() {
      await supabase.auth.signOut();
      this.user = null;
    },
  },
});
