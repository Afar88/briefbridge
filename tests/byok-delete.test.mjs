import test from "node:test";
import assert from "node:assert/strict";

function mockStorage() {
  const map = new Map();
  return {
    getItem: key => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    clear: () => map.clear(),
  };
}

const TAB_ITEMS = ["nsweb-byok-tab-key", "nsweb-byok-key", "nsweb-byok-router", "nsweb-byok-model"];

async function withStorage(fn) {
  const previousLocal = globalThis.localStorage;
  const previousSession = globalThis.sessionStorage;
  const local = mockStorage();
  const session = mockStorage();
  globalThis.localStorage = local;
  globalThis.sessionStorage = session;
  try {
    const byok = await import("../runtime/byok.js");
    await fn(byok, { local, session });
  } finally {
    if (previousLocal === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousLocal;
    if (previousSession === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousSession;
  }
}

test("deleting the applied setup removes every key copy", async () => {
  await withStorage(async (byok, { local, session }) => {
    const { profile } = byok.upsertByokProfile({
      name: "Otari", key: "otk_test_secret", router: "https://api.otari.ai/api/v1", model: "vendor/chat",
    });
    byok.saveTabByokSetup(profile);
    assert.equal(session.getItem("nsweb-byok-key"), "otk_test_secret");
    const result = byok.deleteByokProfileAndTabSetup(profile.id);
    assert.equal(result.clearedTab, true);
    assert.equal(byok.loadByokStore().profiles.length, 0);
    for (const item of TAB_ITEMS) assert.equal(session.getItem(item), null, item);
    const saved = local.getItem("nsweb-byok-profiles-v1") || "";
    assert.equal(saved.includes("otk_test_secret"), false);
    assert.equal(byok.loadTabByokSetup().key, "");
  });
});

test("deleting an unrelated setup keeps the tab's applied key", async () => {
  await withStorage(async (byok, { session }) => {
    const applied = byok.upsertByokProfile({
      name: "Applied", key: "otk_applied", router: "https://api.otari.ai/api/v1", model: "vendor/chat",
    });
    const other = byok.upsertByokProfile({
      name: "Other", key: "otk_other", router: "https://api.openai.com/v1", model: "gpt-5.5",
    }, { select: false });
    byok.saveTabByokSetup(applied.profile);
    const result = byok.deleteByokProfileAndTabSetup(other.profile.id);
    assert.equal(result.clearedTab, false);
    assert.equal(session.getItem("nsweb-byok-key"), "otk_applied");
    assert.equal(byok.loadByokStore().profiles.length, 1);
  });
});
