# Open Agentic Web Challenge submission checklist

## Technical

**Current deployment:** https://briefbridge-bpxd.onrender.com (Render reports the deployment live on commit `57eb8a1bc18fec87b22271c22114821b706680f9`). The remaining browser, endpoint, CORS and Otari checks below still need hands-on verification.

- [x] Public HTTPS homepage is live and opens without a login (owner smoke-tested).
- [ ] `/agent-manifest.json` returns valid JSON.
- [ ] `/briefbridge_network.network.json` returns valid JSON and matches the manifest's network entry.
- [ ] `/runtime/index.js` loads in a browser.
- [ ] `/briefbridge_network` resolves the published network.
- [ ] A visitor can configure an Otari key in AI model settings.
- [ ] A visitor can run the coordinator and specialist agents.
- [ ] Save and delete actions require human confirmation.
- [ ] A second origin can fetch the public manifest and network artifacts (CORS).
- [x] `npm run check` passes on the deployed commit (6 tests passed; 0 failed).
- [ ] Test the deployed website in a current desktop browser and on a phone.

## Submission materials

- [ ] Project description explains the problem, audience, agent workflow and impact.
- [ ] At least one screenshot of the live website.
- [ ] A YouTube demo under two minutes, narrated by the entrant.
- [ ] Devpost project URL and public website URL.
- [ ] Link to the public GitHub repository.
- [ ] Confirm that the project is open source and the upstream runtime license is included.

## Otari-specific fields

If submitting with Otari, the Devpost page asks for the email on the Otari account so the organizers can match usage. Add it directly to Devpost; do not commit it to this repository.

The submission also asks for a short note describing an issue encountered with Otari and how it could improve. Record an honest observation from testing before writing this answer. Do not invent a problem or claim that a bug occurred if it did not.
