// Pure helpers for the ShopStart → BriefBridge handoff bar and receipt.
// No DOM here, so they can be tested in Node.

export const HANDOFF_STEPS = Object.freeze([
  "Sending request",
  "BriefBridge is writing",
  "Brief received",
]);

const PEER_NETWORK = "briefbridge_network";

export function isBriefBridgeEvent(event) {
  return event?.source?.network === PEER_NETWORK;
}

/**
 * Returns the next handoff state for one runtime event.
 * stage: -1 idle, 0 sending, 1 writing, 2 received, "failed".
 * Stage only moves forward, so the list never flickers back.
 */
export function nextHandoffState(state, event, now = Date.now()) {
  const current = state || { stage: -1, startedAt: null, endedAt: null, invocationId: null };
  if (!isBriefBridgeEvent(event)) return current;
  if (current.stage === "failed") return current;
  if (event.type === "agent.failed") {
    return { ...current, stage: "failed", endedAt: now };
  }
  if (event.type === "agent.started") {
    if (current.stage >= 1) return current;
    return {
      ...current,
      stage: 1,
      startedAt: current.startedAt ?? now,
      invocationId: current.invocationId || event.source?.invocationId || null,
    };
  }
  if (event.type === "agent.completed" && event.source?.agent === "briefbridge_coordinator") {
    return { ...current, stage: 2, startedAt: current.startedAt ?? now, endedAt: now };
  }
  return current;
}

/** Receipt fields. Any value we do not have is left out, never invented. */
export function receiptParts({ model, startedAt, endedAt, invocationId } = {}) {
  const parts = ["BriefBridge"];
  const name = typeof model === "string" ? model.trim() : "";
  if (name && name !== "demo") parts.push(name);
  if (Number.isFinite(startedAt) && Number.isFinite(endedAt) && endedAt >= startedAt) {
    parts.push(`${((endedAt - startedAt) / 1000).toFixed(1)}s`);
  }
  if (typeof invocationId === "string" && invocationId.trim()) {
    parts.push(`id ${invocationId.trim().slice(0, 18)}`);
  }
  return parts;
}
