# BriefBridge — Devpost submission draft

> **Clarity before the work begins.** Turn scattered project requests into clear, reviewable briefs.

## Project description

A project can begin with only a vague message: a client has an idea, but the goal, audience, scope, deliverables, timeline and budget are still unclear. Teams then spend time chasing context, making assumptions and correcting avoidable misunderstandings.

**BriefBridge is a browser-first project-intake assistant that turns incomplete requests into structured project briefs.** A visitor can fill in the brief manually or work with a two-agent network. The coordinator clarifies the request, asks for missing information and delegates scope organization to a brief-architecture specialist. The result separates confirmed information from assumptions and open questions so people can agree on what the work actually involves before it begins.

BriefBridge is designed for freelancers, creative teams, small businesses and clients who need a clearer starting point—not another complicated project-management system.

## How it works

1. **Start with the rough request.** Describe the project in ordinary language or use the structured intake form.
2. **Clarify what is missing.** The coordinator asks focused follow-up questions rather than silently filling gaps.
3. **Organize the scope.** A specialist agent structures the objective, audience, deliverables, constraints, timeline, budget, assumptions and open questions.
4. **Review before saving.** The visitor checks the proposed brief. Agent-driven save and delete actions require an explicit browser confirmation.
5. **Keep and reuse the result.** Briefs are saved locally in the visitor's browser, can be exported as Markdown or JSON, and previously exported JSON briefs can be imported for review and reuse.

The agents are instructed not to invent prices, dates, deliverables, approvals or client facts. BriefBridge prepares a working brief; it does not sign contracts, collect payments or guarantee project outcomes.

## What makes it an open agentic website

BriefBridge publishes a machine-readable agent manifest and a portable JSON agent network, alongside the browser runtime and an interface for people to interact with the agents. Its network is designed to be discoverable and callable by other conforming agentic websites.

The website uses the Cognizant AI Lab Open Agentic Web reference runtime to validate and run the network in the visitor's browser. Mozilla Otari is the model gateway. Visitors configure their own provider credentials in the browser rather than relying on a secret embedded in the website.

Website actions are deliberately scoped. The public network definition does not expose a visitor's local saved briefs, and changes to the local library require browser confirmation.

## Built with

- **Open web technologies:** HTML, CSS and JavaScript.
- **Cognizant AI Lab Open Agentic Web runtime:** browser-based agent-network validation and execution.
- **Mozilla Otari:** OpenAI-compatible model routing with visitor-provided credentials.
- **Render:** public static hosting for the website, runtime and discovery resources.

## Privacy and responsible behaviour

- Drafts and saved briefs remain in the visitor's browser; this version has no cloud account or sync.
- Messages and page context sent to the assistant are processed by the model provider selected by the visitor.
- API credentials are not embedded in the repository or public agent manifest.
- The coordinator distinguishes confirmed facts, assumptions and unanswered questions.
- Agent-driven save and delete operations require an explicit browser confirmation.
- BriefBridge does not provide legal advice, binding quotes, contracts, payments or guaranteed delivery dates.

## Try BriefBridge

**Live website:** https://briefbridge-bpxd.onrender.com

**Source code:** https://github.com/Afar88/briefbridge

Open the website, create a project brief manually, or configure your own Otari credentials in AI model settings to try the assistant. Never share an API key in a screenshot, repository, issue or chat.

---

## Internal completion notes — remove before public submission

- [ ] Complete a successful live Otari request using a visitor-owned key.
- [ ] Demonstrate the coordinator delegating to the brief specialist.
- [ ] Demonstrate missing-information questions and a grounded structured brief.
- [ ] Demonstrate browser confirmation before an agent-driven save.
- [ ] Verify manifest, network JSON, runtime and bridge resources from a second origin.
- [ ] Test on a current desktop browser and a phone.
- [ ] Capture clean screenshots with no API key or private client data visible.
- [ ] Record an entrant-narrated YouTube demo under two minutes.
- [ ] Confirm all claims above match the final deployed build before submitting.

### Suggested 90-second video sequence

- **0:00–0:12:** Show a vague project request and explain the problem.
- **0:12–0:28:** Open BriefBridge and show the manual intake form.
- **0:28–0:55:** Use the assistant to clarify the request and show coordinator/specialist collaboration.
- **0:55–1:12:** Review the structured brief and confirm the save action.
- **1:12–1:30:** Show the public manifest/network resources and explain the open-agentic-web design.

The final video must show the live project in a browser and include the entrant's own explanation. Do not use AI-generated narration.
