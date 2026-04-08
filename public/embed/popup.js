"use strict";
(() => {
  // ---- Config & origin ----
  const getScriptTag = () => {
    const scripts = document.getElementsByTagName("script");
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || "";
      if (src.includes("/embed/popup.js")) return scripts[i];
    }
    return null;
  };

  const SCRIPT_TAG = getScriptTag();

  const getOrigin = () => {
    if (SCRIPT_TAG?.src) {
      try {
        return new URL(SCRIPT_TAG.src).origin;
      } catch {}
    }
    return window.location.origin;
  };

  const ORIGIN = getOrigin();

  // Form IDs are UUIDs; reject anything else to prevent path traversal and
  // open-redirect shenanigans through `data-form-id`.
  const FORM_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
  const KNOWN_CONFIG_KEYS = new Set([
    "formId",
    "position",
    "width",
    "darkOverlay",
    "overlay",
    "hideTitle",
    "alignLeft",
    "autoClose",
  ]);

  const parseConfig = (el) => {
    const ds = el.dataset || {};
    // Object.create(null) avoids prototype-pollution surface when spreading
    // attacker-controlled data-* keys.
    const hiddenFields = Object.create(null);
    for (const [k, v] of Object.entries(ds)) {
      if (!KNOWN_CONFIG_KEYS.has(k) && typeof v === "string") hiddenFields[k] = v;
    }
    return {
      formId: FORM_ID_RE.test(ds.formId || "") ? ds.formId : "",
      position: ds.position || "bottom-right",
      width: ds.width ? parseInt(ds.width, 10) : 376,
      darkOverlay: ds.darkOverlay === "1" || ds.overlay === "1",
      hideTitle: ds.hideTitle === "1",
      alignLeft: ds.alignLeft === "1",
      autoClose: ds.autoClose ? parseInt(ds.autoClose, 10) : 0,
      hiddenFields,
    };
  };

  const buildFormUrl = (formId, cfg) => {
    const p = new URLSearchParams();
    p.set("popup", "1");
    p.set("transparent", "1");
    p.set("originPage", window.location.pathname);
    if (cfg.hideTitle) p.set("hideTitle", "1");
    if (cfg.alignLeft) p.set("alignLeft", "1");
    for (const k of Object.keys(cfg.hiddenFields)) p.set(k, cfg.hiddenFields[k]);
    new URLSearchParams(window.location.search).forEach((val, key) => {
      if (!p.has(key)) p.set(key, val);
    });
    return `${ORIGIN}/forms/${encodeURIComponent(formId)}?${p.toString()}`;
  };

  const fetchMeta = async (formId) => {
    try {
      const res = await fetch(`${ORIGIN}/api/forms/${encodeURIComponent(formId)}/meta`, {
        method: "GET",
        credentials: "omit",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // ---- Styles ----
  const STYLES = `
@keyframes bf-spin { to { transform: rotate(360deg); } }
@keyframes bf-fadeIn { from { opacity: 0; } to { opacity: 1; } }

.bf-bubble {
  position: fixed;
  z-index: 2147483000;
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  background-color: #111827;
  color: #ffffff;
  box-shadow: 0 10px 25px -5px rgba(0,0,0,0.25), 0 8px 10px -6px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  animation: bf-fadeIn 0.2s ease-out;
}
.bf-bubble:hover { transform: scale(1.06); }
.bf-bubble--bottom-right { bottom: 20px; right: 20px; }
.bf-bubble--bottom-left { bottom: 20px; left: 20px; }
.bf-bubble--top-right { top: 20px; right: 20px; }
.bf-bubble--top-left { top: 20px; left: 20px; }
.bf-bubble--center { bottom: 20px; right: 20px; }
.bf-bubble__icon {
  width: 28px;
  height: 28px;
  display: block;
  object-fit: contain;
}
.bf-bubble__emoji { font-size: 28px; line-height: 1; }
.bf-bubble--hidden { opacity: 0; pointer-events: none; transform: scale(0.6); }

.bf-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147482999;
  background-color: rgba(0,0,0,0.5);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.bf-overlay--visible { opacity: 1; pointer-events: auto; }

.bf-popup {
  position: fixed;
  z-index: 2147483001;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform-origin: bottom right;
  opacity: 0;
  transform: scale(0.2) translateY(20px);
  transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  pointer-events: none;
  /* Never exceed the viewport on narrow screens, but keep the configured
     width otherwise (inline width wins when it fits). */
  max-width: calc(100vw - 20px);
}
.bf-popup--bottom-right { bottom: 88px; right: 20px; transform-origin: bottom right; }
.bf-popup--bottom-left  { bottom: 88px; left: 20px;  transform-origin: bottom left; }
.bf-popup--top-right    { top: 88px;    right: 20px; transform-origin: top right; }
.bf-popup--top-left     { top: 88px;    left: 20px;  transform-origin: top left; }
.bf-popup--center {
  top: 50%; left: 50%;
  transform: translate(-50%, -50%) scale(0.85);
  transform-origin: center;
}
.bf-popup--visible {
  opacity: 1;
  transform: scale(1) translateY(0);
  pointer-events: auto;
}
.bf-popup--center.bf-popup--visible {
  transform: translate(-50%, -50%) scale(1);
}

.bf-iframe {
  width: 100%;
  flex: 1;
  border: none;
  display: block;
  background: transparent;
}

.bf-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255,255,255,0.9);
  backdrop-filter: blur(4px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  line-height: 1;
  color: #6b7280;
  transition: background-color 0.15s ease, transform 0.15s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.bf-close-btn:hover {
  background-color: #fff;
  transform: scale(1.05);
}

`;

  const injectStyles = () => {
    if (document.getElementById("bf-popup-styles")) return;
    const s = document.createElement("style");
    s.id = "bf-popup-styles";
    s.textContent = STYLES;
    document.head.appendChild(s);
  };

  // Single emoji (~2 codepoints with VS16/skin tones), no letters/digits.
  const EMOJI_RE = /^(?:\p{Extended_Pictographic}\uFE0F?){1,3}$/u;

  const setBubbleContent = (btn, icon) => {
    while (btn.firstChild) btn.removeChild(btn.firstChild);

    // URL → image
    if (icon && /^(https?:\/\/|\/)/.test(icon)) {
      const img = document.createElement("img");
      img.className = "bf-bubble__icon";
      img.src = icon;
      img.alt = "";
      btn.appendChild(img);
      return;
    }

    // Emoji → text span
    if (icon && EMOJI_RE.test(icon)) {
      const span = document.createElement("span");
      span.className = "bf-bubble__emoji";
      span.textContent = icon;
      btn.appendChild(span);
      return;
    }

    // Sprite name (e.g. "virus") or fallback default — fetch + inline so
    // currentColor resolves to the bubble's text color.
    const spriteName = icon && /^[a-z0-9-]+$/i.test(icon) ? icon : "file-04";
    fetch(`${ORIGIN}/api/icons/${spriteName}.svg`)
      .then((r) => (r.ok ? r.text() : null))
      .then((text) => {
        if (!text) return;
        const doc = new DOMParser().parseFromString(text, "image/svg+xml");
        const svgEl = doc.documentElement;
        if (!svgEl || svgEl.tagName.toLowerCase() !== "svg") return;
        svgEl.setAttribute("class", "bf-bubble__icon");
        // Adopt into our document for safe insertion
        const adopted = document.importNode(svgEl, true);
        while (btn.firstChild) btn.removeChild(btn.firstChild);
        btn.appendChild(adopted);
      })
      .catch(() => {});
  };

  // ---- State ----
  const state = {
    cfg: null,
    meta: null,
    bubble: null,
    overlay: null,
    popup: null,
    iframe: null,
    contentHeight: 0,
    isOpen: false,
  };

  const clampHeight = (h) => {
    const max = Math.min(600, window.innerHeight - 40);
    return Math.max(200, Math.min(h + 2, max));
  };

  const applyHeight = () => {
    if (!(state.popup && state.contentHeight)) return;
    const h = clampHeight(state.contentHeight);
    state.popup.style.height = `${h}px`;
    state.iframe.style.height = `${h}px`;
  };

  const createBubble = () => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `bf-bubble bf-bubble--${state.cfg.position}`;
    btn.setAttribute("aria-label", state.meta?.title || "Open form");
    setBubbleContent(btn, state.meta?.icon);
    btn.addEventListener("click", openPopup);
    document.body.appendChild(btn);
    return btn;
  };

  const createOverlay = () => {
    const o = document.createElement("div");
    o.className = "bf-overlay";
    o.addEventListener("click", closePopup);
    document.body.appendChild(o);
    return o;
  };

  const createPopupShell = () => {
    const p = document.createElement("div");
    const isCenter = state.cfg.position === "center";
    p.className = `bf-popup bf-popup--${isCenter ? "center" : state.cfg.position}`;
    p.style.width = `${state.cfg.width}px`;

    const close = document.createElement("button");
    close.type = "button";
    close.className = "bf-close-btn";
    close.setAttribute("aria-label", "Close form");
    close.textContent = "\u00D7";
    close.addEventListener("click", closePopup);

    const iframe = document.createElement("iframe");
    iframe.className = "bf-iframe";
    iframe.setAttribute("title", state.meta?.title || "Form");
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("allow", "fullscreen");
    iframe.setAttribute(
      "sandbox",
      "allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox",
    );
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.src = buildFormUrl(state.cfg.formId, state.cfg);

    p.appendChild(close);
    p.appendChild(iframe);
    document.body.appendChild(p);
    return { popup: p, iframe };
  };

  const openPopup = () => {
    if (state.isOpen) return;
    state.isOpen = true;
    if (state.cfg.darkOverlay) state.overlay.classList.add("bf-overlay--visible");
    state.bubble.classList.add("bf-bubble--hidden");
    // Force reflow so the starting transform applies before adding --visible
    void state.popup.offsetWidth;
    state.popup.classList.add("bf-popup--visible");
    if (state.cfg.darkOverlay) document.body.style.overflow = "hidden";
  };

  const closePopup = () => {
    if (!state.isOpen) return;
    state.isOpen = false;
    state.popup.classList.remove("bf-popup--visible");
    state.overlay.classList.remove("bf-overlay--visible");
    state.bubble.classList.remove("bf-bubble--hidden");
    document.body.style.overflow = "";
  };

  const handleMessage = (ev) => {
    // Defense in depth: the form page is served from our ORIGIN, so any
    // message claiming to be ours must come from that origin. Without this
    // check, a redirected iframe could spoof Reform.* events.
    if (ev.origin !== ORIGIN) return;
    if (!state.iframe || ev.source !== state.iframe.contentWindow) return;
    let data;
    try {
      data = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
    } catch {
      return;
    }
    if (!data?.event?.startsWith("Reform.")) return;

    switch (data.event) {
      case "Reform.Resize":
        if (typeof data.height === "number") {
          state.contentHeight = data.height;
          applyHeight();
        }
        break;
      case "Reform.FormSubmitted":
        if (state.cfg.autoClose > 0) setTimeout(closePopup, state.cfg.autoClose);
        break;
      case "Reform.Close":
        closePopup();
        break;
    }
  };

  // ---- Init ----
  const init = async () => {
    if (!SCRIPT_TAG) return;
    const cfg = parseConfig(SCRIPT_TAG);
    if (!cfg.formId) {
      console.warn("[Reform] popup.js: missing or invalid data-form-id on script tag");
      return;
    }
    injectStyles();
    state.cfg = cfg;
    state.meta = await fetchMeta(cfg.formId);
    state.bubble = createBubble();
    state.overlay = createOverlay();
    const shell = createPopupShell();
    state.popup = shell.popup;
    state.iframe = shell.iframe;
    window.addEventListener("message", handleMessage);
    window.addEventListener("resize", applyHeight);
  };

  window.Reform = { open: openPopup, close: closePopup };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
