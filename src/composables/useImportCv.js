import { ref } from "vue";
import { useRouter } from "vue-router";
import { useDraftStore } from "@/stores/draft";
import { importDocument } from "@/services/ai";
import { ACCEPTED_FILES, extractText } from "@/services/fileImport";
import { analyzeDocument } from "@/services/quality";
import { DOCUMENT_TYPES } from "@/services/documentBuilder";
import { defaultStyle, formatDesign } from "@/components/templates/themes";

// Upload an existing CV / letter / essay → FirstDraft rebuilds it (one AI
// request), scores it, and opens it in the editor.
export function useImportCv() {
  const router = useRouter();
  const draftStore = useDraftStore();
  const importing = ref(false);
  const stage = ref("");
  const importError = ref("");

  async function importFile(file) {
    if (!file || importing.value) return;
    importing.value = true;
    importError.value = "";
    try {
      stage.value = "Reading your file…";
      const text = await extractText(file);

      stage.value = "Rebuilding it with FirstDraft…";
      const { document, notes } = await importDocument(text);
      const type = DOCUMENT_TYPES[document.documentType] || "Document";
      const quality = analyzeDocument(document);
      const top = quality.issues.find((i) => i.status === "fail") || quality.issues[0];

      stage.value = "Opening your draft…";
      const name = document.personalInfo?.name;
      const draft = await draftStore.createDraftFrom({
        title: name ? `${name} — ${type}` : `Imported ${type}`,
        document,
        template: formatDesign({ style: defaultStyle(document.documentType), accent: "violet" }),
        messages: [
          { role: "user", content: `Import my existing ${type.toLowerCase()} (${file.name})` },
          {
            role: "assistant",
            content:
              `I've imported your ${type.toLowerCase()} — it's in the preview. ${notes}\n\n` +
              `**Strength: ${quality.score}/100 (${quality.label}).**` +
              (top ? ` The biggest win: ${top.title.charAt(0).toLowerCase()}${top.title.slice(1)}.` : "") +
              `\n\nWant me to help make it stronger? I'll only use facts you give me.`,
          },
        ],
      });
      router.push(`/app/draft/${draft.id}`);
    } catch (error) {
      importError.value = error?.message || "Couldn't import that file.";
    } finally {
      importing.value = false;
      stage.value = "";
    }
  }

  // Must be called from a click handler (opens the file picker).
  function pickFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_FILES;
    input.onchange = () => importFile(input.files?.[0]);
    input.click();
  }

  return { importing, stage, importError, pickFile, importFile };
}
