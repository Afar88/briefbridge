// Select only models Otari identifies as priced chat models with function-tool support.
export function isSuitableChatModel(model) {
  if (!model || typeof model !== "object") return false;
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
