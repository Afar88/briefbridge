import { isStructuredBrief, REQUIRED_BRIEF_HEADINGS } from "./partner-result.js";

const BRIEFBRIDGE_URL = "https://briefbridge-bpxd.onrender.com";

function toBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > 20 * 1024) {
    throw new TypeError("Invalid brief data.");
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function extractBriefSections(value) {
  const text = String(value ?? "");
  if (!isStructuredBrief(text)) return null;
  const sections = Object.fromEntries(REQUIRED_BRIEF_HEADINGS.map(name => [name, "Not specified"]));
  const names = REQUIRED_BRIEF_HEADINGS.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const headerPattern = new RegExp(
    "^\\s*(?:#{1,6}\\s*)?(?:\\*\\*)?(" + names.join("|") + ")(?::)?(?:\\*\\*)?\\s*:?[ \\t]*(.*)$",
    "i",
  );
  let active = null;
  const collected = Object.fromEntries(REQUIRED_BRIEF_HEADINGS.map(name => [name, []]));
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    const match = line.match(headerPattern);
    if (match) {
      active = REQUIRED_BRIEF_HEADINGS.find(name => name.toLowerCase() === match[1].toLowerCase());
      if (match[2]?.trim()) collected[active].push(match[2].trim());
    } else if (active && line.trim()) {
      collected[active].push(line);
    } else if (!line.trim() && active && collected[active].length && collected[active].at(-1) !== "") {
      collected[active].push("");
    }
  }
  for (const name of REQUIRED_BRIEF_HEADINGS) {
    const result = collected[name].join("\n").trim();
    sections[name] = result || "Not specified";
  }
  return sections;
}

export function encodeBriefHandoff(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("A brief with nine sections is required.");
  }
  const sections = Object.fromEntries(REQUIRED_BRIEF_HEADINGS.map(name => [
    name,
    typeof value[name] === "string" && value[name].trim() ? value[name] : "Not specified",
  ]));
  return toBase64Url(JSON.stringify(sections));
}

export function briefBridgeUrl(value) {
  const sections = extractBriefSections(value);
  if (!sections) return BRIEFBRIDGE_URL;
  return BRIEFBRIDGE_URL + "/#brief=" + encodeBriefHandoff(sections);
}

export function briefBridgePeerText(event) {
  if (event?.type !== "agent.completed") return null;
  const source = event.source || {};
  if (source.network !== "briefbridge_network") return null;
  if (source.agent && source.agent !== "briefbridge_coordinator") return null;
  const text = typeof event.resultText === "string"
    ? event.resultText
    : typeof event.text === "string" ? event.text : "";
  return text.trim() ? text : null;
}
