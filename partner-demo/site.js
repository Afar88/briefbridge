import { boot } from "./runtime/index.js";
import { isStructuredBrief } from "./partner-result.js";
import { briefBridgePeerText, briefBridgeUrl } from "./brief-handoff.js";
import { createHandoffTracker, playSample } from "./handoff-ui.js";

const status = document.querySelector("#assistant-status");
const resultPanel = document.querySelector("#partner-result");
const resultNote = document.querySelector("#partner-result-note");
const resultText = document.querySelector("#partner-result-text");
const resultLink = document.querySelector("#open-briefbridge-result");
let activeEngine = null;
const handoff = createHandoffTracker({
  bar: document.querySelector("#handoff-bar"),
  list: document.querySelector("#handoff-steps"),
  receipt: document.querySelector("#partner-receipt"),
  getModel: () => activeEngine?.modelOverride || "",
});
playSample(document.querySelector("#handoff-sample"));

function showPartnerReply(value, fromPeer = false) {
  const text = typeof value === "string"
    ? value
    : String(value?.text || value?.answer || "");
  if (!text.trim()) return;

  const hasDraft = isStructuredBrief(text);
  resultText.textContent = text;
  resultNote.textContent = hasDraft
    ? "BriefBridge returned a draft. Review it before you use it."
    : "BriefBridge replied without a full brief. Open BriefBridge to finish it.";
  resultLink.href = briefBridgeUrl(text);
  resultPanel.hidden = false;
  if (fromPeer) handoff.finish();
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function watchCompletedTurns(engine) {
  const original = engine.streamTurn.bind(engine);
  engine.streamTurn = (userText, ...rest) => {
    const stream = original(userText, ...rest);
    handoff.onTurnStart();
    const wrapped = (async function* () {
      let completed = null;
      let peerReply = null;
      for await (const event of stream) {
        const peerText = briefBridgePeerText(event);
        if (peerText) peerReply = peerText;
        handoff.onEvent(event);
        if (event?.type === "turn.completed") completed = event.result;
        yield event;
      }
      // Show BriefBridge's full peer completion, not ShopStart's summary.
      // Keep the old root reply as a fallback when no peer reply was returned.
      if (peerReply) showPartnerReply(peerReply, true);
      else if (completed?.text) showPartnerReply(completed.text);
    })();
    wrapped.steer = stream.steer;
    return wrapped;
  };
}

document.addEventListener("click", event => {
  if (!event.target.closest?.("#ns-newchat")) return;
  resultPanel.hidden = true;
  resultText.textContent = "";
  resultNote.textContent = "";
  resultLink.href = "https://briefbridge-bpxd.onrender.com";
  handoff.reset();
});

async function startShopStart() {
  const siteBase = new URL("./", import.meta.url).href;
  try {
    const { engine } = await boot("#agent-app", {
      originUrl: siteBase,
      sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href,
    });
    activeEngine = engine;
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
