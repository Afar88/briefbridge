// ShopStart → BriefBridge handoff bar, receipt line and self-playing sample.
// Built with DOM methods only (no innerHTML), so peer text is never parsed as HTML.
import { HANDOFF_STEPS, nextHandoffState, receiptParts } from "./handoff-status.js";

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function renderStepList(list, stage) {
  list.replaceChildren(...HANDOFF_STEPS.map((label, i) => {
    let state = "todo";
    if (stage === "failed") state = i === 0 ? "done" : i === 1 ? "failed" : "todo";
    else if (stage === 2 || i < stage) state = "done";
    else if (i === stage) state = "active";
    const item = el("li", `handoff-step is-${state}`);
    item.append(el("span", "handoff-dot"), el("span", "handoff-label", label));
    if (state === "failed") item.append(el("span", "handoff-meta", "failed"));
    return item;
  }));
}

export function createHandoffTracker({ bar, list, receipt, getModel }) {
  let state = null;
  const show = () => {
    bar.hidden = false;
    renderStepList(list, state.stage);
  };
  return {
    reset() {
      state = null;
      bar.hidden = true;
      list.replaceChildren();
      receipt.hidden = true;
      receipt.textContent = "";
    },
    onTurnStart() {
      state = { stage: 0, startedAt: Date.now(), endedAt: null, invocationId: null };
      receipt.hidden = true;
      receipt.textContent = "";
    },
    onEvent(event) {
      const before = state?.stage;
      state = nextHandoffState(state, event);
      if (state.stage !== -1 && state.stage !== before) show();
    },
    // Called when the brief is shown. Writes the receipt from real values only.
    finish() {
      if (!state || state.stage === -1 || state.stage === "failed") return;
      state = { ...state, stage: 2, endedAt: state.endedAt ?? Date.now() };
      show();
      receipt.textContent = receiptParts({ ...state, model: getModel?.() }).join(" · ");
      receipt.hidden = false;
    },
  };
}

const SAMPLE_BRIEF = [
  "Project: Salon website, Benin City",
  "Goal: Get more bookings online",
  "Scope: 4 pages, WhatsApp booking",
  "Open questions: Price list ready?",
];

export function playSample(root) {
  if (!root) return;
  const list = root.querySelector(".sample-steps");
  const lines = root.querySelector(".sample-brief");
  const receipt = root.querySelector(".sample-receipt");
  const draw = (stage, count, done) => {
    renderStepList(list, stage);
    lines.replaceChildren(...SAMPLE_BRIEF.slice(0, count).map(t => el("li", null, t)));
    receipt.hidden = !done;
  };
  if (reduceMotion()) { draw(2, SAMPLE_BRIEF.length, true); return; }
  const frames = [[0, 0, false], [1, 0, false], [1, 1, false], [1, 2, false], [1, 3, false], [2, 4, false], [2, 4, true]];
  let i = 0;
  const tick = () => {
    draw(...frames[i]);
    i += 1;
    if (i < frames.length) setTimeout(tick, 900);
    else setTimeout(() => { i = 0; tick(); }, 4500);
  };
  tick();
}
