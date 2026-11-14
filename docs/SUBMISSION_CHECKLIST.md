# Open Agentic Web Challenge submission checklist

## Technical

**Current deployment:** https://briefbridge-bpxd.onrender.com (Render reports the deployment live from the current feature branch; see deploy history for the exact source commit). The remaining browser, endpoint, CORS and Otari checks below still need hands-on verification.

- [x] Public HTTPS homepage is live and opens without a login (owner smoke-tested).
- [x] `/agent-manifest.json` returns valid JSON.
- [x] `/briefbridge_network.network.json` returns valid JSON and matches the manifest's network entry.
- [x] `/runtime/index.js` is publicly accessible.
- [x] `/briefbridge_network` resolves the published network.
- [ ] A visitor can configure an Otari key in AI model settings.
- [ ] A visitor can run the coordinator and specialist agents.
- [ ] Save and delete actions require human confirmation.
- [x] Public CORS headers are present on discovery resources.\n- [ ] Verify an actual browser fetch from a separate origin.
- [x] `npm run check` passes on the deployed commit (6 tests passed; 0 failed).\n- [x] Live endpoint smoke test passed: 11 checks, 0 failures (GitHub Actions run #3).\n- [ ] Daily 09:00 Lagos monitor activates after this workflow reaches the default branch.
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
