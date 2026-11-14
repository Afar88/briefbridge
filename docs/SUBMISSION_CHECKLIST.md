# Open Agentic Web Challenge submission checklist

## Technical

**Current deployment:** https://briefbridge-bpxd.onrender.com (Render reports the deployment live from the current feature branch; see deploy history for the exact source commit). The remaining browser and Otari checks below still need hands-on verification.

- [x] Public HTTPS homepage is live and opens without a login (owner smoke-tested).
- [x] `/agent-manifest.json` returns valid JSON.
- [x] `/briefbridge_network.network.json` returns valid JSON and matches the manifest's network entry.
- [x] `/runtime/index.js` is publicly accessible.
- [x] `/briefbridge_network` resolves the published network.
- [ ] A visitor can configure an Otari key in AI model settings.
- [ ] A visitor can run the coordinator and specialist agents.
- [ ] Agent-driven save and delete actions require human confirmation.
- [x] Public CORS response headers are present on discovery resources (automated cross-origin Origin-header check).
- [ ] Verify an actual browser fetch from a separate origin.
- [x] `npm run check` passes on the latest branch commit (6 tests passed; 0 failed).
- [x] Live endpoint smoke test passed: 13 checks, 0 failures (GitHub Actions run #16).
- [ ] Daily 09:00 Lagos monitor activates after this workflow reaches the default branch.
- [ ] Test the deployed website in a current desktop browser and on a phone.

## Submission materials

- [x] Draft project description is prepared in `docs/DEVPOST_DRAFT.md` (review and remove internal notes before submission).
- [ ] At least one screenshot of the live website.
- [ ] A YouTube demo under two minutes, narrated by the entrant.
- [ ] Devpost project URL and public website URL.
- [ ] Link to the public GitHub repository.
- [ ] Confirm that the project is open source and the upstream runtime license is included.

## Otari-specific fields

If submitting with Otari, the Devpost page asks for the email on the Otari account so the organizers can match usage. Add it directly to Devpost; do not commit it to this repository.

The submission also asks for a short note describing an issue encountered with Otari and how it could improve. Record an honest observation from testing before writing this answer. Do not invent a problem or claim that a bug occurred if it did not.


## Live endpoint smoke test

Run `SITE_URL=https://briefbridge-bpxd.onrender.com npm run smoke` from a Node 20+ environment to check the homepage, published manifest/network JSON, alias route, bridge/runtime assets, CORS response headers and worker CSP. The command sends a cross-origin `Origin` header and verifies the server's CORS response; it does not replace a real browser integration test or an Otari request with a visitor-owned key.
