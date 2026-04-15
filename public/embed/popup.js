"use strict";
(() => {
  var M = /^[a-zA-Z0-9_-]{1,128}$/,
    A = new Set([
      "formId",
      "position",
      "width",
      "darkOverlay",
      "overlay",
      "hideTitle",
      "alignLeft",
      "autoClose",
    ]),
    R = /^(?:\p{Extended_Pictographic}\uFE0F?){1,3}$/u,
    F = () => {
      let t = document.getElementsByTagName("script");
      for (let e = t.length - 1; e >= 0; e--)
        if ((t[e].src || "").includes("/embed/popup.js")) return t[e];
      return null;
    },
    _ = (t) => {
      if (t?.src)
        try {
          return new URL(t.src).origin;
        } catch {}
      return window.location.origin;
    },
    S = (t) => {
      let e = t.dataset || {},
        o = e.formId && M.test(e.formId) ? e.formId : "";
      if (!o) return null;
      let n = Object.create(null);
      for (let [s, a] of Object.entries(e)) !A.has(s) && typeof a == "string" && (n[s] = a);
      let i = e.position;
      return {
        formId: o,
        position: i === "bottom-left" || i === "center" ? i : "bottom-right",
        width: e.width ? parseInt(e.width, 10) : 376,
        darkOverlay: e.darkOverlay === "1" || e.overlay === "1",
        hideTitle: e.hideTitle === "1",
        alignLeft: e.alignLeft === "1",
        autoClose: e.autoClose ? parseInt(e.autoClose, 10) : 0,
        hiddenFields: n,
      };
    },
    B = async (t, e) => {
      try {
        let o = await fetch(`${t}/api/forms/${encodeURIComponent(e)}/meta`, {
          method: "GET",
          credentials: "omit",
        });
        return o.ok ? await o.json() : null;
      } catch {
        return null;
      }
    },
    N = (t, e, o) => {
      for (; t.firstChild; ) t.removeChild(t.firstChild);
      if (o && /^(https?:\/\/|\/)/.test(o)) {
        let i = document.createElement("img");
        ((i.className = "bf-bubble__icon"), (i.src = o), (i.alt = ""), t.appendChild(i));
        return;
      }
      if (o && R.test(o)) {
        let i = document.createElement("span");
        ((i.className = "bf-bubble__emoji"), (i.textContent = o), t.appendChild(i));
        return;
      }
      let n = o && /^[a-z0-9-]+$/i.test(o) ? o : "file-04";
      fetch(`${e}/api/icons/${n}.svg`)
        .then((i) => (i.ok ? i.text() : null))
        .then((i) => {
          if (!i) return;
          let s = new DOMParser().parseFromString(i, "image/svg+xml").documentElement;
          if (!s || s.tagName.toLowerCase() !== "svg") return;
          s.setAttribute("class", "bf-bubble__icon");
          let a = document.importNode(s, !0);
          for (; t.firstChild; ) t.removeChild(t.firstChild);
          t.appendChild(a);
        })
        .catch(() => {});
    },
    $ = (t, e, o) => {
      let n = document.createElement("button");
      return (
        (n.type = "button"),
        (n.className = `bf-bubble bf-bubble--${t.position}`),
        n.setAttribute("aria-label", e?.title || "Open form"),
        N(n, o, e?.icon),
        document.body.appendChild(n),
        n
      );
    },
    g = async (t) => {
      let e = F();
      if (!e) return;
      let o = S(e);
      if (!o) return;
      let n = _(e),
        i = await B(n, o.formId),
        r = $(o, i, n);
      r.addEventListener("click", () => {
        (r.classList.add("bf-bubble--hidden"),
          t(o.formId, {
            position: o.position,
            width: o.width,
            hideTitle: o.hideTitle,
            alignLeft: o.alignLeft,
            overlay: o.darkOverlay,
            autoClose: o.autoClose,
            hiddenFields: o.hiddenFields,
            onClose: () => {
              r.classList.remove("bf-bubble--hidden");
            },
          }));
      });
    };
  var U = () => {
      let t = document.getElementsByTagName("script");
      for (let e = t.length - 1; e >= 0; e--) {
        let o = t[e].src;
        if (o?.includes("/embed/popup.js"))
          try {
            return new URL(o).origin;
          } catch {}
      }
      return window.location.origin;
    },
    D = (t, e) => {
      let o = U(),
        n = new URLSearchParams();
      if (
        (n.set("popup", "1"),
        n.set("originPage", window.location.pathname),
        e.hideTitle && n.set("hideTitle", "1"),
        e.alignLeft && n.set("alignLeft", "1"),
        n.set("transparent", "1"),
        e.hiddenFields)
      )
        for (let [r, s] of Object.entries(e.hiddenFields)) n.set(r, s);
      return (
        new URLSearchParams(window.location.search).forEach((r, s) => {
          n.has(s) || n.set(s, r);
        }),
        `${o}/forms/${t}?${n.toString()}`
      );
    },
    y = (t, e, o) => {
      let n = document.createElement("iframe");
      ((n.className = "bf-iframe"),
        n.setAttribute("title", "Reform"),
        n.setAttribute("frameborder", "0"),
        n.setAttribute("allow", "fullscreen"),
        n.setAttribute("data-bf-form-id", t),
        (n.style.height = "400px"));
      let i = D(t, e);
      return ((n.src = i), o.appendChild(n), n);
    };
  var x = (t, e) => {
      let o = Math.min(600, window.innerHeight - 40),
        n = Math.min(e + 2, o);
      t.style.height = `${n}px`;
    },
    v = (t) => {
      t.remove();
    };
  var z =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Close popup</title><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  var w = (t, e, o) => {
      let n = e.layout === "modal" || e.position === "center",
        i = e.overlay !== !1 || n,
        r = e.position || "bottom-right",
        s = e.width || 376,
        a = document.createElement("div");
      ((a.className = `bf-overlay ${i ? "" : "bf-overlay--no-bg"}`),
        a.setAttribute("data-bf-form-id", t),
        i &&
          a.addEventListener("click", (H) => {
            H.target === a && o();
          }));
      let l = document.createElement("div");
      ((l.className = `bf-popup bf-popup--${n ? "center" : r}`),
        Object.assign(l.style, { width: `${s}px`, maxHeight: "600px" }));
      let c = document.createElement("button");
      ((c.className = "bf-close-btn"),
        (c.innerHTML = z),
        c.setAttribute("aria-label", "Close form"),
        c.addEventListener("click", o));
      let d = document.createElement("div");
      d.className = "bf-iframe-container";
      let f = document.createElement("div");
      ((f.className = "bf-loading"), (f.innerHTML = '<div class="bf-loading-spinner"></div>'));
      let p;
      return (
        e.emoji?.text &&
          ((p = document.createElement("div")),
          (p.className = `bf-emoji ${G(e.emoji.animation)}`),
          (p.textContent = e.emoji.text)),
        l.appendChild(c),
        l.appendChild(f),
        l.appendChild(d),
        p && l.appendChild(p),
        a.appendChild(l),
        i && (document.body.style.overflow = "hidden"),
        document.body.appendChild(a),
        { overlay: a, popup: l, iframeContainer: d, closeBtn: c, loadingEl: f, emojiEl: p }
      );
    },
    E = (t) => {
      ((document.body.style.overflow = ""),
        (t.style.opacity = "0"),
        (t.style.transition = "opacity 0.15s ease"),
        setTimeout(() => {
          t.remove();
        }, 150));
    },
    C = (t, e) => {
      let o = Math.min(600, window.innerHeight - 40),
        n = Math.min(e, o);
      ((t.style.height = `${n}px`), (t.style.maxHeight = `${n}px`));
    },
    L = (t) => {
      t.style.display = "none";
    },
    G = (t) => {
      switch (t) {
        case "wave":
          return "bf-emoji--wave";
        case "bounce":
          return "bf-emoji--bounce";
        case "pulse":
          return "bf-emoji--pulse";
        default:
          return "";
      }
    },
    T = (t) => {
      t && (t.style.display = "none");
    };
  var V = `
/* Keyframe Animations */
@keyframes bf-wave {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(20deg); }
  75% { transform: rotate(-10deg); }
}

@keyframes bf-bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-20px); }
  60% { transform: translateY(-10px); }
}

@keyframes bf-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

@keyframes bf-spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes bf-fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes bf-slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bf-scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* Overlay */
.bf-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  animation: bf-fadeIn 0.2s ease-out;
}

.bf-overlay--no-bg {
  background-color: transparent;
  pointer-events: none;
}

/* Popup Container - Base */
.bf-popup {
  position: fixed;
  z-index: 2147483001;
  background-color: #ffffff;
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: bf-slideUp 0.3s ease-out;
  pointer-events: auto;
}

/* Position Variants */
.bf-popup--bottom-right {
  bottom: 20px;
  right: 20px;
}

.bf-popup--bottom-left {
  bottom: 20px;
  left: 20px;
}

.bf-popup--center {
  position: relative;
  animation: bf-scaleIn 0.3s ease-out;
}

/* Iframe Container */
.bf-iframe-container {
  flex: 1;
  overflow: hidden;
  border-radius: 12px;
}

.bf-iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

/* Close Button */
.bf-close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease, transform 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.bf-close-btn:hover {
  background-color: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.bf-close-btn svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
}

/* Loading Indicator */
.bf-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.bf-loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: bf-spin 0.8s linear infinite;
}

/* Auto-mounted floating Bubble \u2014 script-tag trigger */
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
.bf-bubble--center { bottom: 20px; right: 20px; }
.bf-bubble__icon {
  width: 28px;
  height: 28px;
  display: block;
  object-fit: contain;
}
.bf-bubble__emoji { font-size: 28px; line-height: 1; }
.bf-bubble--hidden { opacity: 0; pointer-events: none; transform: scale(0.6); }

/* Emoji Bubble */
.bf-emoji {
  position: absolute;
  top: -16px;
  left: -16px;
  font-size: 32px;
  line-height: 1;
  z-index: 5;
}

.bf-emoji--wave {
  animation: bf-wave 1s ease-in-out infinite;
}

.bf-emoji--bounce {
  animation: bf-bounce 1.5s ease infinite;
}

.bf-emoji--pulse {
  animation: bf-pulse 1.5s ease-in-out infinite;
}

/* Responsive Adjustments */
@media (max-width: 640px) {
  .bf-popup--bottom-right,
  .bf-popup--bottom-left {
    left: 10px;
    right: 10px;
    bottom: 10px;
    width: auto !important;
  }

  .bf-popup--center {
    max-width: calc(100vw - 20px);
    max-height: calc(100vh - 40px);
  }

  .bf-emoji {
    top: -12px;
    left: -12px;
    font-size: 24px;
  }
}

/* Hide scrollbar but allow scrolling */
.bf-iframe-container::-webkit-scrollbar {
  display: none;
}

.bf-iframe-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`,
    I = () => {
      if (document.getElementById("bf-popup-styles")) return;
      let t = document.createElement("style");
      ((t.id = "bf-popup-styles"), (t.textContent = V), document.head.appendChild(t));
    };
  var W = (t) => {
      let e = {},
        o = t.dataset.layout;
      (o === "modal" || o === "default") && (e.layout = o);
      let n = t.dataset.position;
      (n === "bottom-right" || n === "bottom-left" || n === "center") && (e.position = n);
      let i = t.dataset.width;
      (i && (e.width = parseInt(i, 10)),
        t.dataset.alignLeft === "1" && (e.alignLeft = !0),
        t.dataset.hideTitle === "1" && (e.hideTitle = !0),
        t.dataset.overlay === "1" && (e.overlay = !0));
      let r = t.dataset.emojiText,
        s = t.dataset.emojiAnimation;
      r && (e.emoji = { text: r, animation: s || "none" });
      let a = t.dataset.autoClose;
      a && (e.autoClose = parseInt(a, 10));
      let l = {};
      for (let [c, d] of Object.entries(t.dataset))
        [
          "formId",
          "layout",
          "position",
          "width",
          "alignLeft",
          "hideTitle",
          "overlay",
          "emojiText",
          "emojiAnimation",
          "autoClose",
        ].includes(c) ||
          (d !== void 0 && (l[c] = d));
      return (Object.keys(l).length > 0 && (e.hiddenFields = l), e);
    },
    h = (t) => {
      let e = new URLSearchParams(t.replace(/^#/, "")),
        o = e.get("form-open"),
        n = {},
        i = e.get("position");
      ((i === "bottom-right" || i === "bottom-left" || i === "center") && (n.position = i),
        e.get("align-left") === "1" && (n.alignLeft = !0),
        e.get("hide-title") === "1" && (n.hideTitle = !0),
        e.get("overlay") === "1" && (n.overlay = !0));
      let r = e.get("width");
      r && (n.width = parseInt(r, 10));
      let s = e.get("emoji-text"),
        a = e.get("emoji-animation");
      s && (n.emoji = { text: s, animation: a || "none" });
      let l = e.get("auto-close");
      l && (n.autoClose = parseInt(l, 10));
      let c = {},
        d = new Set([
          "form-open",
          "position",
          "align-left",
          "hide-title",
          "overlay",
          "width",
          "emoji-text",
          "emoji-animation",
          "auto-close",
        ]);
      return (
        e.forEach((f, p) => {
          d.has(p) || (c[p] = f);
        }),
        Object.keys(c).length > 0 && (n.hiddenFields = c),
        { formId: o, options: n }
      );
    },
    j = (t) => {
      document.addEventListener("click", (e) => {
        let o = e.target,
          n = o.closest("[data-form-id]");
        if (n) {
          e.preventDefault();
          let r = n.dataset.formId;
          if (r) {
            let s = W(n);
            t(r, s);
          }
          return;
        }
        let i = o.closest("a");
        if (i?.href?.includes("form-open=")) {
          e.preventDefault();
          let r = i.href.indexOf("#");
          if (r !== -1) {
            let s = i.href.substring(r),
              { formId: a, options: l } = h(s);
            a && t(a, l);
          }
        }
      });
    },
    k = (t) => {
      let { hash: e } = window.location;
      if (e?.includes("form-open=")) {
        let { formId: o, options: n } = h(e);
        o &&
          setTimeout(() => {
            t(o, n);
          }, 100);
      }
    },
    O = (t) => {
      window.addEventListener("hashchange", () => {
        let { hash: e } = window.location;
        if (e?.includes("form-open=")) {
          let { formId: o, options: n } = h(e);
          o && t(o, n);
        }
      });
    };
  var u = new Map(),
    m = (t, e = {}) => {
      if (u.has(t)) {
        console.warn(`[Reform] Popup for form ${t} is already open`);
        return;
      }
      let o = w(t, e, () => b(t)),
        n = y(t, e, o.iframeContainer),
        i = { formId: t, options: e, container: o.popup, iframe: n, overlay: o.overlay };
      if (
        (u.set(t, i),
        n.addEventListener("load", () => {
          L(o.loadingEl);
        }),
        e.onOpen)
      )
        try {
          e.onOpen();
        } catch (r) {
          console.error("[Reform] onOpen callback error:", r);
        }
    },
    b = (t) => {
      let e = u.get(t);
      if (e && (v(e.iframe), e.overlay && E(e.overlay), u.delete(t), e.options.onClose))
        try {
          e.options.onClose();
        } catch (o) {
          console.error("[Reform] onClose callback error:", o);
        }
    },
    Y = (t) => {
      let e;
      try {
        e = typeof t.data == "string" ? JSON.parse(t.data) : t.data;
      } catch {
        return;
      }
      if (!e?.event?.startsWith("Reform.")) return;
      let o;
      for (let n of u.values())
        if (n.iframe.contentWindow === t.source) {
          o = n;
          break;
        }
      if (o)
        switch (e.event) {
          case "Reform.FormLoaded":
            break;
          case "Reform.Resize":
            typeof e.height == "number" && (x(o.iframe, e.height), C(o.container, e.height));
            break;
          case "Reform.FormSubmitted":
            if (o.options.onSubmit)
              try {
                o.options.onSubmit(e.payload);
              } catch (n) {
                console.error("[Reform] onSubmit callback error:", n);
              }
            o.options.autoClose &&
              o.options.autoClose > 0 &&
              setTimeout(() => {
                b(o?.formId);
              }, o.options.autoClose);
            break;
          case "Reform.PageView":
            if (o.options.onPageView && "page" in e)
              try {
                o.options.onPageView(e.page);
              } catch (n) {
                console.error("[Reform] onPageView callback error:", n);
              }
            if ("page" in e && e.page > 1) {
              let n = o.overlay;
              if (n) {
                let i = n.querySelector(".bf-emoji");
                i && T(i);
              }
            }
            break;
          case "Reform.Close":
            b(o.formId);
            break;
        }
    },
    P = () => {
      (I(),
        j(m),
        k(m),
        O(m),
        window.addEventListener("message", Y),
        g(m).catch((t) => {
          console.error("[Reform] setupAutoBubble error:", t);
        }));
    };
  window.Reform = { openPopup: m, closePopup: b };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", P) : P();
})();
