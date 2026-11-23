export const REQUIRED_BRIEF_HEADINGS = Object.freeze([
  "Project",
  "Goal",
  "Audience",
  "Scope",
  "Deliverables",
  "Timeline",
  "Budget",
  "Assumptions",
  "Open questions",
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * A peer reply is labelled as a BriefBridge draft only when every requested
 * section heading is present. Supports plain, Markdown, and bold headings.
 */
export function isStructuredBrief(value) {
  const text = String(value ?? "");
  if (!text.trim()) return false;

  return REQUIRED_BRIEF_HEADINGS.every((heading) => {
    const escaped = escapeRegExp(heading);
    const pattern = new RegExp(
      `^\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*(?:[:—-]\\s*)?(?:\\*\\*)?(?:\\s+.*)?$`,
      "im",
    );
    return pattern.test(text);
  });
}
