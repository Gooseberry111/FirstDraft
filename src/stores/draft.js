import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";
import { createEmptyDocument } from "@/services/documentBuilder";
import { useAuthStore } from "@/stores/auth";

// The signed-in user id, without a network round trip.
async function currentUserId() {
  const auth = useAuthStore();
  if (auth.user?.id) return auth.user.id;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
}

export const WELCOME_MESSAGE =
  "Hi! I'm FirstDraft. What would you like to create today?\n\n- CV\n- Resume\n- Cover Letter\n- Essay";

const now = () => new Date().toISOString();

export const useDraftStore = defineStore("draft", {
  state: () => ({
    drafts: [],
    draftsLoaded: false,
    currentDraft: null,
  }),

  actions: {
    async fetchDrafts() {
      const { data, error } = await supabase
        .from("drafts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;

      this.drafts = data || [];
      this.draftsLoaded = true;
      return this.drafts;
    },

    // One request: the welcome message is shown by the app, not stored.
    async createDraft() {
      const userId = await currentUserId();
      if (!userId) throw new Error("Please sign in to create a draft.");

      const { data, error } = await supabase
        .from("drafts")
        .insert({
          user_id: userId,
          title: "Untitled Draft",
          document_data: createEmptyDocument("resume"),
          // null = "not chosen yet", so FirstDraft can recommend one
          // (the column defaults to 'modern').
          template: null,
        })
        .select()
        .single();

      if (error) throw error;

      this.currentDraft = data;
      this.drafts.unshift(data);
      return data;
    },

    // Creates a draft that already has content (import / tailor).
    async createDraftFrom({ title, document, template = null, messages = [] }) {
      const userId = await currentUserId();
      if (!userId) throw new Error("Please sign in to create a draft.");

      const { data, error } = await supabase
        .from("drafts")
        .insert({ user_id: userId, title: title || "Untitled Draft", document_data: document, template })
        .select()
        .single();
      if (error) throw error;

      for (const m of messages) await this.addMessage(data.id, m.role, m.content);
      await this.addVersion(data.id, document, template, "Created").catch(() => {});

      this.drafts.unshift(data);
      return data;
    },

    // ---------- Version history ----------
    async listVersions(draftId) {
      const { data, error } = await supabase
        .from("draft_versions")
        .select("id, document_data, template, label, created_at")
        .eq("draft_id", draftId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data || [];
    },

    async addVersion(draftId, document, template, label = "") {
      const { error } = await supabase
        .from("draft_versions")
        .insert({ draft_id: draftId, document_data: document, template, label });
      if (error) throw error;
    },

    // ---------- Sharing ----------
    async setSharing(id, enabled) {
      return this.updateDraft(id, { share_id: enabled ? crypto.randomUUID() : null });
    },

    async getSharedDraft(shareId) {
      const { data, error } = await supabase.rpc("get_shared_draft", { p_share_id: shareId });
      if (error) throw error;
      return data?.[0] || null;
    },

    async getDraft(id) {
      const { data, error } = await supabase
        .from("drafts")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      this.currentDraft = data;
      return data;
    },

    async deleteDraft(id) {
      const { error: messagesError } = await supabase
        .from("messages")
        .delete()
        .eq("draft_id", id);
      if (messagesError) throw messagesError;

      const { error } = await supabase.from("drafts").delete().eq("id", id);
      if (error) throw error;

      this.drafts = this.drafts.filter((d) => d.id !== id);
      if (this.currentDraft?.id === id) this.currentDraft = null;
    },

    async getMessages(draftId) {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("draft_id", draftId)
        .order("created_at");

      if (error) throw error;
      return data || [];
    },

    async addMessage(draftId, role, content) {
      const { data, error } = await supabase
        .from("messages")
        .insert({ draft_id: draftId, role, content })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async updateDraft(id, fields) {
      const { data, error } = await supabase
        .from("drafts")
        .update({ ...fields, updated_at: now() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (this.currentDraft?.id === id) this.currentDraft = data;

      const index = this.drafts.findIndex((d) => d.id === id);
      if (index !== -1) this.drafts.splice(index, 1);
      this.drafts.unshift(data);

      return data;
    },

    updateDraftTitle(id, title) {
      return this.updateDraft(id, { title });
    },

    saveDocument(id, document) {
      return this.updateDraft(id, { document_data: document });
    },

    updateTemplate(id, template) {
      return this.updateDraft(id, { template });
    },
  },
});
