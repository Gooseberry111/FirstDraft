import { onBeforeUnmount, ref } from "vue";

// Voice typing with the browser's built-in speech recognition (Chrome, Edge,
// Safari). It runs in the browser, so it costs nothing and doesn't use any
// of the app's AI quota. `onText` receives the full text as it's spoken.
export function useSpeechInput(onText) {
  const Recognition = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
  const supported = !!Recognition;
  const listening = ref(false);
  const error = ref("");
  let recognition = null;

  function start(currentText = "") {
    if (!supported || listening.value) return;
    error.value = "";
    const before = currentText.trim() ? `${currentText.trim()} ` : "";
    let finalText = "";

    recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interim += transcript;
      }
      onText(`${before}${finalText}${interim}`.replace(/\s+/g, " ").trimStart());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        error.value = "Microphone access is blocked. Allow it in your browser's site settings.";
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        error.value = "Voice typing stopped. Tap the mic to try again.";
      }
    };
    recognition.onend = () => {
      listening.value = false;
      recognition = null;
    };

    try {
      recognition.start();
      listening.value = true;
    } catch {
      error.value = "Couldn't start voice typing.";
    }
  }

  function stop() {
    recognition?.stop();
  }

  function toggle(currentText) {
    if (listening.value) stop();
    else start(currentText);
  }

  onBeforeUnmount(() => recognition?.abort());

  return { supported, listening, error, toggle, stop };
}
