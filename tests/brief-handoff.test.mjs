import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BRIEF_HANDOFF_HEADINGS, decodeBriefHandoff, encodeBriefHandoff,
  formValuesFromBriefSections, readBriefHandoffHash,
} from "../brief-handoff.js";

const sample = {
  Project: "Salon website", Goal: "Attract new customers",
  Audience: "Local customers", Scope: "A five-page responsive site",
  Deliverables: "Home page\nServices page\nContact page",
  Timeline: "Not specified", Budget: "Not specified",
  Assumptions: "The business has a logo",
  "Open questions": "Which booking flow is needed?",
};
function encodeRaw(value) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

test("handoff encodes and decodes all nine sections as UTF-8 base64url", () => {
  const data = { ...sample, Project: "Café website", Goal: "<script>plain text</script>" };
  const encoded = encodeBriefHandoff(data);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeBriefHandoff(encoded), data);
  assert.deepEqual(readBriefHandoffHash("#brief=" + encoded), data);
  assert.equal(BRIEF_HANDOFF_HEADINGS.length, 9);
});
test("malformed, empty, oversized and incomplete data is ignored", () => {
  assert.equal(decodeBriefHandoff(""), null);
  assert.equal(decodeBriefHandoff("not+base64"), null);
  assert.equal(readBriefHandoffHash("#brief="), null);
  assert.equal(readBriefHandoffHash("#workspace"), null);
  assert.equal(decodeBriefHandoff("a".repeat(20 * 1024 + 1)), null);
  assert.equal(decodeBriefHandoff(encodeRaw([])), null);
  assert.equal(decodeBriefHandoff(encodeRaw({ ...sample, Budget: 45 })), null);
  const incomplete = { ...sample }; delete incomplete.Scope;
  assert.equal(decodeBriefHandoff(encodeRaw(incomplete)), null);
  assert.equal(decodeBriefHandoff(encodeRaw(Object.fromEntries(BRIEF_HANDOFF_HEADINGS.map(key => [key, ""])))), null);
});
test("section fields map to the brief form and unrelated fields stay empty", () => {
  assert.deepEqual(formValuesFromBriefSections(sample), {
    title: sample.Project, objective: sample.Goal, audience: sample.Audience,
    scope: sample.Scope, deliverables: sample.Deliverables, timeline: sample.Timeline,
    budget: sample.Budget, assumptions: sample.Assumptions, openQuestions: sample["Open questions"],
    client: "", projectType: "", constraints: "", nextSteps: "",
  });
});
test("page handoff fills text fields without saving and removes the fragment", async () => {
  const source = await readFile(new URL("../brief-handoff-ui.js", import.meta.url), "utf8");
  assert.match(source, /history\.replaceState/);
  assert.match(source, /field\.value = value/);
  assert.match(source, /Brief from ShopStart\. Check it, then save\./);
  assert.match(source, /form\.dispatchEvent\(new Event\("input",\s*\{ bubbles: true \}\)\)/);\n  assert.doesNotMatch(source, /App\.page\.fillBriefForm|localStorage|innerHTML|createElement\("pre"\)/);
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(index, /brief-handoff-ui\.js/);
});


