import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentNetwork, validateNetwork } from "../runtime/kernel.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const readJson = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
const origin = "https://briefbridge-bpxd.onrender.com";
const peerUrl = `${origin}/briefbridge_network`;

const [manifest, networkJson, links, linkWellKnown, agentWellKnown] = await Promise.all([
  readJson("agent-manifest.json"),
  readJson("shopstart_network.network.json"),
  readJson("links.json"),
  readJson(".well-known/nsdeploy.json"),
  readJson(".well-known/nsdeploy-agent.json")
]);

const entry = manifest.networks?.find(item => item.name === "shopstart_network");
assert.ok(entry, "manifest must publish shopstart_network");
assert.equal(entry.front_man, "shopstart_coordinator");
assert.equal(entry.hocon, "./shopstart_network.network.json");
assert.deepEqual(manifest.allowed_peers, [origin], "only BriefBridge may be called");
assert.equal(manifest.peer_policy?.mode, "closed");
assert.equal(manifest.llm_router?.base_url, "https://api.otari.ai/api/v1");
assert.equal(manifest.llm_router?.mock, false);
assert.equal(manifest.deployment?.mode, "static");
assert.equal(manifest.deployment?.direct_byok, true);
assert.equal(manifest.actions, undefined, "ShopStart must not expose page actions");

const net = new AgentNetwork(networkJson, entry.name);
const validation = validateNetwork(net);
assert.deepEqual(validation.errors, [], "Open Agentic Web network validation must pass");
assert.equal(net.findFrontMan(), entry.front_man);
assert.equal(net.classifyTool(peerUrl).kind, "remote", "BriefBridge must be a remote peer tool");
assert.equal(net.getAgentSpec(entry.front_man).tools[0], peerUrl);
assert.ok(net.config.link_labels?.[peerUrl], "consent card needs a partner label");

assert.equal(links.version, 1);
assert.deepEqual(links.networks?.shopstart_network, {});
assert.equal(linkWellKnown.protocol, "nsdeploy-link/v1");
assert.equal(linkWellKnown.exports?.[0]?.network, "shopstart_network");
assert.equal(linkWellKnown.exports?.[0]?.front_man, "shopstart_coordinator");
assert.equal(agentWellKnown.protocol, "nsdeploy-agent-mcp/v1");
assert.equal(agentWellKnown.available, false);

const render = await readFile(resolve(root, "render.yaml"), "utf8");
for (const path of [
  "/agent-manifest.json",
  "/shopstart_network.network.json",
  "/links.json",
  "/.well-known/nsdeploy.json",
  "/.well-known/nsdeploy-agent.json"
]) {
  assert.ok(render.includes(`path: ${path}`), `Render CORS rules missing for ${path}`);
}
assert.ok(render.includes("Access-Control-Allow-Origin"));
assert.ok(render.includes("value: \"*\""));

console.log("ShopStart JSON and network checks passed.");
console.log("Network: shopstart_network; front agent: shopstart_coordinator.");
console.log("Peer policy: BriefBridge only.");
