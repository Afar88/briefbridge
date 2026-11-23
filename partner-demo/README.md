# ShopStart

ShopStart is a small, standalone website starter. It runs its own browser agent network and links to BriefBridge:

`https://briefbridge-bpxd.onrender.com/briefbridge_network`

## Run locally

From the repository root:

```sh
python -m http.server 8080 --directory partner-demo
```

Open `http://localhost:8080`. Add your own Otari key in AI model settings, then describe the site you need. ShopStart uses the copied runtime in `runtime/`; it does not need a server, MCP service or app key.

## Check it

From the repository root:

```sh
npm --prefix partner-demo run check
```

This parses every published JSON file and validates the network with the copied runtime. The repository's existing root `npm run check` remains unchanged and is run by the root GitHub Actions workflow.

## Deploy on Render

Create a separate Render Static Site from this repository. Set:

- **Root Directory:** `partner-demo`
- **Build Command:** `npm run check`
- **Publish Directory:** `.`

The `render.yaml` in this folder records the required CORS headers for the public manifest, network JSON, links and discovery files. Add the same headers in the Render Static Site's Headers settings if the Dashboard does not load a Blueprint from the selected root directory.

## Linked BriefBridge network

ShopStart calls the public `briefbridge_network` after the visitor approves the partner consent card. The peer network runs in this browser using the visitor's selected router and key. The key is not sent to BriefBridge.

**Peer-mode behaviour:** BriefBridge's coordinator now has peer-safe instructions. When called without `website_*` page tools, it delegates the caller's project details to `brief_architect` and returns the brief in its reply under the nine requested headings. It does not read the BriefBridge workspace, fill the page form, save or delete a brief. BriefBridge's own on-page workflow is unchanged.

ShopStart places the actual peer reply inside the **Made by BriefBridge** result panel. It marks the reply as a structured draft only when all nine headings are present; otherwise it says no structured draft was returned. The **Open in BriefBridge** link opens the existing site for review and saving.

**Privacy and request flow:** The visitor's API key is stored in their browser by the BYOK runtime and sent in an Authorization header only to their selected AI router. After consent, the browser makes GET requests to BriefBridge for its public manifest and network definition, then runs that peer network locally using the visitor's selected router. No API key or business request body is sent to BriefBridge's web server.
