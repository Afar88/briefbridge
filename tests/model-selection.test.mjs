import test from "node:test";
import assert from "node:assert/strict";
import { isSuitableChatModel, selectAutomaticChatModel } from "../runtime/model-selection.js";

const chat = (id, extra = {}) => ({
  id,
  type: "chat",
  supported_parameters: ["tools", "tool_choice"],
  pricing_source: "default",
  input_price_per_million: 1,
  output_price_per_million: 2,
  ...extra,
});

test("accepts a priced chat model with tool calling support", () => {
  assert.equal(isSuitableChatModel(chat("vendor/chat")), true);
});

test("rejects embedding, unpriced and non-tool models", () => {
  assert.equal(isSuitableChatModel(chat("vendor/embed", { type: "embedding" })), false);
  assert.equal(isSuitableChatModel(chat("vendor/free", { pricing_source: "none" })), false);
  assert.equal(isSuitableChatModel(chat("vendor/no-tools", { supported_parameters: [] })), false);
  assert.equal(isSuitableChatModel(chat("vendor/no-tool-choice", { supported_parameters: ["tools"] })), false);
});

test("keeps a preferred model only when it passes every suitability check", () => {
  const preferred = chat("vendor/preferred", { input_price_per_million: 99 });
  const cheap = chat("vendor/cheap", { input_price_per_million: 0.1 });
  assert.equal(selectAutomaticChatModel([cheap, preferred], ["vendor/preferred"]).id, "vendor/preferred");
  assert.equal(selectAutomaticChatModel([chat("vendor/preferred", { pricing_source: "none" }), cheap], ["vendor/preferred"]).id, "vendor/cheap");
});

test("chooses the least expensive suitable model when no preference matches", () => {
  const expensive = chat("vendor/expensive", { input_price_per_million: 5, output_price_per_million: 5 });
  const cheap = chat("vendor/cheap", { input_price_per_million: 0.1, output_price_per_million: 0.2 });
  assert.equal(selectAutomaticChatModel([expensive, cheap]).id, "vendor/cheap");
});

test("returns null when no model is demonstrably suitable", () => {
  assert.equal(selectAutomaticChatModel([chat("vendor/unknown", { type: undefined })]), null);
  assert.equal(selectAutomaticChatModel([]), null);
  assert.equal(selectAutomaticChatModel(null), null);
});
