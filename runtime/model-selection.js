// Select only models Otari identifies as priced chat models with function-tool support.
// Speech/TTS models can expose chat-like metadata while using character-based billing,
// which the completion meter cannot charge. Keep them out of the chat selector.
const NON_COMPLETION_MODEL_ID = /(?:^|[\\/_-])(tts|text-to-speech|speech|audio)(?:$|[\\/_-])/i;

export function isSuitableChatModel(model) {
  if (!model || typeof model !== "object") return false;
  if (typeof model.id !== "string" || NON_COMPLETION_MODEL_ID.test(model.id)) return false;
  if (model.type !== "chat") return false;
  if (!Array.isArray(model.supported_parameters)) return false;
  if (!model.supported_parameters.includes("tools") || !model.supported_parameters.includes("tool_choice")) return false;
  if (typeof model.pricing_source !== "string" || !model.pricing_source || model.pricing_source === "none") return false;
  return true;
}

function priceScore(model) {
  const input = Number(model.input_price_per_million);
  const output = Number(model.output_price_per_million);
  if (Number.isFinite(input) && Number.isFinite(output)) return input + output;
  return Number.POSITIVE_INFINITY;
}

export function selectAutomaticChatModel(catalog, preferredIds = []) {
  if (!Array.isArray(catalog)) return null;
  const suitable = catalog.filter(isSuitableChatModel);
  if (!suitable.length) return null;
  for (const preferred of preferredIds) {
    const match = suitable.find((item) => item.id === preferred);
    if (match) return match;
  }
  return [...suitable].sort((a, b) => priceScore(a) - priceScore(b) || String(a.id).localeCompare(String(b.id)))[0];
}

// IDs of the catalog models the chat selector may offer.
export function chatModelIds(catalog) {
  return Array.isArray(catalog) ? catalog.filter(isSuitableChatModel).map((item) => item.id) : [];
}

// Check a chosen, typed or saved model against the live catalog. A model that
// is not a suitable chat model is replaced with the automatic pick.
export function checkChatModel(modelId, catalog, preferredIds = []) {
  if (!modelId || !Array.isArray(catalog) || !catalog.length) return { ok: true, model: modelId };
  if (chatModelIds(catalog).includes(modelId)) return { ok: true, model: modelId };
  const pick = selectAutomaticChatModel(catalog, preferredIds);
  const published = catalog.some((item) => item?.id === modelId);
  const lead = published ? "Not a chat model." : "Model not found.";
  return {
    ok: false,
    model: pick?.id || "",
    note: pick ? `${lead} Picked ${pick.id}. Press Save and start.` : `${lead} Pick another model.`,
  };
}

// Turn the router's raw 402 pricing_required error into a plain message.
const PRICING_REQUIRED = /LLM HTTP 402\b[\s\S]*pricing_required|LLM HTTP 402\b[\s\S]*priced per character/i;
export const PRICING_REQUIRED_MESSAGE = "This model can't be used for chat. Pick another model.";
export function friendlyModelError(message) {
  const text = String(message ?? "");
  return PRICING_REQUIRED.test(text) ? PRICING_REQUIRED_MESSAGE : text;
}
