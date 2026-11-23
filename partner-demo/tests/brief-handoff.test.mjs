import assert from "node:assert/strict";
import test from "node:test";
import {
  briefBridgePeerText,
  briefBridgeUrl,
  encodeBriefHandoff,
  extractBriefSections,
} from "../brief-handoff.js";

const fullReply = [
  "## Project", "Salon website",
  "**Goal:**", "Attract new customers",
  "### Audience", "Local customers",
  "## Scope", "Responsive five-page site",
  "## Deliverables", "Website design and launch files",
  "## Timeline", "Not specified",
  "## Budget", "Not specified",
  "## Assumptions", "The business already has a logo",
  "## Open questions", "Which booking flow is needed?",
].join("\n");

test("captures the full BriefBridge peer completion, not another agent or final summary", () => {
  const peer = { type: "agent.completed", source: { network: "briefbridge_network", agent: "briefbridge_coordinator" }, resultText: "Full reply\nEvery heading" };
  assert.equal(briefBridgePeerText(peer), "Full reply\nEvery heading");
  assert.equal(briefBridgePeerText({ ...peer, source: { network: "shopstart_network", agent: "shopstart_coordinator" } }), null);
  assert.equal(briefBridgePeerText({ ...peer, source: { network: "briefbridge_network", agent: "brief_architect" } }), null);
  assert.equal(briefBridgePeerText({ ...peer, resultText: "  " }), null);
});

test("full reply parser retains all nine headings and unknown values", () => {
  const sections = extractBriefSections(fullReply);
  assert.deepEqual(Object.keys(sections), [
    "Project", "Goal", "Audience", "Scope", "Deliverables",
    "Timeline", "Budget", "Assumptions", "Open questions",
  ]);
  assert.equal(sections.Project, "Salon website");
  assert.equal(sections.Goal, "Attract new customers");
  assert.equal(sections["Open questions"], "Which booking flow is needed?");
  assert.equal(sections.Timeline, "Not specified");
  assert.equal(sections.Budget, "Not specified");
  assert.equal(extractBriefSections("Only a short summary"), null);
});

test("handoff encodes the nine sections as base64url JSON in the fragment", () => {
  const sections = extractBriefSections(fullReply);
  const data = encodeBriefHandoff(sections);
  assert.match(data, /^[A-Za-z0-9_-]+$/);
  assert.equal(briefBridgeUrl(fullReply), "https://briefbridge-bpxd.onrender.com/#brief=" + data);
  assert.equal(briefBridgeUrl("no full brief"), "https://briefbridge-bpxd.onrender.com");
  const padded = data.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - data.length % 4) % 4);
  const decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  assert.deepEqual(decoded, sections);
});

