// Warm the browser for the popup origin and form document so clicking the
// bubble opens an already-primed popup.
//
// - preconnect: opens the TCP+TLS connection to the form origin eagerly.
// - prefetch as=document: caches the form HTML so the iframe's first byte
//   is instant on click.
// - warmupFormOnIntent: on first hover/focus/touch, builds the full popup
//   (overlay + iframe) hidden in the DOM. The iframe sits in its final
//   container from the start, so clicking just toggles visibility — no
//   reparenting (which would force a reload) and no duplicate fetches.

const ensureLinkTag = (rel: string, href: string, crossOrigin?: string): void => {
  const existing = document.head.querySelector(
    `link[rel="${rel}"][href="${href}"]`,
  ) as HTMLLinkElement | null;
  if (existing) return;

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (crossOrigin !== undefined) {
    link.crossOrigin = crossOrigin;
  }
  document.head.appendChild(link);
};

/**
 * Inject a preconnect hint for the given origin. No-op when the origin
 * matches the current page (the browser is already connected).
 */
export const preconnectOrigin = (origin: string): void => {
  if (origin === window.location.origin) return;
  ensureLinkTag("preconnect", origin, "anonymous");
  // dns-prefetch is a cheap fallback for browsers (mainly older Safari)
  // that don't act on preconnect aggressively.
  ensureLinkTag("dns-prefetch", origin);
};

type IdleCallback = (cb: () => void) => void;

const schedule: IdleCallback = (cb) => {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
    .requestIdleCallback;
  if (typeof ric === "function") {
    ric(cb);
    return;
  }
  setTimeout(cb, 1500);
};

/**
 * Prefetch the form document on idle. Caches the HTML so the iframe's first
 * byte is instant on click.
 */
export const prefetchFormDocument = (iframeUrl: string): void => {
  schedule(() => {
    ensureLinkTag("prefetch", iframeUrl, "anonymous");
  });
};

/**
 * Attach one-shot intent listeners to the trigger. On the first hover,
 * focus, or touch, the provided `warmup` callback runs — usually building
 * the full popup hidden so the click after just reveals it.
 */
export const warmupFormOnIntent = (trigger: HTMLElement, warmup: () => void): void => {
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    warmup();
  };

  const opts: AddEventListenerOptions = { once: true, passive: true };
  trigger.addEventListener("pointerenter", fire, opts);
  trigger.addEventListener("focus", fire, opts);
  trigger.addEventListener("touchstart", fire, opts);
};
