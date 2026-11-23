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

**Current integration limit:** BriefBridge's published `bridge/action-bridge.html` points to a bridge manifest with no action module, so it shares no page actions with partner visitors. Its current coordinator also has a peer-mode rule that tells partner callers to skip the brief-building steps and point visitors to BriefBridge. As a result, the current public network can reply with service guidance, but it cannot return the requested draft brief in this flow.

The smallest BriefBridge-side fix is a peer-safe branch in `briefbridge_coordinator` instructions (or a separate public draft front agent): when the caller has no `website_*` actions, delegate to `brief_architect` and return the structured draft in chat. It must not fill a local form, read saved briefs, save or delete anything. That change is intentionally not included here.

ShopStart displays the actual BriefBridge reply and tells the visitor when it is not a draft. The **Open in BriefBridge** link lets the visitor continue there.
