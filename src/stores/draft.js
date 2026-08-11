import { defineStore } from "pinia";
import { supabase } from "@/lib/supabase";

export const useDraftStore = defineStore("draft", {
  state: () => ({
    drafts: [],
    currentDraft: null,
  }),

  actions: {
    async fetchDrafts() {
      const { data } = await supabase
        .from("drafts")
        .select("*")
        .order("updated_at", { ascending: false });

      this.drafts = data || [];
    },

    async createDraft() {
      const sessionResult = await supabase.auth.getSession();

      console.log("SESSION:", sessionResult);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("USER:", user);

      if (!user) {
        throw new Error("No authenticated user");
      }

      const { data, error } = await supabase
        .from("drafts")
        .insert({
          user_id: user.id,
          title: "Untitled Draft",
        })
        .select()
        .single();

      if (error) throw error;

      this.currentDraft = data;

      return data;
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
        .insert({
          draft_id: draftId,
          role,
          content,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    async createDraft() {
      const sessionResult = await supabase.auth.getSession();

      console.log("SESSION:", sessionResult);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      console.log("USER:", user);

      if (!user) {
        throw new Error("No authenticated user");
      }

      const emptyDocument = {
        documentType: "resume",
        personalInfo: {
          name: "",
          email: "",
          phone: "",
          location: "",
          linkedin: "",
          website: "",
        },
        summary: "",
        experience: [],
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        achievements: [],
      };

      const { data, error } = await supabase
        .from("drafts")
        .insert({
          user_id: user.id,
          title: "Untitled Draft",
          document_data: emptyDocument,
        })
        .select()
        .single();

      if (error) throw error;

      this.currentDraft = data;

      return data;
    },
    async updateDraftTitle(id, title) {
      const { error } = await supabase
        .from("drafts")
        .update({ title })
        .eq("id", id);

      if (error) throw error;
    },
    async saveDocument(id, document) {
      const { data, error } = await supabase
        .from("drafts")
        .update({
          document_data: document,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      this.currentDraft = data;

      return data;
    },
  },
});
