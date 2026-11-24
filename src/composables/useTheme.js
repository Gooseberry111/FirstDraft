import { ref, watch } from "vue";

// "light" | "dark" | "system". Saved per browser; index.html applies it
// before the app loads so there's no flash of the wrong theme.
const STORAGE_KEY = "fd.theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

function readSaved() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

const theme = ref(readSaved());
const isDark = ref(false);

function apply() {
  isDark.value = theme.value === "dark" || (theme.value === "system" && media.matches);
  document.documentElement.classList.toggle("dark", isDark.value);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", isDark.value ? "#0c0a14" : "#f7f5fc");
}

apply();
media.addEventListener("change", apply);
watch(theme, (value) => {
  try {
    if (value === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* storage unavailable */
  }
  apply();
});

export function useTheme() {
  const cycle = () => {
    theme.value = theme.value === "light" ? "dark" : theme.value === "dark" ? "system" : "light";
  };
  return { theme, isDark, cycle };
}
