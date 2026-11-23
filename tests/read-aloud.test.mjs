import test from "node:test";
import assert from "node:assert/strict";
import { createReadAloud, FALLBACK_NOTE, NO_VOICE_NOTE, pickSpeechModel, speechText, UNSUPPORTED_NOTE } from "../read-aloud.js";

function fakeSynth() {
  const synth = { spoken: [], cancelled: 0, speak(u) { this.spoken.push(u); }, cancel() { this.cancelled++; } };
  class Utterance { constructor(text) { this.text = text; } }
  return { synth, Utterance };
}
const words = (text) => text.trim().split(/\s+/).length;

test("speechText drops Markdown marks", () => {
  assert.equal(speechText("# Bakery site\n**Client:** Ada\n- Logo\n- Website"), "Bakery site\nClient: Ada\nLogo\nWebsite");
  assert.equal(speechText(""), "");
});

test("pickSpeechModel only returns speech models", () => {
  const catalog = [{ id: "vendor/chat", type: "chat" }, { id: "mistralai/voxtral-mini-tts", type: "speech" }, { id: "alibaba/qwen3-tts", type: "speech" }];
  assert.equal(pickSpeechModel(catalog), "alibaba/qwen3-tts");
  assert.equal(pickSpeechModel([{ id: "vendor/chat", type: "chat" }]), "");
});

test("browser voice reads, and Stop cancels it", async () => {
  const { synth, Utterance } = fakeSynth();
  const changes = [];
  const reader = createReadAloud({ synth, Utterance, onChange: (o) => changes.push(o) });
  const owner = {};
  assert.equal(await reader.read("# Hello", owner), "browser");
  assert.equal(synth.spoken[0].text, "Hello");
  assert.equal(reader.owner, owner);
  reader.stop();
  assert.equal(reader.owner, null);
  assert.ok(synth.cancelled >= 2);
  assert.deepEqual(changes, [owner, null]);
});

test("Otari voice plays audio when the router returns audio", async () => {
  const { synth, Utterance } = fakeSynth();
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, body: init.body });
    if (url.endsWith("/models")) return { ok: true, json: async () => ({ data: [{ id: "alibaba/qwen3-tts", type: "speech" }] }) };
    return { ok: true, headers: { get: () => "audio/mpeg" }, blob: async () => "blob" };
  };
  let played = false;
  const reader = createReadAloud({
    synth, Utterance, fetchImpl,
    makeUrl: () => "blob:x",
    makeAudio: () => ({ play: async () => { played = true; }, pause() {} }),
    getSetting: () => "otari",
    getOtari: () => ({ key: "k", router: "https://router.example/api/v1/" }),
  });
  assert.equal(await reader.read("Hi"), "otari");
  assert.equal(played, true);
  assert.equal(synth.spoken.length, 0);
  assert.equal(calls[1].url, "https://router.example/api/v1/audio/speech");
  assert.equal(JSON.parse(calls[1].body).model, "alibaba/qwen3-tts");
});

test("Otari voice falls back to the browser voice with a short note", async () => {
  const { synth, Utterance } = fakeSynth();
  const notes = [];
  const fetchImpl = async (url) => url.endsWith("/models")
    ? { ok: true, json: async () => ({ data: [{ id: "alibaba/qwen3-tts", type: "speech" }] }) }
    : { ok: false, status: 404, headers: { get: () => "application/json" } };
  const reader = createReadAloud({
    synth, Utterance, fetchImpl,
    getSetting: () => "otari",
    getOtari: () => ({ key: "k", router: "https://router.example/api/v1" }),
    onNote: (n) => notes.push(n),
  });
  assert.equal(await reader.read("Hi"), "browser");
  assert.deepEqual(notes, [FALLBACK_NOTE]);
  assert.equal(synth.spoken.length, 1);
  assert.ok(words(FALLBACK_NOTE) <= 10 && words(UNSUPPORTED_NOTE) <= 10);
});

test("a browser without speech support shows a note", async () => {
  const notes = [];
  const reader = createReadAloud({ synth: null, Utterance: null, onNote: (n) => notes.push(n) });
  assert.equal(await reader.read("Hi"), "none");
  assert.deepEqual(notes, [UNSUPPORTED_NOTE]);
  assert.equal(reader.owner, null);
});

test("a failed browser voice shows a note, a cancel does not", async () => {
  const { synth, Utterance } = fakeSynth();
  const notes = [];
  const reader = createReadAloud({ synth, Utterance, onNote: (n) => notes.push(n) });
  await reader.read("Hi");
  synth.spoken[0].onerror({ error: "synthesis-failed" });
  assert.deepEqual(notes, [NO_VOICE_NOTE]);
  assert.equal(reader.owner, null);
  await reader.read("Hi again");
  synth.spoken[1].onerror({ error: "interrupted" });
  assert.deepEqual(notes, [NO_VOICE_NOTE]);
  assert.ok(words(NO_VOICE_NOTE) <= 10);
});
