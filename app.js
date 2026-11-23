const STORE_KEY = "briefbridge.saved.v1";
const DRAFT_KEY = "briefbridge.draft.v1";

// The project-type dropdown's own options, mirrored from index.html.
const PROJECT_TYPE_OPTIONS = ["Marketing", "Branding", "Web design", "Software / product", "Content creation", "Event", "Research", "Other"];
const PROJECT_TYPE_KEYWORDS = {
  "Marketing": ["marketing", "campaign", "promotion", "launch", "advertising", "seo", "social media"],
  "Branding": ["branding", "brand", "identity", "logo"],
  "Web design": ["web design", "website", "web", "landing page", "ui", "ux"],
  "Software / product": ["software", "product", "app", "application", "platform", "saas"],
  "Content creation": ["content", "copywriting", "copy", "blog", "article", "newsletter"],
  "Event": ["event", "conference", "workshop", "meetup", "webinar"],
  "Research": ["research", "survey", "analysis", "report"],
};

function keywordMatches(keyword, lower) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(lower);
}

// Map free text (for example "Branding + Web Design") to the closest dropdown
// option. Returns "" when nothing matches, so the caller can keep the wording.
export function mapProjectTypeOption(value) {
  const raw = text(value, 60);
  if (!raw) return "";
  const lower = raw.toLowerCase();
  const exact = PROJECT_TYPE_OPTIONS.find(option => option.toLowerCase() === lower);
  if (exact) return exact;
  let best = "";
  let bestScore = 0;
  for (const option of PROJECT_TYPE_OPTIONS) {
    if (option === "Other") continue;
    const score = (PROJECT_TYPE_KEYWORDS[option] || []).filter(keyword => keywordMatches(keyword, lower)).length;
    if (score > bestScore) { bestScore = score; best = option; }
  }
  return best;
}

// Section headings a chat reply may use for a project brief.
const BRIEF_TEXT_SECTIONS = [
  ["objective", ["objective", "project objective", "goal"]],
  ["audience", ["audience", "target audience"]],
  ["scope", ["scope"]],
  ["deliverables", ["deliverables"]],
  ["constraints", ["constraints", "requirements"]],
  ["timeline", ["timeline"]],
  ["budget", ["budget"]],
  ["assumptions", ["assumptions"]],
  ["openQuestions", ["open questions", "openquestions", "questions"]],
  ["nextSteps", ["next steps", "nextsteps"]],
];
const BRIEF_LIST_FIELDS = new Set(["deliverables", "constraints", "assumptions", "openQuestions", "nextSteps"]);

function sectionFieldFor(heading) {
  const h = String(heading || "").toLowerCase()
    .replace(/[*_`]/g, "").replace(/[:：]\s*$/, "").trim();
  for (const [field, names] of BRIEF_TEXT_SECTIONS) {
    if (names.includes(h)) return field;
  }
  return "";
}

// Parse a brief written as plain chat text (Markdown headings or "Label:"
// lines) into brief fields. Returns null unless the text is a complete brief,
// so ordinary replies never fill the form by accident.
export function parseBriefText(input) {
  const source = String(input || "").replace(/\r/g, "");
  if (!source.trim()) return null;
  const collected = {};
  const lists = {};
  let section = "";
  let sawMarker = false;
  const clean = (line) => line.replace(/^[\s>*#-]+/, "").replace(/^\d+[.)]\s+/, "").replace(/[*_`]/g, "").trim();
  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const titleMatch = line.match(/^#\s+(.+)/) || line.match(/^\*\*Title:\*\*\s*(.+)/i);
    if (titleMatch && !collected.title) {
      collected.title = clean(titleMatch[1]);
      continue;
    }
    const clientMatch = line.match(/^\*\*Client:\*\*\s*(.+)/i);
    if (clientMatch) { collected.client = clean(clientMatch[1]); continue; }
    const typeMatch = line.match(/^\*\*Project type:\*\*\s*(.+)/i);
    if (typeMatch) { collected.projectType = clean(typeMatch[1]); sawMarker = true; continue; }
    const headingMatch = line.match(/^#{1,4}\s+(.+)/) || line.match(/^\*\*(.+?)\*\*:?\s*$/);
    if (headingMatch) {
      const field = sectionFieldFor(headingMatch[1]);
      if (field) { section = field; sawMarker = true; continue; }
    }
    const labelMatch = line.match(/^([A-Za-z][A-Za-z ]{2,30}):\s*(.*)$/);
    if (labelMatch) {
      const field = sectionFieldFor(labelMatch[1]);
      if (field) {
        section = field;
        sawMarker = true;
        const rest = labelMatch[2].trim();
        if (rest) {
          if (BRIEF_LIST_FIELDS.has(field)) (lists[field] ||= []).push(clean(rest));
          else collected[field] = [collected[field], clean(rest)].filter(Boolean).join(" ");
        }
        continue;
      }
    }
    if (!section) continue;
    const value = clean(line);
    if (!value) continue;
    if (BRIEF_LIST_FIELDS.has(section)) (lists[section] ||= []).push(value);
    else collected[section] = [collected[section], value].filter(Boolean).join(" ");
  }
  if (!sawMarker) return null;
  const brief = normalizeBrief({ ...collected, ...lists });
  return validateBrief(brief).ok ? brief : null;
}

const text = (value, max = 1200) => String(value ?? "").trim().slice(0, max);
const lines = (value, maxItems = 12) => {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/\r?\n/);
  return values.map(item => text(item, 220)).filter(Boolean).slice(0, maxItems);
};

