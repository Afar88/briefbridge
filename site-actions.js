import { App } from "./app.js";

class BriefBridgeActions {
  static registerActions(actions) {
    actions.register({
      name: "get_workspace_state",
      description: "Read the current BriefBridge draft and a list of saved project briefs. Does not change anything.",
      effect: "read",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: () => App.page.getWorkspaceState(),
    });

    actions.register({
      name: "fill_brief_form",
      description: "Fill the on-page project brief form with details from the conversation so the visitor can review them. This is the expected way to prepare a brief. It only fills the form; it does not save the brief.",
      effect: "write",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", maxLength: 120, description: "A concise project title." },
          client: { type: "string", maxLength: 120, description: "Client or organisation, if supplied." },
          projectType: { type: "string", maxLength: 60, description: "Project category. Use one of the form's options: Marketing, Branding, Web design, Software / product, Content creation, Event, Research, Other." },
          objective: { type: "string", maxLength: 1600, description: "The outcome the project should achieve." },
          audience: { type: "string", maxLength: 800, description: "The intended audience or users." },
          scope: { type: "string", maxLength: 1600, description: "Included work, context and boundaries." },
          deliverables: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Specific outputs the client should receive." },
          constraints: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Requirements, dependencies or things to avoid." },
          timeline: { type: "string", maxLength: 240, description: "Timeline supplied or agreed by the user. Do not invent dates." },
          budget: { type: "string", maxLength: 160, description: "Budget supplied or agreed by the user. Do not invent prices." },
          assumptions: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Unconfirmed assumptions, clearly labelled." },
          openQuestions: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Questions that still need answers." },
          nextSteps: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Practical next steps." },
        },
      },
      execute: args => App.page.fillBriefForm(args),
    });

    actions.register({
      name: "save_brief",
      description: "Save a complete project brief in the visitor's local BriefBridge library. This action requires the visitor's confirmation first. Returns the saved brief ID and title, or a refusal reason.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "objective", "audience", "deliverables"],
        properties: {
          title: { type: "string", minLength: 1, maxLength: 120, description: "A concise project title." },
          client: { type: "string", maxLength: 120, description: "Client or organisation, if supplied." },
          projectType: { type: "string", maxLength: 60, description: "Project category, such as Marketing, Branding, Web design or Software / product." },
          objective: { type: "string", minLength: 1, maxLength: 1600, description: "The outcome the project should achieve." },
          audience: { type: "string", minLength: 1, maxLength: 800, description: "The intended audience or users." },
          scope: { type: "string", maxLength: 1600, description: "Included work, context and boundaries." },
          deliverables: { type: "array", minItems: 1, maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Specific outputs the client should receive." },
          constraints: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Requirements, dependencies or things to avoid." },
          timeline: { type: "string", maxLength: 240, description: "Timeline supplied or agreed by the user. Do not invent dates." },
          budget: { type: "string", maxLength: 160, description: "Budget supplied or agreed by the user. Do not invent prices." },
          assumptions: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Unconfirmed assumptions, clearly labelled." },
          openQuestions: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Questions that still need answers." },
          nextSteps: { type: "array", maxItems: 12, items: { type: "string", maxLength: 220 }, description: "Practical next steps." },
        },
      },
      execute: args => App.page.saveBrief(args),
    });

    actions.register({
      name: "delete_brief",
      description: "Delete a saved project brief by its exact ID. The visitor must confirm this action first.",
      effect: "irreversible",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["id"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 100, description: "Exact saved brief ID returned by get_workspace_state." },
        },
      },
      execute: args => App.page.deleteBrief(args.id),
    });
  }
}

export const registerActions = BriefBridgeActions.registerActions;
