# BriefBridge architecture

## Request flow

1. The visitor describes a project in the page or the chat.
2. The browser runtime loads `agent-manifest.json` and `briefbridge_network.network.json`.
3. The coordinator reads the current workspace through the registered `website_get_workspace_state` action.
4. The coordinator delegates scope analysis to `brief_architect`.
5. The coordinator returns a grounded brief and asks the visitor for missing details.
6. If the visitor explicitly asks to save, the coordinator calls `website_save_brief`.
7. The runtime opens a human review dialog. Only after approval does the action save to browser local storage.
8. The visitor can export Markdown or JSON from the website.

## Components

- **Mozilla Otari:** OpenAI-compatible model gateway. The visitor's browser calls the hosted Otari endpoint with the visitor's own key.
- **Open Agentic Web runtime:** JavaScript runtime from Cognizant AI Lab's agentic-web reference repository. It validates and executes the portable network in the browser.
- **Agent network:** Data-only JSON/HOCON serialization with a coordinator and brief specialist.
- **Site actions:** Small wrappers around the website's own state and persistence functions. They do not contain a second copy of the product's business rules.
- **Local storage:** Holds the current draft and saved briefs in the visitor's browser.

## Trust boundaries

- The published manifest, network definition and agent instructions are public.
- The BYOK key is not part of the manifest, network JSON, local website actions or source code.
- The key is sent to the selected router, not to another agent site.
- A peer caller receives the public network definition but not the host page's `website_*` actions or the visitor's saved brief library.
- No peer networks or external MCP services are contacted by default.
- Save/delete actions are marked irreversible in the runtime action registry and require a browser confirmation.

## Current limitations

- Browser-local persistence only; no account sync or multi-user collaboration.
- No server-side public MCP facade.
- No third-party partner network configured.
- AI output must be reviewed; it is not a contract, legal opinion, binding quote or delivery guarantee.
