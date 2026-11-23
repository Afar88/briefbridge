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
  assert.equal(isSuitableChatModel(chat("alibaba/qwen3-tts")), false);
  assert.equal(isSuitableChatModel(chat("vendor/text-to-speech")), false);
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
  assert.equal(selectAutomaticChatModel([chat("alibaba/qwen3-tts"), chat("vendor/chat")]).id, "vendor/chat");
  assert.equal(selectAutomaticChatModel([]), null);
  assert.equal(selectAutomaticChatModel(null), null);
});

const tts = chat("alibaba/qwen3-tts", { input_price_per_million: 0.01, output_price_per_million: 0.01 });
const words = (text) => text.trim().split(/\s+/).length;

test("the model list offers only suitable chat models, never alibaba/qwen3-tts", async () => {
  const { chatModelIds } = await import("../runtime/model-selection.js");
  const catalog = [tts, chat("vendor/chat"), chat("vendor/embed", { type: "embedding" })];
  assert.deepEqual(chatModelIds(catalog), ["vendor/chat"]);
  assert.deepEqual(chatModelIds(null), []);
});

test("a chosen, typed or saved alibaba/qwen3-tts is replaced with the auto pick", async () => {
  const { checkChatModel } = await import("../runtime/model-selection.js");
  const catalog = [tts, chat("vendor/chat")];
  const check = checkChatModel("alibaba/qwen3-tts", catalog);
  assert.equal(check.ok, false);
  assert.equal(check.model, "vendor/chat");
  assert.equal(check.note, "Not a chat model. Picked vendor/chat. Press Save and start.");
  assert.ok(words(check.note) <= 10);
  const missing = checkChatModel("vendor/retired", catalog);
  assert.equal(missing.ok, false);
  assert.ok(missing.note.startsWith("Model not found."));
  assert.ok(words(missing.note) <= 10);
  assert.equal(checkChatModel("vendor/chat", catalog).ok, true);
  assert.equal(checkChatModel("alibaba/qwen3-tts", null).ok, true);
  const none = checkChatModel("alibaba/qwen3-tts", [tts]);
  assert.equal(none.model, "");
  assert.ok(words(none.note) <= 10);
});

test("a 402 pricing_required error becomes a plain message", async () => {
  const { friendlyModelError, PRICING_REQUIRED_MESSAGE } = await import("../runtime/model-selection.js");
  const raw = `LLM HTTP 402: {"error":{"message":"Model 'alibaba/qwen3-tts' is priced per character","code":"pricing_required"}}`;
  assert.equal(friendlyModelError(raw), PRICING_REQUIRED_MESSAGE);
  assert.equal(friendlyModelError(`Error from example.com: ${raw}`), PRICING_REQUIRED_MESSAGE);
  assert.ok(!friendlyModelError(raw).includes("{"));
  assert.ok(words(PRICING_REQUIRED_MESSAGE) <= 10);
  assert.equal(friendlyModelError("LLM HTTP 500: upstream error"), "LLM HTTP 500: upstream error");
});

test("a catalog without chat metadata keeps manual models but still drops TTS", async () => {
  const { chatModelIds, checkChatModel } = await import("../runtime/model-selection.js");
  const plain = [{ id: "vendor/plain-chat" }, { id: "alibaba/qwen3-tts" }];
  assert.deepEqual(chatModelIds(plain), ["vendor/plain-chat"]);
  assert.equal(checkChatModel("vendor/plain-chat", plain).ok, true);
  assert.equal(checkChatModel("alibaba/qwen3-tts", plain).ok, false);
});
