import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBrief, validateBrief, briefToMarkdown } from "../app.js";

test("normalizes a complete project brief", () => {
  const result = validateBrief({
    title: "Website refresh",
    projectType: "Web design",
    objective: "Improve the website experience.",
    audience: "Existing customers",
    deliverables: "New landing page\nResponsive layouts",
    constraints: "Keep the current logo",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.brief.deliverables, ["New landing page", "Responsive layouts"]);
  assert.deepEqual(result.brief.constraints, ["Keep the current logo"]);
});

test("rejects briefs missing essential information", () => {
  const result = validateBrief({ title: "Untitled" });
  assert.equal(result.ok, false);
  assert.match(result.reason, /objective/);
  assert.match(result.reason, /target audience/);
  assert.match(result.reason, /deliverable/);
});

test("bounds untrusted text and list sizes", () => {
  const result = normalizeBrief({
    title: "x".repeat(300),
    deliverables: Array.from({ length: 30 }, (_, i) => `Item ${i}`),
  });
  assert.equal(result.title.length, 120);
  assert.equal(result.deliverables.length, 12);
});

test("exports a readable Markdown brief without inventing missing values", () => {
  const markdown = briefToMarkdown({
    title: "Campaign plan",
    objective: "Increase qualified enquiries.",
    audience: "Local business owners",
    deliverables: ["Landing page copy", "Social content"],
  });
  assert.match(markdown, /# Campaign plan/);
  assert.match(markdown, /Increase qualified enquiries/);
  assert.match(markdown, /- Landing page copy/);
  assert.match(markdown, /Budget\nNot specified/);
});

test("normalizes comma-separated lists and trims empty entries", () => {
  const result = normalizeBrief({
    deliverables: "Landing page, Social content,, Email sequence",
    constraints: "No paid ads\n  ",
  });
  assert.deepEqual(result.deliverables, ["Landing page", "Social content", "Email sequence"]);
  assert.deepEqual(result.constraints, ["No paid ads"]);
});

test("uses a safe project type when none is supplied", () => {
  assert.equal(normalizeBrief({ title: "Test" }).projectType, "Other");
});
