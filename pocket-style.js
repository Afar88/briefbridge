/* Shared Pocket-style interaction layer for BriefBridge and ShopStart. */
(() => {
  const isShopStart = document.body.dataset.pocketSite === "shopstart" || location.pathname.includes("/partner-demo/");
  const main = document.querySelector("main#top");
  if (!main) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const hero = $(".hero", main);
  const assistant = $("#assistant", main);
  const guideNodes = isShopStart
    ? [$("#how-it-works", main)]
    : [$("#how-it-works", main), $("#otari", main)];
  const builder = $("#workspace", main);
  const savedLibrary = $("#saved-library", main);
  const partnerResult = $("#partner-result", main);
  const partnerNext = $(".next-step", main);
  const footer = $("footer.footer");

  const screenSpecs = isShopStart
    ? [
        ["home", "Home", "⌂", [hero]],
        ["shop", "Shop", "✦", [assistant]],
        ["steps", "Steps", "↗", guideNodes],
        ["results", "Results", "✓", [partnerResult, partnerNext]],
      ]
    : [
        ["home", "Home", "⌂", [hero]],
        ["assistant", "Assistant", "✦", [assistant]],
        ["builder", "Builder", "▤", [builder]],
        ["saved", "Saved", "▣", [savedLibrary]],
        ["guide", "Guide", "ⓘ", guideNodes],
      ];

  const views = new Map();
  main.classList.add("bb-main");
  for (const [id, , , nodes] of screenSpecs) {
    const view = make("section", "bb-screen");
    view.dataset.bbScreen = id;
    view.id = "bb-screen-" + id;
    for (const node of nodes) if (node) view.append(node);
    main.append(view);
    views.set(id, view);
  }
  if (footer) footer.hidden = true;

  const nav = make("nav", "bb-tabbar");
  nav.setAttribute("aria-label", isShopStart ? "ShopStart sections" : "BriefBridge sections");
  nav.style.setProperty("--bb-tab-count", String(screenSpecs.length));

  function setScreen(id) {
    if (!views.has(id)) return;
    for (const [key, view] of views) {
      const active = key === id;
      view.hidden = !active;
      view.classList.toggle("is-active", active);
    }
    for (const button of $$(".bb-tab", nav)) {
      const active = button.dataset.screen === id;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
    document.body.dataset.activeScreen = id;
    window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  for (const [id, label, icon] of screenSpecs) {
    const button = make("button", "bb-tab");
    button.type = "button";
    button.dataset.screen = id;
    button.append(make("span", "bb-tab-icon", icon), make("span", "bb-tab-label", label));
    button.addEventListener("click", () => setScreen(id));
    nav.append(button);
  }
  document.body.append(nav);

  const hashRoutes = isShopStart
    ? { "#top": "home", "#how-it-works": "steps", "#assistant": "shop", "#partner-result": "results" }
    : { "#top": "home", "#how-it-works": "guide", "#otari": "guide", "#assistant": "assistant", "#workspace": "builder", "#saved-library": "saved" };
  document.addEventListener("click", event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const target = hashRoutes[link.getAttribute("href")];
    if (!target) return;
    event.preventDefault();
    setScreen(target);
  });

  const requestedScreen = hashRoutes[location.hash] || "home";
  setScreen(requestedScreen);

  /* Header status: keep the technical live region for the app, show a plain pill. */
  const statusSource = $("#assistant-status");
  const statusPill = make("span", "bb-status-pill");
  statusPill.setAttribute("role", "status");
  statusPill.append(make("span", "bb-status-dot"), make("span", "bb-status-label", "Working"));
  const topbarInner = $(".topbar-inner");
  const brand = $(".brand", topbarInner || document);
  if (topbarInner && brand) brand.after(statusPill);
  if (statusSource) statusSource.classList.add("bb-visually-hidden");

  function statusLabel(value) {
    const text = String(value || "").toLowerCase();
    if (/could not start|failed|offline|error/.test(text)) return "Offline";
    if (/loading|working|connecting|starting/.test(text)) return "Working";
    if (/add .*key|api key|signed out|not connected/.test(text)) return "Signed out";
    if (/ready/.test(text)) return "Ready";
    return text ? "Ready" : "Working";
  }
  function updateStatus(value) {
    const label = statusLabel(value);
    const labelNode = $(".bb-status-label", statusPill);
    if (labelNode) labelNode.textContent = label;
    statusPill.dataset.state = label.toLowerCase().replaceAll(" ", "-");
  }
  function refreshStatus() {
    updateStatus(statusSource?.textContent || "");
  }
  refreshStatus();
  if (statusSource) new MutationObserver(refreshStatus).observe(statusSource, { childList: true, characterData: true, subtree: true });

  /* Small info buttons replace low-priority helper copy. */
  const infoButtons = [];
  function convertInfoSource(source) {
    if (!source || source.dataset.bbInfoReady === "true") return;
    const message = (source.textContent || "").trim();
    if (!message) return;
    const button = make("button", "bb-info-trigger", "i");
    button.type = "button";
    button.setAttribute("aria-label", "More information");
    button.setAttribute("aria-expanded", "false");
    button.dataset.info = message;
    source.dataset.bbInfoReady = "true";
    source.replaceWith(button);
    infoButtons.push(button);
  }
  $(".hero-note, .fine-print, .settings-tip, .section-lede, .field small").forEach(convertInfoSource);
  const agentAppForInfo = $("#agent-app");
  if (agentAppForInfo) {
    const convertRuntimeHints = () => $(".ns-hint", agentAppForInfo).forEach(convertInfoSource);
    convertRuntimeHints();
    new MutationObserver(convertRuntimeHints).observe(agentAppForInfo, { childList: true, subtree: true });
  }
  const infoCard = make("div", "bb-info-card");
  infoCard.hidden = true;
  infoCard.setAttribute("role", "dialog");
  infoCard.setAttribute("aria-label", "More information");
  infoCard.append(make("p", "bb-info-copy"));
  document.body.append(infoCard);
  function closeInfo() {
    infoCard.hidden = true;
    for (const button of infoButtons) button.setAttribute("aria-expanded", "false");
  }
  document.addEventListener("click", event => {
    const trigger = event.target.closest?.(".bb-info-trigger");
    if (trigger) {
      const wasOpen = !infoCard.hidden && trigger.getAttribute("aria-expanded") === "true";
      closeInfo();
      if (!wasOpen) {
        $(".bb-info-copy", infoCard).textContent = trigger.dataset.info || "";
        infoCard.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
      }
      return;
    }
    if (!infoCard.contains(event.target)) closeInfo();
  });
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeInfo(); });

  /* Mascot with one short thought per tap. */
  const heroCopy = $(".hero-copy", hero || document);
  if (heroCopy) {
    const mascot = make("div", "bb-mascot");
    const mascotButton = make("button", "bb-mascot-button");
    mascotButton.type = "button";
    mascotButton.setAttribute("aria-expanded", "false");
    const image = make("img");
    image.src = isShopStart ? "./penny-parrot.png" : "./chief-owl.png";
    image.alt = isShopStart ? "Penny, ShopStart's parrot" : "Chief, BriefBridge's owl";
    image.loading = "lazy";
    image.decoding = "async";
    mascotButton.append(image, make("span", "bb-tap-sign", "Tap me!"));
    const thought = make("div", "bb-thought");
    thought.hidden = true;
    thought.setAttribute("role", "status");
    thought.setAttribute("aria-live", "polite");
    thought.append(make("span", "bb-thought-copy"), make("span", "bb-thought-dot bb-thought-dot-one"), make("span", "bb-thought-dot bb-thought-dot-two"));
    const lines = isShopStart
      ? [
          "Hi, I'm Penny! I help plan your shop's website.",
          "Tell me about your shop, and I'll shape a clear website brief.",
          "Watch each step, then review your website brief.",
        ]
      : [
          "Hi, I'm Chief! I turn long requests into clear briefs.",
          "Tell me what you need, and I'll hand it to the right agent.",
          "You see every step and get the result back here.",
        ];
    let lineIndex = -1;
    mascotButton.addEventListener("click", () => {
      if (lineIndex === -1) {
        lineIndex = 0;
        $(".bb-thought-copy", thought).textContent = lines[lineIndex];
        thought.hidden = false;
        mascotButton.setAttribute("aria-expanded", "true");
      } else if (lineIndex < lines.length - 1) {
        lineIndex += 1;
        $(".bb-thought-copy", thought).textContent = lines[lineIndex];
      } else {
        lineIndex = -1;
        thought.hidden = true;
        mascotButton.setAttribute("aria-expanded", "false");
      }
    });
    mascot.append(mascotButton, thought);
    const anchor = $(".hero-note, .bb-info-trigger", heroCopy);
    if (anchor) heroCopy.insertBefore(mascot, anchor);
    else heroCopy.append(mascot);
  }

  /* Toasts: success auto-hides in four seconds; errors need a close tap. */
  const toastStack = make("div", "bb-toast-stack");
  toastStack.setAttribute("aria-live", "polite");
  toastStack.setAttribute("aria-relevant", "additions text");
  document.body.append(toastStack);
  let toastTimer = null;
  let lastToastKey = "";
  function showToast(message, kind = "success") {
    const clean = String(message || "").trim();
    if (!clean) return;
    const key = kind + ":" + clean;
    if (key === lastToastKey) return;
    lastToastKey = key;
    if (toastTimer) clearTimeout(toastTimer);
    toastStack.replaceChildren();
    const toast = make("div", "bb-toast bb-toast-" + kind);
    toast.append(make("span", "bb-toast-message", clean));
    const close = make("button", "bb-toast-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Close message");
    close.addEventListener("click", () => { toast.remove(); lastToastKey = ""; });
    toast.append(close);
    toastStack.append(toast);
    if (kind === "success") toastTimer = window.setTimeout(() => { toast.remove(); lastToastKey = ""; }, 4000);
  }

  if (statusSource) {
    const readStatusAlert = () => {
      const message = statusSource.textContent.trim();
      if (/could not start|failed|error|offline/i.test(message)) showToast(message, "error");
    };
    new MutationObserver(readStatusAlert).observe(statusSource, { childList: true, characterData: true, subtree: true });
  }

  if (!isShopStart) {
    const notice = $("#form-notice");
    if (notice) {
      notice.classList.add("bb-visually-hidden");
      const readNotice = () => {
        const message = notice.textContent.trim();
        if (!message) return;
        showToast(message, notice.classList.contains("error") || notice.classList.contains("warn") ? "error" : "success");
      };
      new MutationObserver(readNotice).observe(notice, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    }
  } else {
    if (partnerResult) {
      new MutationObserver(() => {
        if (!partnerResult.hidden) {
          setScreen("results");
          showToast("Your shop brief is ready.", "success");
        }
      }).observe(partnerResult, { attributes: true, attributeFilter: ["hidden"] });
    }
    const handoffBar = $("#handoff-bar");
    if (handoffBar) {
      handoffBar.classList.add("bb-progress-sheet");
      document.body.append(handoffBar);
      const title = $(".handoff-title", handoffBar);
      if (title) {
        const dismiss = make("button", "bb-sheet-close", "×");
        dismiss.type = "button";
        dismiss.setAttribute("aria-label", "Close steps");
        dismiss.addEventListener("click", () => { handoffBar.hidden = true; });
        title.append(dismiss);
      }
      new MutationObserver(() => {
        const failed = $(".handoff-step.is-failed", handoffBar);
        if (failed) {
          showToast("The handoff stopped. Check the step list.", "error");
          statusPill.dataset.state = "needs-attention";
          $(".bb-status-label", statusPill).textContent = "Needs attention";
        }
      }).observe(handoffBar, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
    }
  }

  /* BriefBridge assistant requests get a real progress sheet. */
  if (!isShopStart) {
    const progress = make("section", "bb-progress-sheet");
    progress.hidden = true;
    progress.setAttribute("aria-label", "Assistant progress");
    progress.setAttribute("aria-live", "polite");
    progress.append(make("div", "bb-progress-heading", "Working on your request"));
    const progressList = make("ol", "bb-progress-list");
    progress.append(progressList);
    document.body.append(progress);
    const steps = ["Request sent", "Assistant is working", "Reply is ready"];
    let baseline = 0;
    let requestRunning = false;
    let observer = null;
    let hideTimer = null;
    let startupTimer = null;
    let sendObserver = null;
    function drawProgress(stage) {
      progressList.replaceChildren(...steps.map((label, index) => {
        const state = index < stage ? "is-done" : index === stage ? "is-active" : "is-todo";
        const item = make("li", "bb-progress-step " + state);
        item.append(make("span", "bb-progress-number", index < stage ? "✓" : String(index + 1)), make("span", "bb-progress-label", label));
        return item;
      }));
    }
    function stopProgress() {
      requestRunning = false;
      if (observer) observer.disconnect();
      if (hideTimer) clearTimeout(hideTimer);
      if (startupTimer) clearTimeout(startupTimer);
      if (sendObserver) sendObserver.disconnect();
      drawProgress(3);
      updateStatus(statusSource?.textContent || "Ready");
      hideTimer = window.setTimeout(() => { progress.hidden = true; }, 850);
    }
    function inspectMessages() {
      const messages = $("#ns-msgs");
      if (!messages || !requestRunning) return;
      const loading = $(".ns-turn-status", messages);
      const replies = $$(".ns-msg.bot", messages).filter(node => !node.classList.contains("ns-turn-status") && (node.innerText || node.textContent || "").trim());
      if (loading) {
        const runtimeSteps = Array.from(loading.querySelectorAll(".ns-step"));
        const activeStep = runtimeSteps.findIndex(step => step.classList.contains("active"));
        const completedSteps = runtimeSteps.filter(step => step.classList.contains("done")).length;
        drawProgress(activeStep >= 0 ? activeStep : completedSteps);
      } else if (replies.length > baseline) stopProgress();
    }
    function startProgress() {
      if (requestRunning) return;
      const input = $("#ns-input");
      const sendButton = $("#ns-send");
      if (!input || !input.value.trim()) return;
      if (hideTimer) clearTimeout(hideTimer);
      if (startupTimer) clearTimeout(startupTimer);
      baseline = $(".ns-msg.bot", $("#ns-msgs") || document).filter(node => !node.classList.contains("ns-turn-status") && (node.innerText || node.textContent || "").trim()).length;
      requestRunning = true;
      progress.hidden = false;
      drawProgress(0);
      $(".bb-status-label", statusPill).textContent = "Working";
      statusPill.dataset.state = "working";
      const messages = $("#ns-msgs");
      if (observer) observer.disconnect();
      if (messages) {
        observer = new MutationObserver(inspectMessages);
        observer.observe(messages, { childList: true, subtree: true, characterData: true });
      }
      if (sendObserver) sendObserver.disconnect();
      if (sendButton) {
        sendObserver = new MutationObserver(() => {
          if (requestRunning && sendButton.textContent.trim() === "Send" && !$(".ns-turn-status", messages || document)) stopProgress();
        });
        sendObserver.observe(sendButton, { childList: true, subtree: true, characterData: true });
      }
      startupTimer = window.setTimeout(() => {
        if (requestRunning && sendButton?.textContent.trim() === "Send" && !$(".ns-turn-status", messages || document)) {
          stopProgress();
          showToast("The request could not start. Check your AI settings.", "error");
        }
      }, 4000);
    }
    document.addEventListener("click", event => {
      if (event.target.closest?.("#ns-send, .ns-send")) startProgress();
    }, true);
    document.addEventListener("keydown", event => {
      if (event.target?.id === "ns-input" && event.key === "Enter" && !event.shiftKey) startProgress();
    }, true);
  }
})();