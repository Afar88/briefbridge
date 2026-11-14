# BriefBridge

**Clarity before the work begins.** BriefBridge turns scattered project requests into clear, reviewable project briefs that clients, creatives and small teams can work from.

BriefBridge is a browser-first open agentic website built for the Open Agentic Web Challenge. **Live site:** https://briefbridge-bpxd.onrender.com Its agent network runs in the visitor's browser using the Cognizant AI Lab reference runtime, while **Mozilla Otari** provides the visitor-selected LLM gateway.

## What it does

- Captures a project's objective, audience, scope, deliverables, constraints, timeline, budget, assumptions and open questions.
- Uses a coordinator agent and a brief-architecture specialist to clarify vague requests and shape a useful scope.
- Separates confirmed facts from assumptions and unanswered questions.
- Saves briefs in the visitor's browser only after an explicit confirmation.
- Exports a brief as Markdown or JSON.
- Publishes a portable agent network that other conforming agentic websites can discover and call.

## Try it locally

Requirements: Node.js 20+.

```bash
git clone https://github.com/Afar88/briefbridge.git
cd briefbridge
npm run check
npm run serve
```

Open http://127.0.0.1:8080.

To check the public deployment and discovery endpoints from your machine, run `npm run smoke`. It verifies the homepage, public JSON resources, network rewrite, runtime/bridge files, CORS headers and sandbox-worker CSP. It does not make an AI request or require an Otari key.

The brief builder works without an AI key. To use the agents:

1. Create an account at [otari.ai](https://otari.ai) and create an API key.
2. Open **AI model settings** in the assistant.
3. Paste the Otari key. The published defaults are hosted Otari at `https://api.otari.ai/api/v1` and `nebius:moonshotai/Kimi-K2.6`. For EU-region Otari accounts, use `https://eu.api.otari.ai/api/v1` instead.
4. Select **Save and start**, then describe a project request.

Do not paste API keys into GitHub, project files, screenshots or chat messages. The reference runtime keeps the BYOK setup in this browser and sends the key only to the configured router. Your messages and any page data the agents read are sent to the model provider you select. To clear the saved setup, use **Delete setup** in the AI model settings, then close the tab.

## Open Agentic Web publication

The public site root exposes:

| Resource | Purpose |
| --- | --- |
| `/agent-manifest.json` | Lists the published network, front agent, router and site capabilities. |
| `/briefbridge_network.network.json` | Resolved, data-only agent graph consumed by browser runtimes. |
| `/runtime/index.js` | Browser runtime entry point. |
| `/links.json` | Publisher-owned peer-network link map. |
| `/agent-mcp.json` | MCP discovery metadata; a separate public MCP server is not enabled in this static build. |
| `/bridge/action-bridge.html` | Allows other agent sites to load the public network without receiving this site's local actions. |
| `/.well-known/nsdeploy.json` | Network linking metadata. |
| `/.well-known/nsdeploy-agent.json` | Agent/MCP discovery metadata. |

The network URL is `https://YOUR-DOMAIN/briefbridge_network`. A caller loads the public network into its visitor's browser and uses that visitor's selected router and key. Callers do not receive BriefBridge's local website actions or saved briefs.

## Mozilla Otari

BriefBridge uses Otari as its default OpenAI-compatible LLM router. Visitors bring their own Otari key, so the website operator does not pay for their model calls and does not handle provider credentials.

- US-region router: `https://api.otari.ai/api/v1`
- EU-region router: `https://eu.api.otari.ai/api/v1`
- Default managed model: `nebius:moonshotai/Kimi-K2.6`
- Choose a model that supports chat completions and tool calls.
- The visitor can change the model or provider in the runtime's advanced settings.
- Model usage may incur charges on the visitor's Otari account; use a key with a suitable budget and model restrictions.

BriefBridge calls the hosted Otari OpenAI-compatible endpoint directly from the browser. **Current release gate:** the hosted endpoint returned HTTP 404 to our browser preflight from the BriefBridge origin, so direct BYOK inference is not yet verified. Otari must enable `cors_inference_origins` for this origin, or we must deploy a transparent relay. For a self-hosted gateway, set `cors_inference_origins` to the exact website origin and use that gateway's `/api/v1` endpoint. The manual brief builder remains available.

## Deploy on Render (primary hosting)

BriefBridge is a static site; it does not need a server process, database, or runtime secrets. The repository's `render.yaml` is the deployment blueprint.

The Render static site is already provisioned at **https://briefbridge-bpxd.onrender.com** from `build/complete-mozilla-otari`; it is separate from `main` and the draft PR remains unmerged. The latest deployment is live from this feature branch; use the Render deploy history for the exact source commit. To recreate it in another Render workspace:

1. Connect the GitHub repository `Afar88/briefbridge` to Render.
2. Create a new **Blueprint** and select this repository.
3. Select the branch `build/complete-mozilla-otari`.
4. Render reads `render.yaml`, runs `npm install && npm run check`, and publishes the repository root.
5. Keep the generated `onrender.com` URL publicly accessible to judges and testers.
6. Verify that `/agent-manifest.json` and `/briefbridge_network.network.json` return successfully with `Access-Control-Allow-Origin: *`.
7. Verify that `/runtime/sandbox-worker.js` is served with the restrictive Content Security Policy required by the coded-tool sandbox.
8. Test the assistant with your own Otari key and check the network URL from a second browser or agentic site.

The Render blueprint configures the public network rewrite, discovery CORS headers, global content-type/referrer headers, and the sandbox worker CSP. It deliberately does not set `X-Frame-Options` or a frame-blocking CSP on `/bridge/`; other agent sites need to load the bridge.

Netlify and Vercel configuration files are retained as secondary hosting fallbacks. Render is the selected primary platform for this release.

## Architecture

- `index.html`, `styles.css`, `app.js`: responsive product UI and browser-local brief library.
- `agent-manifest.json`, `briefbridge_network.hocon`, `briefbridge_network.network.json`: published agent network and discovery metadata.
- `site-actions.js`: registers the page's read/save/delete operations with the runtime.
- `site.js`: boots the browser runtime and presents human confirmation before save/delete actions.
- `runtime/`: unmodified browser runtime files from [cognizant-ai-labs/agentic-web](https://github.com/cognizant-ai-labs/agentic-web), under the included Apache-2.0 runtime license.
- `scripts/check-network.mjs`: validates the published network and required files.
- `scripts/smoke-live.mjs`: checks the live public site, discovery endpoints, CORS and sandbox headers.
- `scripts/serve.mjs`: local static server with the CORS and worker headers needed for interoperability checks.

## Checks

```bash
npm run check
```

This validates the manifest/network relationship, checks that all declared website actions are referenced by the front agent, checks the runtime and discovery files, and runs the brief-format tests.

## Data, privacy and limitations

- Saved briefs and the current draft are stored in the browser's local storage. There is no account system or cloud sync in this version.
- When the AI assistant reads the workspace, the relevant page data and the visitor's messages are sent to the selected LLM provider.
- The public network definition and its instructions are readable by anyone. Never put secrets or private client records in them.
- Saving and deleting through the agent require a browser confirmation. Manual form submission is a direct user action.
- BriefBridge does not sign contracts, collect payments, provide legal advice, book services, guarantee project budgets or guarantee delivery dates.
- A static deployment publishes a browser-callable agent network, not a standalone public MCP server.
- The current network does not call third-party partner networks by default.

## Open source

BriefBridge application code is released under the MIT License. The browser runtime is distributed under its upstream Apache-2.0 license; see `runtime/LICENSE.txt` and `runtime/README.md`.
