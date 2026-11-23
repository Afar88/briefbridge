export const BRIEF_HANDOFF_HEADINGS = Object.freeze([
  "Project", "Goal", "Audience", "Scope", "Deliverables",
  "Timeline", "Budget", "Assumptions", "Open questions",
]);
export const BRIEF_HANDOFF_MAX_ENCODED = 20 * 1024;
const MAX_JSON_BYTES = 15 * 1024;

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  if (bytes.length > MAX_JSON_BYTES) throw new TypeError("Brief data is too large.");
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function base64UrlDecode(value) {
  if (typeof value !== "string" || !value || value.length > BRIEF_HANDOFF_MAX_ENCODED) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    if (bytes.length > MAX_JSON_BYTES) return null;
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { return null; }
}
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}
export function encodeBriefHandoff(sections) {
  if (!isPlainObject(sections)) throw new TypeError("Brief sections must be an object.");
  const payload = {};
  for (const heading of BRIEF_HANDOFF_HEADINGS) {
    if (typeof sections[heading] !== "string") throw new TypeError("Every brief section must be plain text.");
    payload[heading] = sections[heading];
  }
  return base64UrlEncode(JSON.stringify(payload));
}
export function decodeBriefHandoff(encoded) {
  const json = base64UrlDecode(encoded);
  if (!json) return null;
  try {
    const value = JSON.parse(json);
    if (!isPlainObject(value)) return null;
    const sections = {};
    let hasContent = false;
    for (const heading of BRIEF_HANDOFF_HEADINGS) {
      if (typeof value[heading] !== "string") return null;
      sections[heading] = value[heading];
      if (value[heading].trim()) hasContent = true;
    }
    return hasContent ? sections : null;
  } catch { return null; }
}
export function readBriefHandoffHash(hash) {
  const prefix = "#brief=";
  if (typeof hash !== "string" || !hash.startsWith(prefix)) return null;
  return decodeBriefHandoff(hash.slice(prefix.length));
}
export function formValuesFromBriefSections(sections) {
  if (!isPlainObject(sections)) return null;
  for (const heading of BRIEF_HANDOFF_HEADINGS) if (typeof sections[heading] !== "string") return null;
  return {
    title: sections.Project, objective: sections.Goal, audience: sections.Audience,
    scope: sections.Scope, deliverables: sections.Deliverables, timeline: sections.Timeline,
    budget: sections.Budget, assumptions: sections.Assumptions, openQuestions: sections["Open questions"],
    client: "", projectType: "", constraints: "", nextSteps: "",
  };
}
