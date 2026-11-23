// Read aloud for briefs and assistant replies. The browser's built-in voice
// (Web Speech API) is the default. Otari's text-to-speech is an opt-in Voice
// setting that uses the visitor's own key; when it fails, the browser voice
// takes over and a short note says so.

export const VOICE_SETTING_KEY = "briefbridge.voice.v1";
export const FALLBACK_NOTE = "Otari voice unavailable. Using browser voice.";
export const UNSUPPORTED_NOTE = "This browser can't read aloud.";
export const NO_VOICE_NOTE = "No voice available on this device.";
const MAX_CHARS = 4000;
const SPEECH_MODEL_ID = /(?:^|[\\/_-])(tts|text-to-speech|speech)(?:$|[\\/_-])/i;

// Plain text for speaking: drop Markdown marks so the voice does not read symbols.
export function speechText(input) {
  return String(input ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*|__|[*_`>|]/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, ".\n")
    .trim()
    .slice(0, MAX_CHARS);
}

// A speech model from the router's live catalog, never a chat model.
export function pickSpeechModel(catalog, preferred = "alibaba/qwen3-tts") {
  if (!Array.isArray(catalog)) return "";
  const speech = catalog.filter((item) => typeof item?.id === "string" && (item.type === "speech" || SPEECH_MODEL_ID.test(item.id)));
  return (speech.find((item) => item.id === preferred) || speech[0])?.id || "";
}

export function createReadAloud({
  synth = globalThis.speechSynthesis,
  Utterance = globalThis.SpeechSynthesisUtterance,
  fetchImpl = globalThis.fetch?.bind(globalThis),
  makeAudio = (url) => new Audio(url),
  makeUrl = (blob) => URL.createObjectURL(blob),
  getSetting = () => "browser",
  getOtari = () => null,
  onNote = () => {},
  onChange = () => {},
} = {}) {
  let active = null;
  let speechModel = "";

  const finish = (token) => {
    if (!active || active.token !== token) return;
    active = null;
    onChange(null);
  };

  const speakWithBrowser = (text, token) => {
    if (!synth || !Utterance) {
      onNote(UNSUPPORTED_NOTE);
      finish(token);
      return false;
    }
    synth.cancel();
    const utterance = new Utterance(text);
    utterance.onend = () => finish(token);
    utterance.onerror = (event) => {
      if (active?.token === token && !["canceled", "interrupted"].includes(event?.error)) onNote(NO_VOICE_NOTE);
      finish(token);
    };
    active.utterance = utterance;
    synth.speak(utterance);
    return true;
  };

  const speakWithOtari = async (text, token) => {
    const otari = getOtari();
    if (!otari?.key || !otari?.router || !fetchImpl) return false;
    const base = otari.router.replace(/\/+$/, "");
    const headers = { Authorization: `Bearer ${otari.key}` };
    try {
      if (!speechModel) {
        const list = await fetchImpl(`${base}/models`, { headers, cache: "no-store" });
        speechModel = list.ok ? pickSpeechModel((await list.json())?.data) : "";
      }
      if (!speechModel || active?.token !== token) return false;
      const response = await fetchImpl(`${base}/audio/speech`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ model: speechModel, input: text, voice: "Cherry", response_format: "mp3" }),
      });
      const type = response.headers?.get?.("content-type") || "";
      if (!response.ok || !type.startsWith("audio/")) return false;
      const blob = await response.blob();
      if (active?.token !== token) return true;
      const audio = makeAudio(makeUrl(blob));
      audio.onended = () => finish(token);
      audio.onerror = () => finish(token);
      active.audio = audio;
      await audio.play();
      return true;
    } catch {
      return false;
    }
  };

  const stop = () => {
    if (!active) return;
    const { audio } = active;
    active = null;
    try { synth?.cancel(); } catch {}
    if (audio) { try { audio.pause(); } catch {} }
    onChange(null);
  };

  const read = async (rawText, owner = null) => {
    stop();
    const text = speechText(rawText);
    if (!text) return "none";
    const token = Symbol("read");
    active = { token, owner };
    onChange(owner);
    if (getSetting() === "otari") {
      if (await speakWithOtari(text, token)) return "otari";
      if (active?.token !== token) return "stopped";
      onNote(FALLBACK_NOTE);
    }
    return speakWithBrowser(text, token) ? "browser" : "none";
  };

  return { read, stop, get owner() { return active?.owner ?? null; } };
}
