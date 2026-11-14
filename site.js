import { App } from "./app.js";
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
    return {
      "Project": b.title,
      "Client": b.client || "Not specified",
      "Type": b.projectType,
      "Objective": b.objective,
      "Deliverables": b.deliverables.join("; "),
      "Timeline": b.timeline || "Not specified",
      "Budget": b.budget || "Not specified",
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
    const approved = await openReview(content, exact);
    document.querySelector("#ns-input")?.focus();
    return approved;
  }
  return fallback(items);
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

startAssistant();
