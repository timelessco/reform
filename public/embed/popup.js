"use strict";
(() => {
  var I = () => {
      let t = document.getElementsByTagName("script");
      for (let e = t.length - 1; e >= 0; e--) {
        let n = t[e].src;
        if (n?.includes("/embed/popup.js"))
          try {
            return new URL(n).origin;
          } catch {}
      }
      return window.location.origin;
    },
    M = (t, e) => {
      let n = I(),
        o = new URLSearchParams();
      if (
        (o.set("popup", "1"),
        o.set("originPage", window.location.pathname),
        e.hideTitle && o.set("hideTitle", "1"),
        e.alignLeft && o.set("alignLeft", "1"),
        o.set("transparent", "1"),
        e.hiddenFields)
      )
        for (let [a, l] of Object.entries(e.hiddenFields)) o.set(a, l);
      return (
        new URLSearchParams(window.location.search).forEach((a, l) => {
          o.has(l) || o.set(l, a);
        }),
        `${n}/forms/${t}?${o.toString()}`
      );
    },
    h = (t, e, n) => {
      let o = document.createElement("iframe");
      ((o.className = "bf-iframe"),
        o.setAttribute("title", "Reform"),
        o.setAttribute("frameborder", "0"),
        o.setAttribute("allow", "fullscreen"),
        o.setAttribute("data-bf-form-id", t),
        (o.style.height = "400px"));
      let i = M(t, e);
      return ((o.src = i), n.appendChild(o), o);
    },
    y = (t, e) => {
      let n = e + 2;
      t.style.height = `${n}px`;
    },
    x = (t) => {
      t.remove();
    };
  var A =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Close popup</title><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
  var v = (t, e, n) => {
      let o = e.layout === "modal" || e.position === "center",
        i = e.overlay !== !1 || o,
        a = e.position || "bottom-right",
        l = e.width || 376,
        s = document.createElement("div");
      ((s.className = `bf-overlay ${i ? "" : "bf-overlay--no-bg"}`),
        s.setAttribute("data-bf-form-id", t),
        i &&
          s.addEventListener("click", (O) => {
            O.target === s && n();
          }));
      let r = document.createElement("div");
      ((r.className = `bf-popup bf-popup--${o ? "center" : a}`),
        Object.assign(r.style, { width: `${l}px`, maxHeight: "600px" }));
      let p = document.createElement("button");
      ((p.className = "bf-close-btn"),
        (p.innerHTML = A),
        p.setAttribute("aria-label", "Close form"),
        p.addEventListener("click", n));
      let f = document.createElement("div");
      f.className = "bf-iframe-container";
      let d = document.createElement("div");
      ((d.className = "bf-loading"), (d.innerHTML = '<div class="bf-loading-spinner"></div>'));
      let c;
      return (
        e.emoji?.text &&
          ((c = document.createElement("div")),
          (c.className = `bf-emoji ${R(e.emoji.animation)}`),
          (c.textContent = e.emoji.text)),
        r.appendChild(p),
        r.appendChild(d),
        r.appendChild(f),
        c && r.appendChild(c),
        s.appendChild(r),
        i && (document.body.style.overflow = "hidden"),
        document.body.appendChild(s),
        { overlay: s, popup: r, iframeContainer: f, closeBtn: p, loadingEl: d, emojiEl: c }
      );
    },
    w = (t) => {
      ((document.body.style.overflow = ""),
        (t.style.opacity = "0"),
        (t.style.transition = "opacity 0.15s ease"),
        setTimeout(() => {
          t.remove();
        }, 150));
    },
    E = (t, e) => {
      let n = window.innerHeight - 40,
        o = Math.min(e, n);
      t.style.maxHeight = `${o}px`;
    },
    L = (t) => {
      t.style.display = "none";
    },
    R = (t) => {
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
    j = (t) => {
      t && (t.style.display = "none");
    };
  var S = `
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
    T = () => {
      if (document.getElementById("bf-popup-styles")) return;
      let t = document.createElement("style");
      ((t.id = "bf-popup-styles"), (t.textContent = S), document.head.appendChild(t));
    };
  var F = (t) => {
      let e = {},
        n = t.dataset.layout;
      (n === "modal" || n === "default") && (e.layout = n);
      let o = t.dataset.position;
      (o === "bottom-right" || o === "bottom-left" || o === "center") && (e.position = o);
      let i = t.dataset.width;
      (i && (e.width = parseInt(i, 10)),
        t.dataset.alignLeft === "1" && (e.alignLeft = !0),
        t.dataset.hideTitle === "1" && (e.hideTitle = !0),
        t.dataset.overlay === "1" && (e.overlay = !0));
      let a = t.dataset.emojiText,
        l = t.dataset.emojiAnimation;
      a && (e.emoji = { text: a, animation: l || "none" });
      let s = t.dataset.autoClose;
      s && (e.autoClose = parseInt(s, 10));
      let r = {};
      for (let [p, f] of Object.entries(t.dataset))
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
        ].includes(p) ||
          (f !== void 0 && (r[p] = f));
      return (Object.keys(r).length > 0 && (e.hiddenFields = r), e);
    },
    g = (t) => {
      let e = new URLSearchParams(t.replace(/^#/, "")),
        n = e.get("form-open"),
        o = {},
        i = e.get("position");
      ((i === "bottom-right" || i === "bottom-left" || i === "center") && (o.position = i),
        e.get("align-left") === "1" && (o.alignLeft = !0),
        e.get("hide-title") === "1" && (o.hideTitle = !0),
        e.get("overlay") === "1" && (o.overlay = !0));
      let a = e.get("width");
      a && (o.width = parseInt(a, 10));
      let l = e.get("emoji-text"),
        s = e.get("emoji-animation");
      l && (o.emoji = { text: l, animation: s || "none" });
      let r = e.get("auto-close");
      r && (o.autoClose = parseInt(r, 10));
      let p = {},
        f = new Set([
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
        e.forEach((d, c) => {
          f.has(c) || (p[c] = d);
        }),
        Object.keys(p).length > 0 && (o.hiddenFields = p),
        { formId: n, options: o }
      );
    },
    k = (t) => {
      document.addEventListener("click", (e) => {
        let n = e.target,
          o = n.closest("[data-form-id]");
        if (o) {
          e.preventDefault();
          let a = o.dataset.formId;
          if (a) {
            let l = F(o);
            t(a, l);
          }
          return;
        }
        let i = n.closest("a");
        if (i?.href?.includes("form-open=")) {
          e.preventDefault();
          let a = i.href.indexOf("#");
          if (a !== -1) {
            let l = i.href.substring(a),
              { formId: s, options: r } = g(l);
            s && t(s, r);
          }
        }
      });
    },
    C = (t) => {
      let { hash: e } = window.location;
      if (e?.includes("form-open=")) {
        let { formId: n, options: o } = g(e);
        n &&
          setTimeout(() => {
            t(n, o);
          }, 100);
      }
    },
    H = (t) => {
      window.addEventListener("hashchange", () => {
        let { hash: e } = window.location;
        if (e?.includes("form-open=")) {
          let { formId: n, options: o } = g(e);
          n && t(n, o);
        }
      });
    };
  var m = new Map(),
    u = (t, e = {}) => {
      if (m.has(t)) {
        console.warn(`[Reform] Popup for form ${t} is already open`);
        return;
      }
      let n = v(t, e, () => b(t)),
        o = h(t, e, n.iframeContainer),
        i = { formId: t, options: e, container: n.popup, iframe: o, overlay: n.overlay };
      if (
        (m.set(t, i),
        o.addEventListener("load", () => {
          L(n.loadingEl);
        }),
        e.onOpen)
      )
        try {
          e.onOpen();
        } catch (a) {
          console.error("[Reform] onOpen callback error:", a);
        }
    },
    b = (t) => {
      let e = m.get(t);
      if (e && (x(e.iframe), e.overlay && w(e.overlay), m.delete(t), e.options.onClose))
        try {
          e.options.onClose();
        } catch (n) {
          console.error("[Reform] onClose callback error:", n);
        }
    },
    U = (t) => {
      let e;
      try {
        e = typeof t.data == "string" ? JSON.parse(t.data) : t.data;
      } catch {
        return;
      }
      if (!e?.event?.startsWith("Reform.")) return;
      let n;
      for (let o of m.values())
        if (o.iframe.contentWindow === t.source) {
          n = o;
          break;
        }
      if (n)
        switch (e.event) {
          case "Reform.FormLoaded":
            break;
          case "Reform.Resize":
            typeof e.height == "number" && (y(n.iframe, e.height), E(n.container, e.height));
            break;
          case "Reform.FormSubmitted":
            if (n.options.onSubmit)
              try {
                n.options.onSubmit(e.payload);
              } catch (o) {
                console.error("[Reform] onSubmit callback error:", o);
              }
            n.options.autoClose &&
              n.options.autoClose > 0 &&
              setTimeout(() => {
                b(n?.formId);
              }, n.options.autoClose);
            break;
          case "Reform.PageView":
            if (n.options.onPageView && "page" in e)
              try {
                n.options.onPageView(e.page);
              } catch (o) {
                console.error("[Reform] onPageView callback error:", o);
              }
            if ("page" in e && e.page > 1) {
              let o = n.overlay;
              if (o) {
                let i = o.querySelector(".bf-emoji");
                i && j(i);
              }
            }
            break;
          case "Reform.Close":
            b(n.formId);
            break;
        }
    },
    P = () => {
      (T(), k(u), C(u), H(u), window.addEventListener("message", U));
    };
  window.Reform = { openPopup: u, closePopup: b };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", P) : P();
})();
