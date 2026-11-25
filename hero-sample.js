// hero-sample.js — a labeled demo brief that types itself into the hero card.
// The receipt line shows the real format: model, provider host, seconds.
// It is marked "sample" so it is never confused with a live call's receipt.

const LINES = [
  { text: "Bakery logo and website", cls: "sample-title" },
  { text: "Objective — launch a simple online presence" },
  { text: "Deliverables — logo, one-page website" },
  { text: "Timeline — 3 weeks" },
  { text: "Budget — about $300" },
];
const RECEIPT = "inclusionai/ling-3.0-flash-vl · api.otari.ai · 28.4s · sample";

const box = document.querySelector("#sample-lines");
if (box) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const addLine = ({ text, cls }) => {
    const line = document.createElement("p");
    line.className = cls || "sample-line";
    line.textContent = text;
    box.append(line);
  };
  const finish = () => addLine({ text: RECEIPT, cls: "sample-receipt" });
  if (reduced) {
    LINES.forEach(addLine);
    finish();
  } else {
    let index = 0;
    const step = () => {
      if (index < LINES.length) {
        addLine(LINES[index++]);
        setTimeout(step, 700);
      } else {
        setTimeout(finish, 700);
      }
    };
    setTimeout(step, 900);
  }
}
