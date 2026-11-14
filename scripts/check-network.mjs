import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHocon } from "../runtime/hocon.js";
import { AgentNetwork, validateNetwork } from "../runtime/kernel.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
const fail = message => { console.error("FAIL:", message); process.exitCode = 1; };
const manifest = await readJson("agent-manifest.json");
const entry = manifest.networks?.find(item => item.name === "briefbridge_network");
if (!entry) fail("agent-manifest.json must publish briefbridge_network.");
if (entry?.front_man !== "briefbridge_coordinator") fail("The network front_man does not match the coordinator.");
if (entry?.hocon !== "./briefbridge_network.network.json") fail("The manifest must point to the public network JSON.");

const networkJson = await readJson("briefbridge_network.network.json");
const hoconText = await readFile(resolve(root, "briefbridge_network.hocon"), "utf8");
const hoconConfig = parseHocon(hoconText);
if (JSON.stringify(hoconConfig, null, 2) + "\n" !== JSON.stringify(networkJson, null, 2) + "\n") {
  fail("The HOCON source and published JSON are out of sync.");
}
const network = new AgentNetwork(hoconConfig, entry?.name || "briefbridge_network");
const validation = validateNetwork(network);
for (const message of validation.errors) fail(`Open Agentic Web runtime validation: ${message}`);
if (network.findFrontMan() !== entry?.front_man) fail("The runtime resolves a different front agent than the manifest.");
const agents = new Map((network.config.tools || []).map(agent => [agent.name, agent]));
for (const agent of network.config.tools || []) {
  for (const tool of agent.tools || []) {
    if (typeof tool === "string" && !agents.has(tool) && !tool.startsWith("https://")) {
      fail(`Agent ${agent.name} references missing agent ${tool}.`);
    }
  }
  if (agent.demo_mode) fail(`Agent ${agent.name} must not use demo_mode.`);
}
const front = agents.get(entry?.front_man);
if (!front?.tools?.includes("brief_architect")) fail("The coordinator must be able to delegate to brief_architect.");
for (const name of manifest.actions?.agentTools || []) {
  if (!front?.instructions?.includes(`website_${name}`)) fail(`Coordinator instructions do not mention website_${name}.`);
}
if (manifest.llm_router?.base_url !== "https://api.otari.ai/v1") fail("The published default router should be hosted Mozilla Otari.");
if (networkJson.llm_config?.model_name !== "mzai:moonshotai/Kimi-K2.6") fail("The default model must use the documented Otari managed-model selector.");
if (manifest.llm_router?.mock !== false) fail("The public network must not run in mock mode.");
if (manifest.deployment?.mode !== "static") fail("The deployment mode must be static.");
if (!manifest.actions?.module || !manifest.actions?.bridge) fail("The action module and bridge must be declared.");

for (const path of [
  "runtime/index.js", "runtime/engine.js", "runtime/runner.js",
  "runtime/sandbox-worker.js", "runtime/ui.js", "site-actions.js",
  "site.js", "links.json", "agent-mcp.json", "bridge/action-bridge.html",
  "bridge/agent-manifest.json", ".well-known/nsdeploy.json",
  ".well-known/nsdeploy-agent.json"
]) {
  try { await readFile(resolve(root, path)); }
  catch { fail(`Required public file is missing: ${path}`); }
}

if (process.exitCode) process.exit(process.exitCode);
console.log("BriefBridge network checks passed.");
console.log(`Network: ${entry.name}; front agent: ${entry.front_man}; agents: ${agents.size}`);
console.log(`Otari router: ${manifest.llm_router.base_url}; website actions: ${(manifest.actions.agentTools || []).join(", ")}`);
