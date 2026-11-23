import test from "node:test";
import assert from "node:assert/strict";
import { App, normalizeBrief, validateBrief, briefToMarkdown, parseBriefJson } from "../app.js";

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

test("normalizes newline-separated lists and preserves commas within entries", () => {
  const result = normalizeBrief({
    deliverables: "Landing page, including responsive layouts\nSocial content, with captions\nEmail sequence",
    constraints: "No paid ads\n  ",
  });
  assert.deepEqual(result.deliverables, ["Landing page, including responsive layouts", "Social content, with captions", "Email sequence"]);
  assert.deepEqual(result.constraints, ["No paid ads"]);
});

test("imports an exported JSON brief without changing its content", () => {
  const source = {
    title: "Campaign plan",
    objective: "Increase qualified enquiries.",
    audience: "Local business owners",
    deliverables: ["Landing page copy", "Social content"],
  };
  const result = parseBriefJson(JSON.stringify(source));
  assert.equal(result.ok, true);
  assert.deepEqual(result.brief.deliverables, source.deliverables);
  assert.equal(result.brief.projectType, "Other");
});

test("rejects malformed or incomplete JSON imports", () => {
  assert.equal(parseBriefJson("{").ok, false);
  assert.equal(parseBriefJson("[]").ok, false);
  const incomplete = parseBriefJson({ title: "Missing details" });
  assert.equal(incomplete.ok, false);
  assert.match(incomplete.reason, /objective/);
});

test("refuses to silently discard saved briefs when the library is full", () => {
  const previousStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  const store = new Map();
  const existing = Array.from({ length: 50 }, (_, index) => ({
    id: `saved-${index}`,
    createdAt: new Date(0).toISOString(),
    brief: { title: `Saved ${index}`, objective: "Objective", audience: "Audience", deliverables: ["Deliverable"] },
  }));
  store.set("briefbridge.saved.v1", JSON.stringify(existing));
  globalThis.localStorage = {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, value),
  };
  globalThis.window = { dispatchEvent() {} };
  try {
    const result = App.page.saveBrief({
      title: "Another project",
      objective: "A clear objective",
      audience: "A defined audience",
      deliverables: ["A deliverable"],
    });
    assert.equal(result.ok, false);
    assert.match(result.reason, /library full/i);
    assert.equal(JSON.parse(store.get("briefbridge.saved.v1")).length, 50);
    assert.equal(JSON.parse(store.get("briefbridge.saved.v1"))[0].id, "saved-0");
  } finally {
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("rejects oversized list input instead of silently truncating it", () => {
  const result = validateBrief({
    title: "Campaign",
    objective: "Objective",
    audience: "Audience",
    deliverables: Array.from({ length: 13 }, (_, index) => `Deliverable ${index + 1}`),
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /at most 12 items/);
});

test("rejects overlong imported brief fields instead of silently truncating them", () => {
  const result = parseBriefJson({
    title: "A".repeat(121),
    objective: "Objective",
    audience: "Audience",
    deliverables: ["Deliverable"],
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /120 characters or fewer/);
});

test("rejects overlong individual list entries", () => {
  const result = validateBrief({
    title: "Campaign",
    objective: "Objective",
    audience: "Audience",
    deliverables: ["D".repeat(221)],
  });
  assert.equal(result.ok, false);
  assert.match(result.reason, /220 characters or fewer/);
});

test("handles non-object validation input without crashing", () => {
  for (const value of [null, [], "not a brief", 42]) {
    const result = validateBrief(value);
    assert.equal(result.ok, false);
    assert.match(result.reason, /project title/);
  }
});

test("uses a safe project type when none is supplied", () => {
  assert.equal(normalizeBrief({ title: "Test" }).projectType, "Other");
});

test("maps free-text project types to the closest dropdown option", async () => {
  const { mapProjectTypeOption } = await import("../app.js");
  assert.equal(mapProjectTypeOption("Branding + Web Design"), "Web design");
  assert.equal(mapProjectTypeOption("branding"), "Branding");
  assert.equal(mapProjectTypeOption("mobile app"), "Software / product");
  assert.equal(mapProjectTypeOption(""), "");
});

test("parses a complete brief written in chat text", async () => {
  const { parseBriefText } = await import("../app.js");
  const reply = [
    "# Bakery website",
    "**Project type:** Web design",
    "",
    "## Objective",
    "Launch a one-page website for a small bakery in Lagos.",
    "",
    "## Target audience",
    "Local customers and event planners.",
    "",
    "## Deliverables",
    "- Logo",
    "- One-page website",
    "",
    "## Budget",
    "About $300",
  ].join("\n");
  const brief = parseBriefText(reply);
  assert.ok(brief);
  assert.equal(brief.title, "Bakery website");
  assert.equal(brief.projectType, "Web design");
  assert.match(brief.objective, /one-page website/);
  assert.deepEqual(brief.deliverables, ["Logo", "One-page website"]);
  assert.equal(brief.budget, "About $300");
});

test("ignores ordinary chat replies without a complete brief", async () => {
  const { parseBriefText } = await import("../app.js");
  assert.equal(parseBriefText("Sure! What is your budget?"), null);
  assert.equal(parseBriefText("## Objective\nOnly one section, nothing else."), null);
});

test("detects clear save and delete requests, never negated ones", async () => {
  const { asksToSaveBrief, asksToDeleteBrief } = await import("../app.js");
  assert.equal(asksToSaveBrief("Please fill in the brief form and save the brief to my library."), true);
  assert.equal(asksToSaveBrief("Yes, save it."), true);
  assert.equal(asksToSaveBrief("Don't save this brief yet."), false);
  assert.equal(asksToSaveBrief("I need a logo for my bakery."), false);
  assert.equal(asksToDeleteBrief("Now please delete that saved brief from my library."), true);
  assert.equal(asksToDeleteBrief("Do not delete my brief."), false);
  assert.equal(asksToDeleteBrief("Please save the brief."), false);
});

test("drafts a valid brief from a plain save request", async () => {
  const { draftFromRequest } = await import("../app.js");
  const brief = draftFromRequest("I need a logo and a one-page website for my small bakery in Lagos. Budget about $300, ready in three weeks. Please fill in the brief form and save the brief.");
  assert.ok(brief);
  assert.deepEqual(brief.deliverables, ["Logo", "One-page website"]);
  assert.equal(brief.title, "Logo and One-page website for small bakery in Lagos");
  assert.equal(brief.budget, "Budget about $300");
  assert.equal(brief.timeline, "Ready in three weeks");
  assert.equal(brief.objective.includes("save"), false);
  assert.equal(draftFromRequest("Please save the brief now."), null);
});
