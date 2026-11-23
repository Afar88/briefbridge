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

  // Let BriefBridge's own input handler update the preview, status, export buttons
  // and browser-local draft. This event does not add anything to Saved briefs.
  form.dispatchEvent(new Event("input", { bubbles: true }));

  const notice = document.querySelector("#form-notice");
  if (notice) {
    notice.textContent = "Brief from ShopStart. Check it, then save.";
    notice.className = "notice success";
  }
}
applyIncomingBriefHandoff();
