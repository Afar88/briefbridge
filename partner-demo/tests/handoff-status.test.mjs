import assert from "node:assert/strict";
import test from "node:test";
import { nextHandoffState, receiptParts, HANDOFF_STEPS } from "../handoff-status.js";

const bb = (type, agent = "briefbridge_coordinator") => ({ type, source: { network: "briefbridge_network", agent, invocationId: "inv-123" } });

test("has three handoff steps", () => {
  assert.deepEqual([...HANDOFF_STEPS], ["Sending request", "BriefBridge is writing", "Brief received"]);
});

test("ignores ShopStart's own events", () => {
  const s = nextHandoffState(null, { type: "agent.started", source: { network: "shopstart_network" } }, 1);
  assert.equal(s.stage, -1);
});

test("moves forward only and records timing", () => {
  let s = nextHandoffState(null, bb("agent.started"), 1000);
  assert.equal(s.stage, 1);
  assert.equal(s.invocationId, "inv-123");
  s = nextHandoffState(s, bb("agent.started", "brief_architect"), 1500);
  assert.equal(s.stage, 1);
  assert.equal(s.startedAt, 1000);
  s = nextHandoffState(s, bb("agent.completed"), 4500);
  assert.equal(s.stage, 2);
  assert.equal(s.endedAt, 4500);
  s = nextHandoffState(s, bb("agent.started"), 5000);
  assert.equal(s.stage, 2);
});

test("a peer failure is shown as failed", () => {
  const s = nextHandoffState(nextHandoffState(null, bb("agent.started"), 1), bb("agent.failed"), 2);
  assert.equal(s.stage, "failed");
});

test("receipt shows only real values", () => {
  assert.deepEqual(receiptParts({}), ["BriefBridge"]);
  assert.deepEqual(receiptParts({ model: "demo" }), ["BriefBridge"]);
  assert.deepEqual(
    receiptParts({ model: "qwen/qwen3", startedAt: 1000, endedAt: 4500, invocationId: "inv-123" }),
    ["BriefBridge", "qwen/qwen3", "3.5s", "id inv-123"],
  );
});
