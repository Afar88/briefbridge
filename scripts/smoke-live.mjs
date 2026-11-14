const base = (process.env.SITE_URL || "https://briefbridge-bpxd.onrender.com").replace(/\/$/, "");
const timeoutMs = 15000;
const failures = [];
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

async function check(path, { json = false, cors = false, includes = "", retries = 0 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { response, body, elapsedMs } = await request(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
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

console.log(`BriefBridge live smoke test: ${base}`);

await check("/", { includes: "BriefBridge" });
const manifest = await check("/agent-manifest.json", { json: true, cors: true });
const network = await check("/briefbridge_network.network.json", { json: true, cors: true });
const alias = await check("/briefbridge_network", { json: true });
await check("/runtime/index.js", { includes: "export" });
await check("/app.js", { includes: "normalizeBrief" });
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
console.log(`Result: ${passed.length} checks passed; ${failures.length} failures.`);
if (failures.length) process.exitCode = 1;
