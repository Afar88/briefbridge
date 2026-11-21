# BriefBridge UI/UX audit and redesign direction

**Baseline:** `main` at `3a6e5715975fb60df3fba58e7ad605c89e83d86b`  
**Audit date:** 2026-11-14  
**Status:** Design specification only; no product UI or agent behavior changed in this commit.

## Product experience observed in source

The current homepage is a long, single-page experience with this order:

1. Marketing hero and primary calls to action.
2. Three-step value explanation.
3. Full manual brief builder.
4. Live preview and saved-brief library in a side column.
5. AI assistant and provider onboarding.
6. Closing call to action and footer.

The manual builder is useful without an API key. Required fields are title, objective, audience and at least one deliverable. Drafts and saved briefs are browser-local; exports are Markdown/JSON; JSON import loads into the editor for review. AI provider setup is visitor-owned BYOK, and agent-initiated save/delete actions require a separate confirmation.

## Findings

### P0 — Make the first action obvious

- The homepage offers both “Build your first brief” and “Talk to the assistant”, but the two workflows are separated vertically and have different interaction models.
- The user must scroll past the entire manual builder to reach the AI assistant, even though the AI assistant is a core differentiator.
- The page does explain that manual brief creation works without a key, but the first-time visitor may not know which path is right.

**Direction:** Present two clear entry paths at the workspace start: “Build manually” and “Start with AI”. Explain that manual mode needs no key and AI mode requires the visitor's own provider key. Keep both paths available without making either feel secondary.

### P1 — Reduce form fatigue

- The manual form exposes many fields at once, including optional assumptions, open questions and next steps.
- The two-column field groups become a long single column on mobile.
- The live preview is useful but sits in a side column on desktop and below the form on mobile.

**Direction:** Group fields into short, progressive sections: Project basics; Goal and audience; Scope and deliverables; Constraints and planning. Keep optional fields collapsed or clearly marked optional. Show progress and preserve the preview as a compact, continuously updated summary. Do not add artificial required fields.

### P1 — Improve saved-brief discoverability

- Saved briefs appear in a side panel alongside the preview, without a dedicated library view.
- Opening a saved brief loads it into the editor; deleting it uses a browser confirmation. These behaviors need clear feedback and an obvious distinction between opening and deleting.

**Direction:** Give the library a focused view with title, project type, last-saved/created date where available, open, export and delete actions. Keep delete confirmation explicit. Do not imply cloud sync or sharing accounts exist.

### P1 — Make AI setup less intimidating

- The assistant onboarding is visible and gives three steps, but the API-key setup is a nested disclosure inside another runtime settings component.
- Advanced model selection is itself nested under “Advanced settings”, so model discovery may be hard to find.
- The runtime's connected state is labelled as awaiting verification until the first successful response.

**Direction:** Use a clear setup card with provider, API key, model selection and connection state. Keep provider URL and manual model ID under advanced options. Distinguish “Key saved”, “Checking connection”, “Connected” and actionable errors. Never show or log the API key. Keep the browser-local BYOK disclosure close to setup.

### P1 — Strengthen feedback and recovery

- The app has live preview, autosave, import/export and status text, but the main experience is visually dense and feedback is distributed across separate regions.
- Import errors, local-storage failures, AI runtime startup failure and provider request errors need consistent presentation.

**Direction:** Use a consistent inline status pattern for saved, imported, exported, deleted, storage-unavailable, runtime-unavailable and provider-error states. Errors should explain what the user can do next; never claim an AI request succeeded until a real response arrives.

### P2 — Responsive layout and accessibility

- CSS has breakpoints at 950px and 680px, collapses the workspace to one column and hides top navigation on small screens.
- The small-screen navigation is hidden rather than replaced by a compact navigation affordance.
- Form controls have visible focus styling; the redesign should preserve keyboard access, semantic labels, live status announcements and adequate touch targets.
- The AI chat is fixed to a tall viewport area; mobile behavior should be checked for scrolling and keyboard overlap.

**Direction:** Design desktop and mobile intentionally. On mobile, retain access to Workspace, AI assistant and Saved briefs; use stacked cards, full-width actions, comfortable touch targets and no horizontal overflow.

## Proposed information architecture

1. **Workspace** — a calm, focused start screen with two entry paths and a compact recent-brief summary.
2. **Brief editor** — progressive sections with a live preview and save/export actions.
3. **AI assistant** — conversation, agent activity and a reviewable structured brief result.
4. **Saved briefs** — searchable/filterable local library with open/export/delete actions.
5. **AI settings** — provider and model setup, connection status, privacy note and advanced configuration.

This can remain a single-page browser application with anchored sections or lightweight client-side view switching; do not introduce accounts, cloud storage or a backend solely for the redesign.

## Visual direction

- Mature, editorial workspace rather than a marketing landing page dominating the product.
- Retain the existing dark navy and restrained lime accent as a recognizable starting point, but increase neutral surface contrast and reduce decorative gradients/orbits in the working area.
- Use a consistent spacing scale, typography hierarchy, field height, border radius and status palette.
- Prioritize readable body text, clear section headings, strong primary actions and restrained secondary controls.
- Avoid dense metadata, excessive all-caps labels and ambiguous icon-only actions.

## Required screen/state coverage

- Workspace first visit (no saved briefs; AI not configured).
- Workspace returning visit (draft and saved briefs present).
- Manual editor: empty, incomplete, valid, autosaving and storage failure.
- AI assistant: setup required, setup saved, loading, successful response, agent delegation failure, provider/network error.
- Structured AI brief review before save.
- Saved library: empty, populated, opening, export feedback and delete confirmation.
- Provider settings: model list loading, models available, model list unavailable/manual entry, invalid key and verified connection.
- Import: valid file, invalid JSON, invalid brief, oversized file.
- Mobile versions of workspace, editor, assistant, library and confirmation states.

## Non-negotiable behavior to preserve

- Browser-local draft and saved-brief storage; no claim of cloud sync.
- Visitor-owned API key; never expose it in page content, logs or generated artifacts.
- Manual brief builder remains usable without an API key.
- Validation limits and import safeguards remain intact.
- AI save/delete actions remain separately confirmation-gated; batch save/delete remains rejected.
- Confirmed facts, assumptions and open questions remain distinct in the generated brief.
- Do not invent project dates, prices, budget or deliverables.
- Do not merge redesign work into `main` without explicit approval.

## Verification note

Render currently reports the service `briefbridge-bpxd` as live on commit `3a6e5715975fb60df3fba58e7ad605c89e83d86b`, matching `main` at audit time. The authenticated Otari inference path still requires a visitor-owned key and has not been validated by this source audit.

The checked-in `scripts/smoke-live.mjs` contains an outdated expected model assertion for `mzai:moonshotai/Kimi-K2.6`, while `scripts/check-network.mjs` and the published network use `alibaba/qwen3.5-397b-a17b`. This is a test-maintenance defect to correct on a separate small change before relying on the live smoke script.
