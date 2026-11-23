import { inject, provide } from "vue";

// The editor provides an API through this key; templates use it to make text
// clickable/editable. When nothing is provided (e.g. the print copy), the
// templates render as plain, read-only documents.
const API_KEY = Symbol("document-edit-api");
const ACTIVE_KEY = Symbol("document-edit-active");

export function provideEditApi(api) {
  provide(API_KEY, api);
}

// Called by DocumentRenderer to switch editing on or off for its subtree.
export function provideEditing(enabled) {
  const api = inject(API_KEY, null);
  provide(ACTIVE_KEY, enabled ? api : null);
}

export function useEditing() {
  return inject(ACTIVE_KEY, null);
}

export const plaintextOnlySupported = (() => {
  try {
    if (typeof document === "undefined") return false;
    const el = document.createElement("div");
    el.contentEditable = "plaintext-only";
    return el.contentEditable === "plaintext-only";
  } catch {
    return false;
  }
})();