export function normalizeBrief(input = {}) {
  input = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return {
    title: text(input.title, 120),
    client: text(input.client, 120),
    projectType: text(input.projectType || "Other", 60),
    objective: text(input.objective, 1600),
    audience: text(input.audience, 800),
    scope: text(input.scope, 1600),
    deliverables: lines(input.deliverables),
    constraints: lines(input.constraints),
    timeline: text(input.timeline, 240),
    budget: text(input.budget, 160),
    assumptions: lines(input.assumptions),
    openQuestions: lines(input.openQuestions),
    nextSteps: lines(input.nextSteps),
  };
}

export function parseBriefJson(input) {
  let value;
  try {
    value = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    return { ok: false, reason: "The selected file is not valid JSON." };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "The selected file must contain one project brief object." };
  }
  const checked = validateBrief(value);
  if (!checked.ok) {
    return { ok: false, reason: `This is not a complete project brief. ${checked.reason}` };
  }
  return { ok: true, brief: checked.brief };
}

function validateInputLimits(input = {}) {
  input = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const scalarLimits = {
    title: 120, client: 120, projectType: 60, objective: 1600,
    audience: 800, scope: 1600, timeline: 240, budget: 160,
  };
  for (const [field, limit] of Object.entries(scalarLimits)) {
    const value = input[field];
    if (value != null && String(value).length > limit) {
      return `${field} must be ${limit} characters or fewer. Shorten it before saving or importing.`;
    }
  }
  const listFields = ["deliverables", "constraints", "assumptions", "openQuestions", "nextSteps"];
  for (const field of listFields) {
    const value = input[field];
    const items = Array.isArray(value) ? value : String(value ?? "").split(/\r?\n/);
    const nonEmpty = items.map(item => String(item ?? "").trim()).filter(Boolean);
    if (nonEmpty.length > 12) {
      return `${field} can contain at most 12 items. Remove or combine items before saving or importing.`;
    }
    if (nonEmpty.some(item => item.length > 220)) {
      return `Each ${field} item must be 220 characters or fewer. Shorten the long item before saving or importing.`;
    }
  }
  return "";
}

export function validateBrief(input = {}) {
  const brief = normalizeBrief(input);
  const limitIssue = validateInputLimits(input);
  if (limitIssue) return { ok: false, brief, reason: limitIssue };
  const missing = [];
  if (!brief.title) missing.push("a project title");
  if (!brief.objective) missing.push("the project objective");
  if (!brief.audience) missing.push("the target audience");
  if (!brief.deliverables.length) missing.push("at least one deliverable");
  return { ok: missing.length === 0, brief, reason: missing.length ? `Please add ${missing.join(", ")}.` : "" };
}

