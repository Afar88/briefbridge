import { formValuesFromBriefSections, readBriefHandoffHash } from "./brief-handoff.js";

function applyIncomingBriefHandoff() {
  const hash = window.location.hash;
  if (!hash.startsWith("#brief=")) return;
  const sections = readBriefHandoffHash(hash);
  window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  if (!sections) return;

  const form = document.querySelector("#brief-form");
  if (!form) return;
  const values = formValuesFromBriefSections(sections);
  if (!values) return;

  // Direct assignment avoids the app's auto-saving fill action.
  for (const [name, value] of Object.entries(values)) {
    const field = form.elements.namedItem(name);
    if (field) field.value = value;
  }

  const preview = document.querySelector("#brief-preview");
  if (preview) {
    const rows = [
      "# " + values.title, "",
      "## Goal", values.objective, "",
      "## Audience", values.audience, "",
      "## Scope", values.scope, "",
      "## Deliverables", values.deliverables, "",
      "## Timeline", values.timeline, "",
      "## Budget", values.budget, "",
      "## Assumptions", values.assumptions, "",
      "## Open questions", values.openQuestions,
    ];
    let pre = preview.querySelector("pre");
    if (!pre) { pre = document.createElement("pre"); preview.append(pre); }
    pre.textContent = rows.join("\n");
  }

  const notice = document.querySelector("#form-notice");
  if (notice) {
    notice.textContent = "Brief from ShopStart. Check it, then save.";
    notice.className = "notice success";
  }
}
applyIncomingBriefHandoff();
