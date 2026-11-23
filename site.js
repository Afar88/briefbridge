import { createReadAloud, VOICE_SETTING_KEY } from "./read-aloud.js";
import { App, asksToDeleteBrief, asksToSaveBrief, draftFromRequest, parseBriefText, validateBrief } from "./app.js";
import { boot } from "./runtime/index.js";

const DIALOGS = {
  save_brief: {
    title: "Save this project brief?",
    sentence: "Review the project details below. BriefBridge will save this brief in this browser.",
    confirm: "Save brief",
    decline: "Keep editing",
  },
  delete_brief: {
    title: "Delete this saved brief?",
    sentence: "This removes the selected brief from this browser. Export a copy first if you may need it later.",
    confirm: "Delete brief",
    decline: "Keep brief",
  },
};

function detailsFor(item) {
  if (item.action === "save_brief") {
    const check = App.page.checkSaveBrief(item.arguments);
    if (!check.ok) return { refusal: check.reason };
    const b = check.brief;
    const list = items => items.length ? items.join("; ") : "Not specified";
    return {
      "Project": b.title,
      "Client": b.client || "Not specified",
      "Type": b.projectType,
      "Objective": b.objective,
      "Audience": b.audience,
      "Scope": b.scope || "Not specified",
      "Deliverables": list(b.deliverables),
      "Constraints": list(b.constraints),
      "Timeline": b.timeline || "Not specified",
      "Budget": b.budget || "Not specified",
      "Assumptions": list(b.assumptions),
      "Open questions": list(b.openQuestions),
      "Next steps": list(b.nextSteps),
    };
  }
  if (item.action === "delete_brief") {
    const check = App.page.checkDeleteBrief(item.arguments?.id);
    if (!check.ok) return { refusal: check.reason };
    return { "Brief to delete": check.title, "Action": "Remove from this browser's saved library" };
  }
  return {};
}