test("valid ShopStart handoff updates the live preview and exports without saving", async () => {
  const stored = new Map();
  const originalGlobals = new Map(
    ["document", "window", "localStorage", "FormData", "CustomEvent"]
      .map(key => [key, globalThis[key]])
  );

  class FakeElement {
    constructor(tagName = "div") {
      this.tagName = tagName.toUpperCase();
      this.value = "";
      this.disabled = false;
      this.textContent = "";
      this.className = "";
      this.children = [];
      this.options = [];
      this.listeners = new Map();
      this.dataset = {};
    }
    addEventListener(type, callback) {
      const listeners = this.listeners.get(type) || [];
      listeners.push(callback);
      this.listeners.set(type, listeners);
    }
    dispatchEvent(event) {
      for (const callback of this.listeners.get(event.type) || []) callback.call(this, event);
      return true;
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = [...children]; }
    setAttribute() {}
    click() {}
    remove() {}
  }

  const fieldNames = [
    "title", "client", "projectType", "objective", "audience", "scope",
    "deliverables", "constraints", "timeline", "budget", "assumptions",
    "openQuestions", "nextSteps",
  ];
  const fields = Object.fromEntries(fieldNames.map(name => [
    name,
    new FakeElement(name === "projectType" ? "select" : "input"),
  ]));
  fields.projectType.options = [
    "Marketing", "Branding", "Web design", "Software / product",
    "Content creation", "Event", "Research", "Other",
  ].map(value => ({ value }));
  const form = new FakeElement("form");
  form.elements = { namedItem: name => fields[name] || null };

  const elements = new Map([
    ["#brief-form", form],
    ["#brief-preview", new FakeElement("section")],
    ["#export-markdown", new FakeElement("button")],
    ["#export-json", new FakeElement("button")],
    ["#saved-briefs", new FakeElement("div")],
    ["#saved-count", new FakeElement("span")],
    ["#form-notice", new FakeElement("p")],
    ["#import-json-file", new FakeElement("input")],
    ["#import-json", new FakeElement("button")],
    ["#reset-form", new FakeElement("button")],
    ["#fill-example", new FakeElement("button")],
  ]);
  const document = {
    readyState: "complete",
    querySelector: selector => elements.get(selector) || null,
    createElement: tagName => new FakeElement(tagName),
    addEventListener() {},
  };
  const location = { hash: "", pathname: "/", search: "?source=shopstart" };
  const window = {
    location,
    history: {
      state: null,
      lastUrl: "",
      replaceState(_state, _title, url) {
        this.lastUrl = url;
        location.hash = new URL(url, "https://briefbridge.test").hash;
      },
    },
    addEventListener() {},
    confirm: () => false,
  };
  const localStorage = {
    getItem: key => stored.has(key) ? stored.get(key) : null,
    setItem: (key, value) => stored.set(key, String(value)),
    removeItem: key => stored.delete(key),
  };
  class FakeFormData {
    constructor() {}
    *entries() {
      for (const [name, field] of Object.entries(fields)) yield [name, field.value];
    }
  }
  class FakeCustomEvent extends Event {
    constructor(type, options = {}) {
      super(type, options);
      this.detail = options.detail;
    }
  }

  try {
    Object.assign(globalThis, { document, window, localStorage, FormData: FakeFormData, CustomEvent: FakeCustomEvent });
    const { App } = await import("../app.js?shopstart-handoff-regression");
    const sections = { ...sample };
    const encoded = encodeBriefHandoff(sections);
    location.hash = "#brief=" + encoded;

    await import("../brief-handoff-ui.js?shopstart-handoff-regression");

    const preview = elements.get("#brief-preview");
    assert.equal(fields.title.value, sample.Project);
    assert.equal(fields.objective.value, sample.Goal);
    assert.equal(fields.projectType.value, "Web design");
    assert.equal(preview.children[0]?.tagName, "H3");
    assert.equal(preview.children[0]?.textContent, sample.Project);
    assert.equal(preview.children[1]?.textContent, "Ready to save");
    assert.equal(elements.get("#export-markdown").disabled, false);
    assert.equal(elements.get("#export-json").disabled, false);
    assert.equal(elements.get("#form-notice").textContent, "Brief from ShopStart. Check it, then save.");
    assert.equal(location.hash, "");
    assert.equal(window.history.lastUrl, "/?source=shopstart");
    assert.ok(stored.has("briefbridge.draft.v1"));
    assert.equal(App.page.savedBriefIds().length, 0);
    assert.equal(stored.has("briefbridge.saved.v1"), false);
  } finally {
    for (const [key, value] of originalGlobals) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
