import { boot } from "./runtime/index.js";
import { isStructuredBrief } from "./partner-result.js";

const status = document.querySelector("#assistant-status");
const resultPanel = document.querySelector("#partner-result");
const resultNote = document.querySelector("#partner-result-note");
const resultText = document.querySelector("#partner-result-text");

function showPartnerReply(value) {
  const text = typeof value === "string"
    ? value
    : String(value?.text || value?.answer || "");
  if (!text.trim()) return;

  const hasDraft = isStructuredBrief(text);
  resultText.textContent = text.trim();
  resultNote.textContent = hasDraft
    ? "BriefBridge returned a draft. Review it before you use it."
    : "BriefBridge replied, but its partner mode does not return drafts yet.";
  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function watchCompletedTurns(engine) {
  const original = engine.streamTurn.bind(engine);
  engine.streamTurn = (userText, ...rest) => {
    const stream = original(userText, ...rest);
    const wrapped = (async function* () {
      let completed = null;
      for await (const event of stream) {
        if (event?.type === "turn.completed") completed = event.result;
        yield event;
      }
      if (completed?.text) showPartnerReply(completed.text);
    })();
    wrapped.steer = stream.steer;
    return wrapped;
  };
}

async function startShopStart() {
  const siteBase = new URL("./", import.meta.url).href;
  try {
    const { engine } = await boot("#agent-app", {
      originUrl: siteBase,
      sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href,
    });
    watchCompletedTurns(engine);
    status.textContent = engine.byokKey && engine.byokKey !== "demo"
      ? "Ready. Tell us what your website needs."
      : "Add your Otari key below to start.";
    const input = document.querySelector("#ns-input");
    if (input) {
      input.placeholder = "I need a website for my salon in Benin City";
      input.setAttribute("aria-label", "Describe the website you need");
    }
  } catch (error) {
    status.textContent = "ShopStart could not start. Refresh and try again.";
    console.error("ShopStart runtime failed to start", error);
  }
}

startShopStart();
