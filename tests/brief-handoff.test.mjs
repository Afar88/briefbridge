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
  assert.doesNotMatch(source, /App\.page\.fillBriefForm|localStorage|dispatchEvent|innerHTML/);
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  assert.match(index, /brief-handoff-ui\.js/);
});