function openReview(content, exact) {
  return new Promise(resolve => {
    const dialog = document.createElement("dialog");
    dialog.className = "assistant-review";
    dialog.setAttribute("aria-labelledby", "assistant-review-title");
    const heading = document.createElement("h2");
    heading.id = "assistant-review-title";
    heading.tabIndex = -1;
    heading.textContent = content.title;
    const sentence = document.createElement("p");
    sentence.textContent = content.sentence;
    dialog.append(heading, sentence);

    const entries = Object.entries(content.details || {});
    if (entries.length) {
      const list = document.createElement("dl");
      for (const [label, value] of entries) {
        const dt = document.createElement("dt");
        const dd = document.createElement("dd");
        dt.textContent = label;
        dd.textContent = String(value);
        list.append(dt, dd);
      }
      dialog.append(list);
    }
    const technical = document.createElement("details");
    const summary = document.createElement("summary");
    const pre = document.createElement("pre");
    summary.textContent = "Technical details";
    pre.textContent = exact;
    technical.append(summary, pre);
    dialog.append(technical);

    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.textContent = content.confirm;
    confirm.addEventListener("click", () => dialog.close("confirm"));
    const decline = document.createElement("button");
    decline.type = "button";
    decline.className = "assistant-decline";
    decline.textContent = content.decline;
    decline.addEventListener("click", () => dialog.close("decline"));
    dialog.append(confirm, decline);
    dialog.addEventListener("close", () => {
      const approved = dialog.returnValue === "confirm";
      dialog.remove();
      resolve(approved);
    }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
    heading.focus();
  });
}

// Save/delete actions the assistant asked to run during the current turn.
const reviewedThisTurn = new Set();

async function reviewActions(engine, items, fallback) {
  const ownOrigin = location.origin;
  if (items.length > 1 && items.some(item => item.origin === ownOrigin && DIALOGS[item.action])) {
    throw new Error("Save or delete actions need their own confirmation. Ask the assistant to do that separately; nothing ran.");
  }
  if (items.length === 1 && items[0].origin === ownOrigin && DIALOGS[items[0].action]) {
    const item = items[0];
    const details = detailsFor(item);
    if (details.refusal) throw new Error(details.refusal);
    const content = { ...DIALOGS[item.action], details };
    const exact = `${item.action} on ${item.origin} (${item.effect})\n${JSON.stringify(item.arguments, null, 2)}`;
    reviewedThisTurn.add(item.action);
    const approved = await openReview(content, exact);
    document.querySelector("#ns-input")?.focus();
    return approved;
  }
  return fallback(items);
}

// Fallback for a reply that contains a complete brief but no tool call: parse
// it into the form fields. Skipped whenever the form already holds content,
// so a fill_brief_form tool call or visitor typing always wins.
function maybeFillBriefFromReply(text) {
  const draft = App.page.getWorkspaceState().currentDraft;
  const empty = !draft.title && !draft.objective && !draft.audience && !(draft.deliverables || []).length;
  if (!empty) return;
  const brief = parseBriefText(text);
  if (!brief) return;
  App.page.fillBriefForm(brief);
  const notice = document.querySelector("#form-notice");
  if (notice) {
    notice.textContent = "The assistant filled the brief form. Review it, then save when ready.";
    notice.className = "notice success";
  }
  document.querySelector("#brief-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setFormNotice(text, kind = "success") {
  const notice = document.querySelector("#form-notice");
  if (!notice) return;
  notice.textContent = text;
  notice.className = `notice ${kind}`;
}

function reviewItem(action, args) {
  return { action, origin: location.origin, effect: "irreversible", arguments: args };
}

// A clear save request always reaches the save dialog: when the assistant
// did not call save_brief itself, the page opens the same review dialog for
// the brief in the form. Nothing is saved unless the visitor confirms.
async function ensureSaveReviewed(requests) {
  let draft = App.page.getWorkspaceState().currentDraft;
  if (!validateBrief(draft).ok) {
    const fromRequest = requests.map(draftFromRequest).find(Boolean);
    if (fromRequest) {
      App.page.fillBriefForm(fromRequest);
      draft = App.page.getWorkspaceState().currentDraft;
    }
  }
  const item = reviewItem("save_brief", draft);
  const details = detailsFor(item);
  if (details.refusal) {
    setFormNotice("Brief not saved. Add the missing details first.", "error");
    return;
  }
  const exact = `save_brief on ${item.origin} (page review)\n${JSON.stringify(draft, null, 2)}`;
  const approved = await openReview({ ...DIALOGS.save_brief, details }, exact);
  if (!approved) { setFormNotice("Not saved. Keep editing."); return; }
  const result = App.page.saveBrief(draft);
  setFormNotice(result.ok ? "Brief saved." : `Not saved. ${result.reason}`, result.ok ? "success" : "error");
}

// Same guarantee for deletion. Only a brief that the request clearly names
// (or the only saved brief) is offered, and only the dialog can delete it.
async function ensureDeleteReviewed(message) {
  const saved = App.page.getWorkspaceState().savedBriefs;
  const lower = String(message || "").toLowerCase();
  const named = saved.filter(item => item.title && lower.includes(item.title.toLowerCase()));
  const target = named.length === 1 ? named[0] : saved.length === 1 ? saved[0] : null;
  if (!target) {
    if (saved.length) setFormNotice("Pick the brief to delete in Saved briefs.", "error");
    return;
  }
  const item = reviewItem("delete_brief", { id: target.id });
  const details = detailsFor(item);
  if (details.refusal) return;
  const exact = `delete_brief on ${item.origin} (page review)\n${JSON.stringify(item.arguments, null, 2)}`;
  const approved = await openReview({ ...DIALOGS.delete_brief, details }, exact);
  if (!approved) return;
  const result = App.page.deleteBrief(target.id);
  setFormNotice(result.ok ? "Brief deleted." : `Not deleted. ${result.reason}`, result.ok ? "success" : "error");
}

function watchAssistantReplies(engine) {
  const original = engine.streamTurn.bind(engine);
  const requests = [];
  engine.streamTurn = (userText, ...rest) => {
    reviewedThisTurn.clear();
    requests.unshift(String(userText || ""));
    const stream = original(userText, ...rest);
    const wrapped = (async function* () {
      let completed = null;
      for await (const event of stream) {
        if (event?.type === "turn.completed") completed = event.result;
        yield event;
      }
      try { maybeFillBriefFromReply(completed?.text); } catch { /* never break a reply */ }
      try {
        if (asksToSaveBrief(userText) && !reviewedThisTurn.has("save_brief")) await ensureSaveReviewed(requests);
        else if (asksToDeleteBrief(userText) && !reviewedThisTurn.has("delete_brief")) await ensureDeleteReviewed(userText);
      } catch (error) { console.error("BriefBridge review failed", error); }
    })();
    wrapped.steer = stream.steer;
    return wrapped;
  };
}

async function startAssistant() {
  const status = document.querySelector("#assistant-status");
  const siteBase = new URL("./", import.meta.url).href;
  try {
    const { engine } = await boot("#agent-app", {
      originUrl: siteBase,
      sandboxWorkerUrl: new URL("runtime/sandbox-worker.js", siteBase).href,
    });
    const fallbackReview = engine.onActionConfirm;
    engine.onActionConfirm = items => reviewActions(engine, items, fallbackReview);
    watchAssistantReplies(engine);
    const needsKey = !engine.mockLLM && (!engine.byokKey || engine.byokKey === "demo");
    status.textContent = needsKey
      ? "Runtime ready. Add your Otari API key in AI model settings to start chatting."
      : "BriefBridge agents are ready. Describe the project you want to clarify.";
    if (!needsKey) {
      const first = document.querySelector("#ns-msgs .ns-msg.bot");
      if (first) first.textContent = "Hi, I'm BriefBridge. Tell me what you're trying to create, who it's for and what you already know. I'll help turn it into a clear project brief.";
    }
    window.dispatchEvent(new CustomEvent("briefbridge:assistant-ready"));
  } catch (error) {
    status.textContent = "The AI assistant could not start. You can still build and save briefs using the form.";
    console.error("BriefBridge runtime failed to start", error);
  }
}

// Read aloud: the finished brief and each assistant reply.
const voiceSelect = document.querySelector("#voice-source");
const voiceNote = document.querySelector("#voice-note");
const readSetting = () => { try { return localStorage.getItem(VOICE_SETTING_KEY) === "otari" ? "otari" : "browser"; } catch { return "browser"; } };
if (voiceSelect) {
  voiceSelect.value = readSetting();
  voiceSelect.addEventListener("change", () => {
    try { localStorage.setItem(VOICE_SETTING_KEY, voiceSelect.value); } catch {}
    if (voiceNote) voiceNote.textContent = "";
  });
}
const reader = createReadAloud({
  getSetting: readSetting,
  // The visitor's own applied setup for this tab; it is only sent to that router.
  getOtari: () => {
    try {
      return { key: sessionStorage.getItem("nsweb-byok-tab-key") || "", router: sessionStorage.getItem("nsweb-byok-router") || "" };
    } catch { return null; }
  },
  onNote: text => { if (voiceNote) voiceNote.textContent = text; },
  onChange: owner => {
    document.querySelectorAll("[data-read-aloud]").forEach(button => {
      const on = button === owner;
      button.textContent = on ? "Stop" : "Read aloud";
      button.setAttribute("aria-pressed", String(on));
    });
  },
});
const toggleRead = (button, textFor) => {
  if (reader.owner === button) { reader.stop(); return; }
  if (voiceNote) voiceNote.textContent = "";
  reader.read(textFor(), button);
};
const briefButton = document.querySelector("#read-brief");
if (briefButton) {
  briefButton.dataset.readAloud = "brief";
  briefButton.addEventListener("click", () => toggleRead(briefButton, () => {
    const preview = document.querySelector("#brief-preview");
    return [preview?.querySelector("h3")?.textContent, preview?.querySelector("pre")?.textContent].filter(Boolean).join(".\n");
  }));
}
function addReplyButton(bubble) {
  if (!bubble.classList.contains("bot") || bubble.classList.contains("ns-turn-status") || bubble.dataset.readAloudReady) return;
  bubble.dataset.readAloudReady = "true";
  const row = document.createElement("div");
  row.className = "ns-read-row";
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Read aloud";
  button.dataset.readAloud = "reply";
  button.setAttribute("aria-pressed", "false");
  button.setAttribute("aria-label", "Read this reply aloud");
  button.addEventListener("click", () => toggleRead(button, () => bubble.innerText || bubble.textContent || ""));
  row.append(button);
  bubble.after(row);
}
function watchReplies() {
  const msgs = document.querySelector("#ns-msgs");
  if (!msgs) return;
  msgs.querySelectorAll(".ns-msg.bot").forEach(addReplyButton);
  new MutationObserver(records => {
    for (const record of records) {
      record.addedNodes.forEach(node => {
        if (node.nodeType === 1 && node.matches(".ns-msg.bot")) addReplyButton(node);
      });
    }
  }).observe(msgs, { childList: true });
}
window.addEventListener("briefbridge:assistant-ready", watchReplies, { once: true });
window.addEventListener("pagehide", () => reader.stop());

// Success notes fade after 4 seconds (CSS). Restart the fade whenever the
// note changes, so a second message in a row is still shown. Errors stay.
function restartNoticeFade() {
  const notice = document.querySelector("#form-notice");
  if (!notice) return;
  new MutationObserver(() => {
    notice.style.animation = "none";
    void notice.offsetWidth;
    notice.style.animation = "";
  }).observe(notice, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });
}
restartNoticeFade();

startAssistant();
