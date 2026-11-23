import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseHocon } from "../runtime/hocon.js";

const root = new URL("../", import.meta.url);
const [hoconText, jsonText] = await Promise.all([
  readFile(new URL("briefbridge_network.hocon", root), "utf8"),
  readFile(new URL("briefbridge_network.network.json", root), "utf8")
]);

test("peer coordinator returns a brief without page actions", () => {
  const fromHocon = parseHocon(hoconText);
  const fromJson = JSON.parse(jsonText);
  assert.deepEqual(fromHocon, fromJson, "HOCON source and published JSON must match");

  const peerRules = fromHocon.commondefs.replacement_strings.peer_rules;
  assert.match(peerRules, /brief_architect/, "peer rules must delegate to brief_architect");
  assert.match(peerRules, /Skip every step that requires website_\* tools/);
  assert.match(peerRules, /Never claim the page form was filled, a brief was stored, or an existing brief was removed\./);

  const headings = [
    "Project", "Goal", "Audience", "Scope", "Deliverables",
    "Timeline", "Budget", "Assumptions", "Open questions"
  ];
  let previousIndex = -1;
  for (const heading of headings) {
    const index = peerRules.indexOf(heading);
    assert.ok(index > previousIndex, `peer rules must include ${heading} in the requested order`);
    previousIndex = index;
  }

  assert.match(peerRules, /Provisional outline/, "specialist failures need a labelled fallback");
  assert.match(peerRules, /Do not ask for names, emails, phone numbers or confidential details that are not needed\./);
  assert.match(peerRules, /Do not give quotes, contracts, payment services or bookings\./);

  const closingLine = "To review and save this brief, open BriefBridge at https://briefbridge-bpxd.onrender.com";
  assert.equal(peerRules.trim().split("\n").at(-1), closingLine);

  const instructionsBeforeClosingLine = peerRules.slice(0, peerRules.lastIndexOf(closingLine));
  assert.doesNotMatch(
    instructionsBeforeClosingLine,
    /\bsav(?:e|es|ed|ing)\b/i,
    "no save action is described or claimed before the required review-page CTA"
  );
});
