const base = (process.env.SITE_URL || "https://briefbridge-bpxd.onrender.com").replace(/\/$/, "");
const timeoutMs = 15000;
const failures = [];
const warnings = [];
const passed = [];

async function request(path) {
  const url = base + path;
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const started = Date.now();
    try {
      const response = await fetch(url, { redirect: "follow", headers: { Origin: "https://briefbridge-smoke.invalid" }, signal: AbortSignal.timeout(timeoutMs) });
      const body = await response.text();
      return { response, body, elapsedMs: Date.now() - started, url };
    } catch (error) {
      lastError = error;
    }
  }
  throw new Error(`${path}: request failed after retry: ${lastError?.message || lastError}`);
}

async function check(path, { json = false, cors = false, includes = "", cache = false, retries = 0 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { response, body, elapsedMs } = await request(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (cache && !(response.headers.get("cache-control") || "").includes("no-cache")) {
        throw new Error("missing Cache-Control: no-cache; updated static assets may remain stale");
      }
      if (cors && response.headers.get("access-control-allow-origin") !== "*") {
        throw new Error("missing Access-Control-Allow-Origin: *");
      }
      if (includes && !body.includes(includes)) throw new Error(`response did not include ${JSON.stringify(includes)}`);
      let parsed;
      if (json) {
        try { parsed = JSON.parse(body); }
        catch { throw new Error("response was not valid JSON"); }
      }
      passed.push({ path, elapsedMs });
      return parsed;
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  failures.push({ path, error: lastError?.message || "unknown request failure" });
  return null;
}

async function checkOtariPreflight() {
  const started = Date.now();
  try {
    const response = await fetch("https://api.otari.ai/api/v1/chat/completions", {
      method: "OPTIONS",
      headers: {
        Origin: base,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const allowOrigin = response.headers.get("access-control-allow-origin") || "";
    const allowMethods = (response.headers.get("access-control-allow-methods") || "").toLowerCase();
    const allowHeaders = (response.headers.get("access-control-allow-headers") || "").toLowerCase();
    if (!response.ok) throw new Error(`preflight returned HTTP ${response.status}`);
    if (allowOrigin !== "*" && allowOrigin !== base) throw new Error(`preflight did not allow origin ${base}`);
    if (!allowMethods.includes("post")) throw new Error("preflight does not allow POST");
    if (!allowHeaders.includes("authorization") || !allowHeaders.includes("content-type")) {
      throw new Error("preflight does not allow Authorization and Content-Type headers");
    }
    passed.push({ path: "Otari browser preflight", elapsedMs: Date.now() - started });
  } catch (error) {
    warnings.push({ path: "Otari browser preflight", error: `${error.message}. Hosted Otari browser CORS must be enabled for this origin, or requests must use a transparent relay.` });
  }
}

console.log(`BriefBridge live smoke test: ${base}`);
await checkOtariPreflight();

await check("/", { includes: "BriefBridge" });
const manifest = await check("/agent-manifest.json", { json: true, cors: true });
const network = await check("/briefbridge_network.network.json", { json: true, cors: true });
const alias = await check("/briefbridge_network", { json: true });
await check("/runtime/index.js", { includes: "export" });
await check("/app.js", { includes: "normalizeBrief" });
await check("/app.js", { includes: "parseBriefJson", cache: true });
await check("/index.html", { includes: 'id="import-json"', cache: true });
await check("/site.js", { includes: "Open questions", retries: 5 });
await check("/runtime/sandbox-worker.js", { includes: "self" });
await check("/bridge/action-bridge.html", { includes: "action-bridge.js" });
await check("/links.json", { json: true, cors: true });
await check("/agent-mcp.json", { json: true, cors: true });
await check("/.well-known/nsdeploy.json", { json: true, cors: true });
await check("/.well-known/nsdeploy-agent.json", { json: true, cors: true });

if (manifest) {
  const entry = manifest.networks?.find(item => item.name === "briefbridge_network");
  if (!entry || entry.front_man !== "briefbridge_coordinator") {
    failures.push({ path: "/agent-manifest.json", error: "network/front agent declaration is inconsistent" });
  }
}
if (network) {
  const agents = new Set((network.tools || []).map(agent => agent.name));
  for (const name of ["briefbridge_coordinator", "brief_architect"]) {
    if (!agents.has(name)) failures.push({ path: "/briefbridge_network.network.json", error: `missing agent ${name}` });
  }
}
if (network && alias && JSON.stringify(network) !== JSON.stringify(alias)) {
  failures.push({ path: "/briefbridge_network", error: "network alias does not resolve to the published network JSON" });
}
if (manifest && manifest.llm_router?.mock !== false) {
  failures.push({ path: "/agent-manifest.json", error: "live network must not be configured for mock mode" });
}
if (manifest && manifest.llm_router?.base_url !== "https://api.otari.ai/api/v1") {
  failures.push({ path: "/agent-manifest.json", error: "default Otari router base URL is not the current hosted OpenAI-compatible endpoint" });
}
if (network && network.llm_config?.model_name !== "mzai:moonshotai/Kimi-K2.6") {
  failures.push({ path: "/briefbridge_network.network.json", error: "network model selector is not the current Otari managed-catalog selector" });
}

try {
  const { response } = await request("/runtime/sandbox-worker.js");
  const csp = response.headers.get("content-security-policy") || "";
  if (!csp.includes("default-src 'none'")) {
    failures.push({ path: "/runtime/sandbox-worker.js", error: "restrictive sandbox-worker CSP is missing" });
  }
} catch (error) {
  failures.push({ path: "/runtime/sandbox-worker.js", error: error.message });
}

for (const item of passed) console.log(`PASS ${item.path} (${item.elapsedMs} ms)`);
for (const item of failures) console.error(`FAIL ${item.path}: ${item.error}`);
for (const item of warnings) console.warn(`WARN ${item.path}: ${item.error}`);
console.log(`Result: ${passed.length} checks passed; ${failures.length} failures; ${warnings.length} warnings.`);
if (failures.length) process.exitCode = 1;