export function briefToMarkdown(input = {}) {
  const b = normalizeBrief(input);
  const list = (items) => items.length ? items.map(x => `- ${x}`).join("\n") : "- Not specified";
  return [
    `# ${b.title || "Untitled project"}`,
    b.client ? `**Client:** ${b.client}` : "",
    `**Project type:** ${b.projectType}`,
    "",
    "## Objective", b.objective || "Not specified",
    "",
    "## Target audience", b.audience || "Not specified",
    "",
    "## Scope", b.scope || "Not specified",
    "",
    "## Deliverables", list(b.deliverables),
    "",
    "## Constraints", list(b.constraints),
    "",
    "## Timeline", b.timeline || "Not specified",
    "",
    "## Budget", b.budget || "Not specified",
    "",
    "## Assumptions", list(b.assumptions),
    "",
    "## Open questions", list(b.openQuestions),
    "",
    "## Next steps", list(b.nextSteps),
    "",
    "---",
    "Prepared with BriefBridge. Confirm assumptions and commercial terms with the client before work begins.",
  ].filter((line, index, all) => !(line === "" && all[index - 1] === "")).join("\n");
}

function readSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter(item => item && typeof item.id === "string" && item.brief && typeof item.brief === "object").slice(0, 50)
      : [];
  } catch { return []; }
}

