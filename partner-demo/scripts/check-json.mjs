import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { AgentNetwork, validateNetwork } from "../runtime/kernel.js";
import { isStructuredBrief, REQUIRED_BRIEF_HEADINGS } from "../partner-result.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const readJson = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
const readText = async path => readFile(resolve(root, path), "utf8");
const origin = "https://briefbridge-bpxd.onrender.com";
const peerUrl = `${origin}/briefbridge_network`;

const [
  manifest, networkJson, links, linkWellKnown, agentWellKnown, packageJson,
  html, siteSource, byokSource, llmSource, remoteSource, engineSource, render
] = await Promise.all([
  readJson("agent-manifest.json"),
  readJson("shopstart_network.network.json"),
  readJson("links.json"),
  readJson(".well-known/nsdeploy.json"),
  readJson(".well-known/nsdeploy-agent.json"),
  readJson("package.json"),
  readText("index.html"),
  readText("site.js"),
  readText("runtime/byok.js"),
  readText("runtime/llm.js"),
  readText("runtime/remote.js"),
  readText("runtime/engine.js"),
  readText("render.yaml")
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
assert.equal(manifest.agent_mcp?.available, false);
assert.equal(manifest.actions, undefined, "ShopStart must not expose page actions");

const net = new AgentNetwork(networkJson, entry.name);
const validation = validateNetwork(net);
assert.deepEqual(validation.errors, [], "Open Agentic Web network validation must pass");
assert.equal(net.findFrontMan(), entry.front_man);
assert.equal(net.classifyTool(peerUrl).kind, "remote", "BriefBridge must be a remote peer tool");
assert.equal(net.getAgentSpec(entry.front_man).tools[0], peerUrl);
assert.ok(net.config.link_labels?.[peerUrl], "consent card needs a partner label");
assert.match(net.getAgentSpec(entry.front_man).instructions, /Never send a name, email, phone number, home address, password or API key/);

assert.equal(links.version, 1);
assert.deepEqual(links.networks?.shopstart_network, {});
assert.equal(linkWellKnown.protocol, "nsdeploy-link/v1");
assert.equal(linkWellKnown.exports?.[0]?.network, "shopstart_network");
assert.equal(linkWellKnown.exports?.[0]?.front_man, "shopstart_coordinator");
assert.equal(agentWellKnown.protocol, "nsdeploy-agent-mcp/v1");
assert.equal(agentWellKnown.available, false);
assert.equal(packageJson.type, "module");
assert.equal(packageJson.scripts?.check, "node --check ./site.js && node ./scripts/check-json.mjs");

const sampleBrief = [
  "## Project", "Salon website",
  "**Goal:**", "Attract new customers",
  "### Audience", "Local customers",
  "## Scope", "Responsive five-page site",
  "## Deliverables", "Website design and launch files",
  "## Timeline", "Not specified",
  "## Budget", "Not specified",
  "## Assumptions", "The business already has a logo",
  "## Open questions", "Which booking flow is needed?"
].join("\n");
assert.deepEqual(REQUIRED_BRIEF_HEADINGS, [
  "Project", "Goal", "Audience", "Scope", "Deliverables",
  "Timeline", "Budget", "Assumptions", "Open questions"
]);
assert.equal(isStructuredBrief(sampleBrief), true, "new BriefBridge headings must be recognized as a draft");
assert.equal(isStructuredBrief(sampleBrief.replace("## Budget", "## Extras")), false, "an incomplete reply must not be labelled a structured brief");

assert.ok(html.includes('Made by BriefBridge'), "result panel must identify BriefBridge as the source");
assert.match(html, /class="button button-primary open-briefbridge"[\s\S]*?href="https:\/\/briefbridge-bpxd\.onrender\.com"/);
assert.match(html, /class="button button-primary open-briefbridge"[\s\S]*?target="_blank" rel="noopener noreferrer"/);
assert.match(siteSource, /resultText\.textContent = text\.trim\(\)/, "the actual peer text must be shown safely");
assert.match(siteSource, /isStructuredBrief\(text\)/);
assert.doesNotMatch(siteSource, /innerHTML/, "peer reply must not be rendered as HTML");

assert.match(byokSource, /localStorage\.setItem\(STORE_KEY, JSON\.stringify\(normalized\)\)/);
assert.match(byokSource, /sessionStorage\.setItem\(TAB_KEY_ITEM, setup\.key\)/);
assert.match(byokSource, /return host === "localhost" \|\| host === "127\.0\.0\.1" \|\| host === "::1" \|\| host === "\\[::1\\]"/);
assert.match(byokSource, /if \(!canUseByokCookie\(\) \|\| typeof document === "undefined"\) return;/);
assert.match(llmSource, /Authorization: `Bearer \$\{this\.apiKey\}`/, "key must be sent in an Authorization header to the chosen router");
assert.match(llmSource, /fetch\(`\$\{this\.baseUrl\}\/chat\/completions`, \{\s*method: "POST"/);
assert.ok(!llmSource.includes(origin), "the LLM client must not send provider credentials to BriefBridge");
assert.match(remoteSource, /const resp = await fetch\(url\)/, "remote network files are fetched from the browser");
assert.doesNotMatch(remoteSource, /method:\s*["']POST|Authorization\s*:/, "peer metadata fetches must not post visitor data or keys");
assert.match(engineSource, /Never send execution or a BYOK key to the peer/);
assert.match(engineSource, /if \(this\.top\?\.manifest\?\.deployment\?\.mode === "static"\) return;/, "static sites must retain links in this browser only");

const renderPaths = [
  "/agent-manifest.json",
  "/shopstart_network",
  "/shopstart_network.network.json",
  "/links.json",
  "/.well-known/nsdeploy.json",
  "/.well-known/nsdeploy-agent.json"
];
for (const path of renderPaths) {
  assert.ok(render.includes(`path: ${path}`), `Render CORS rules missing for ${path}`);
  const block = render.split(`- path: ${path}`)[1]?.split("\n      - path:")[0] || "";
  assert.ok(block.includes("name: Access-Control-Allow-Origin"), `CORS header missing for ${path}`);
  assert.ok(block.includes('value: "*"'), `public CORS value missing for ${path}`);
}
assert.ok(render.includes("name: X-Content-Type-Options") && render.includes("value: nosniff"));
assert.ok(render.includes("name: Content-Security-Policy"));
assert.ok(render.includes("source: /shopstart_network"), "Render must rewrite the public network URL");
assert.ok(render.includes("destination: /shopstart_network.network.json"), "Render rewrite target must be the network JSON");
assert.match(render, /name: shopstart[\s\S]*?branch: main[\s\S]*?rootDir: partner-demo[\s\S]*?buildCommand: npm run check[\s\S]*?staticPublishPath: \./);
assert.doesNotMatch(render, /^\s+envVars:/m, "ShopStart must not configure server-side keys or secrets");

const secretMaterial = [JSON.stringify(manifest), JSON.stringify(networkJson), html, siteSource, render].join("\n");
assert.doesNotMatch(secretMaterial, /(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,})/, "no literal API credentials may be committed");

console.log("ShopStart JSON, display, privacy and Render checks passed.");
console.log("Network: shopstart_network; front agent: shopstart_coordinator.");
console.log("Peer policy: BriefBridge only; browser-local execution; no server-side key.");