function writeSaved(items) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `brief-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); }
  catch { return {}; }
}

function currentFormData() {
  const form = document.querySelector("#brief-form");
  if (!form) return readDraft();
  return Object.fromEntries(new FormData(form).entries());
}

export class App {
  static page = {
    getWorkspaceState() {
      const savedBriefs = readSaved().map(({ id, createdAt, brief }) => ({
        id, createdAt, title: brief.title, projectType: brief.projectType,
      }));
      return {
        product: "BriefBridge",
        purpose: "Turn project requests into clear, reviewable project briefs.",
        currentDraft: normalizeBrief(currentFormData()),
        savedBriefs,
        availableActions: ["create a structured brief", "save a brief after confirmation", "export a brief as Markdown or JSON", "import a validated JSON brief"],
        limitations: ["BriefBridge does not sign contracts, collect payments, guarantee project budgets, or book services."],
      };
    },
    savedBriefIds() { return readSaved().map(item => item.id); },
    getBrief(id) { return readSaved().find(item => item.id === id) || null; },
    checkSaveBrief(input) { return validateBrief(input); },
    saveBrief(input) {
      const checked = validateBrief(input);
      if (!checked.ok) return { ok: false, reason: checked.reason };
      const items = readSaved();
      if (items.length >= 50) {
        return { ok: false, reason: "Your saved library is full (50 briefs). Export a copy or delete an older brief before saving another." };
      }
      const record = { id: makeId(), createdAt: new Date().toISOString(), brief: checked.brief };
      items.unshift(record);
      if (!writeSaved(items)) {
        return { ok: false, reason: "This browser could not save the brief. Check available storage and try again." };
      }
      window.dispatchEvent(new CustomEvent("briefbridge:saved", { detail: record }));
      return { ok: true, id: record.id, title: record.brief.title, createdAt: record.createdAt };
    },
    checkDeleteBrief(id) {
      const item = readSaved().find(entry => entry.id === id);
      return item ? { ok: true, title: item.brief.title } : { ok: false, reason: "That saved brief no longer exists. Refresh the workspace and try again." };
    },
    // Fill the on-page brief form from assistant-provided details. Only fills;
    // saving still goes through save_brief or the Save button.
    fillBriefForm(input = {}) {
      if (typeof document === "undefined") return { ok: false, reason: "The brief form is not available." };
      const form = document.querySelector("#brief-form");
      if (!form) return { ok: false, reason: "The brief form is not available." };
      setFormValues(input);
      const draft = readFormBrief();
      persistDraft(draft);
      renderPreview(draft);
      const filled = Object.keys(normalizeBrief(input)).filter(key => {
        const value = draft[key];
        return Array.isArray(value) ? value.length > 0 : !!value;
      });
      return { ok: true, filled };
    },
    deleteBrief(id) {
      const check = this.checkDeleteBrief(id);
      if (!check.ok) return { ok: false, reason: check.reason };
      if (!writeSaved(readSaved().filter(item => item.id !== id))) {
        return { ok: false, reason: "This browser could not update its saved library. Try again." };
      }
      window.dispatchEvent(new CustomEvent("briefbridge:deleted", { detail: { id } }));
      return { ok: true, deleted: id, title: check.title };
    },
  };
}

function setFormValues(brief) {
  const form = document.querySelector("#brief-form");
  if (!form) return;
  for (const [key, value] of Object.entries(normalizeBrief(brief))) {
    const field = form.elements.namedItem(key);
    if (!field) continue;
    if (key === "projectType" && field.tagName === "SELECT") {
      const raw = text(value, 60);
      const mapped = mapProjectTypeOption(raw);
      if (mapped) { field.value = mapped; continue; }
      // Keep unmapped wording visible in the dropdown instead of showing blank.
      if (raw && raw !== "Other") {
        if (![...field.options].some(option => option.value === raw)) {
          const option = document.createElement("option");
          option.value = raw;
          option.textContent = raw;
          field.append(option);
        }
        field.value = raw;
      } else {
        field.value = "Other";
      }
      continue;
    }
    field.value = Array.isArray(value) ? value.join("\n") : value;
  }
}

function readFormBrief() {
  const data = currentFormData();
  return normalizeBrief(data);
}

function persistDraft(brief = readFormBrief()) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(brief));
    return true;
  } catch {
    return false;
  }
}

function renderPreview(brief) {
  const preview = document.querySelector("#brief-preview");
  if (!preview) return;
  const valid = validateBrief(brief);
  preview.replaceChildren();
  const title = document.createElement("h3");
  title.textContent = valid.brief.title || "Your project brief";
  const status = document.createElement("p");
  status.className = valid.ok ? "preview-status ready" : "preview-status";
  status.textContent = valid.ok ? "Ready to save" : valid.reason;
  const body = document.createElement("pre");
  body.textContent = briefToMarkdown(valid.brief);
  preview.append(title, status, body);
  document.querySelector("#export-markdown").disabled = !valid.ok;
  document.querySelector("#export-json").disabled = !valid.ok;
}

function renderSaved() {
  const list = document.querySelector("#saved-briefs");
  if (!list) return;
  list.replaceChildren();
  const items = readSaved();
  document.querySelector("#saved-count").textContent = String(items.length).padStart(2, "0");
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your saved briefs will appear here.";
    list.append(empty);
    return;
  }
  for (const item of items) {
    const card = document.createElement("article");
    card.className = "saved-item";
    const open = document.createElement("button");
    open.type = "button";
    open.className = "saved-open";
    open.dataset.openBrief = item.id;
    const heading = document.createElement("strong");
    heading.textContent = item.brief.title;
    const meta = document.createElement("span");
    meta.textContent = `${item.brief.projectType} · ${new Date(item.createdAt).toLocaleDateString()}`;
    open.append(heading, meta);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.dataset.deleteBrief = item.id;
    remove.setAttribute("aria-label", `Delete ${item.brief.title}`);
    remove.textContent = "×";
    card.append(open, remove);
    list.append(card);
  }
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Let the browser begin the download before releasing its object URL.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function init() {
  const form = document.querySelector("#brief-form");
  if (!form) return;
  setFormValues(readDraft());
  renderPreview(readFormBrief());
  renderSaved();

  form.addEventListener("input", () => {
    const draft = readFormBrief();
    persistDraft(draft);
    renderPreview(draft);
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const result = App.page.saveBrief(readFormBrief());
    const notice = document.querySelector("#form-notice");
    notice.textContent = result.ok ? "Brief saved to this browser." : result.reason;
    notice.className = result.ok ? "notice success" : "notice";
    renderSaved();
  });

  document.querySelector("#export-markdown").addEventListener("click", () => {
    const b = readFormBrief();
    if (validateBrief(b).ok) downloadFile(`${(b.title || "brief").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`, briefToMarkdown(b), "text/markdown");
  });
  document.querySelector("#export-json").addEventListener("click", () => {
    const b = readFormBrief();
    if (validateBrief(b).ok) downloadFile("briefbridge-project-brief.json", JSON.stringify(b, null, 2), "application/json");
  });
  const importInput = document.querySelector("#import-json-file");
  document.querySelector("#import-json").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    const notice = document.querySelector("#form-notice");
    try {
      if (file.size > 1_000_000) {
        throw new Error("That file is too large. Choose a JSON brief under 1 MB.");
      }
      const result = parseBriefJson(await file.text());
      if (!result.ok) throw new Error(result.reason);
      setFormValues(result.brief);
      const persisted = persistDraft(result.brief);
      renderPreview(result.brief);
      notice.textContent = persisted
        ? "Brief imported into the editor. Review it, then save when ready."
        : "Brief imported into the editor, but this browser could not autosave the draft.";
      notice.className = persisted ? "notice success" : "notice";
    } catch (error) {
      notice.textContent = error.message || "The selected file could not be imported.";
      notice.className = "notice";
    } finally {
      importInput.value = "";
    }
  });
  document.querySelector("#reset-form").addEventListener("click", () => {
    form.reset();
    let cleared = true;
    try { localStorage.removeItem(DRAFT_KEY); } catch { cleared = false; }
    renderPreview(readFormBrief());
    const notice = document.querySelector("#form-notice");
    notice.textContent = cleared ? "Draft cleared." : "The form was cleared, but browser storage could not be updated.";
    notice.className = cleared ? "notice success" : "notice";
  });
  document.querySelector("#saved-briefs").addEventListener("click", event => {
    const open = event.target.closest("[data-open-brief]");
    const remove = event.target.closest("[data-delete-brief]");
    if (open) {
      const item = App.page.getBrief(open.dataset.openBrief);
      if (item) {
        setFormValues(item.brief);
        persistDraft(item.brief);
        renderPreview(item.brief);
        const optional = document.querySelector(".optional-fields");
        if (optional) {
          const b = item.brief;
          optional.open = Boolean(
            b.scope || b.timeline || b.budget ||
            b.constraints?.length || b.assumptions?.length ||
            b.openQuestions?.length || b.nextSteps?.length
          );
        }
        const notice = document.querySelector("#form-notice");
        notice.textContent = `Loaded “${item.brief.title}” into the editor. Review it before making changes.`;
        notice.className = "notice success";
        document.querySelector("#brief-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
        document.querySelector('#brief-form [name="title"]')?.focus({ preventScroll: true });
      }
    }
    if (remove) {
      const item = App.page.getBrief(remove.dataset.deleteBrief);
      if (item && window.confirm(`Delete “${item.brief.title}” from this browser?`)) {
        const result = App.page.deleteBrief(item.id);
        renderSaved();
        const notice = document.querySelector("#form-notice");
        notice.textContent = result.ok ? `Deleted “${result.title}”.` : result.reason;
        notice.className = result.ok ? "notice success" : "notice";
      }
    }
  });
  window.addEventListener("briefbridge:saved", renderSaved);
  window.addEventListener("briefbridge:deleted", renderSaved);
  document.querySelector("#fill-example").addEventListener("click", () => {
    setFormValues({
      title: "Brand launch campaign",
      client: "Northstar Studio",
      projectType: "Marketing",
      objective: "Launch a new creative studio brand and generate qualified enquiries during the first month.",
      audience: "Early-stage founders and small business owners who need brand identity and digital content.",
      scope: "Create a focused launch campaign across the studio website and social channels.",
      deliverables: ["Campaign concept and messaging", "Landing page copy", "10 social media posts", "Launch content calendar"],
      constraints: ["Keep the visual direction minimal and accessible", "Use existing brand assets where possible"],
      timeline: "4 weeks from kickoff",
      budget: "To be agreed with client",
      assumptions: ["Client supplies brand assets and approves copy within two working days"],
      openQuestions: ["Which channels are highest priority?", "Is paid media included?"],
      nextSteps: ["Confirm deliverables", "Agree budget and milestones", "Schedule kickoff"],
    });
    const example = readFormBrief();
    persistDraft(example);
    renderPreview(example);
  });
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}
