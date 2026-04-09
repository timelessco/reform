/**
 * Reform Popup Embed - Iframe Management
 */

import type { PopupOptions } from "./types";

/**
 * Get the base URL for forms
 * In production, this comes from the script's src attribute
 * Falls back to current origin for local development
 */
const getBaseUrl = (): string => {
  // Try to get URL from the script tag that loaded us
  const scripts = document.getElementsByTagName("script");
  for (let i = scripts.length - 1; i >= 0; i--) {
    const src = scripts[i].src;
    if (src?.includes("/embed/popup.js")) {
      // Extract origin from script src
      try {
        const url = new URL(src);
        return url.origin;
      } catch {
        // Fall through to default
      }
    }
  }

  // Fallback to current origin (for local dev)
  return window.location.origin;
};

/**
 * Build the iframe URL with query parameters
 */
const buildIframeUrl = (formId: string, options: PopupOptions): string => {
  const baseUrl = getBaseUrl();
  const params = new URLSearchParams();

  // Mark as popup mode
  params.set("popup", "1");

  // Add origin page for tracking
  params.set("originPage", window.location.pathname);

  // Form display options
  if (options.hideTitle) {
    params.set("hideTitle", "1");
  }
  if (options.alignLeft) {
    params.set("alignLeft", "1");
  }

  // Transparent background for seamless embedding
  params.set("transparent", "1");

  // Add hidden fields
  if (options.hiddenFields) {
    for (const [key, value] of Object.entries(options.hiddenFields)) {
      params.set(key, value);
    }
  }

  // Forward current page's query params (useful for UTM tracking, etc.)
  const currentParams = new URLSearchParams(window.location.search);
  currentParams.forEach((value, key) => {
    // Don't override explicit hidden fields
    if (!params.has(key)) {
      params.set(key, value);
    }
  });

  return `${baseUrl}/forms/${formId}?${params.toString()}`;
};

/**
 * Create and configure the iframe element
 */
export const createIframe = (
  formId: string,
  options: PopupOptions,
  container: HTMLElement,
): HTMLIFrameElement => {
  const iframe = document.createElement("iframe");
  iframe.className = "bf-iframe";
  iframe.setAttribute("title", "Reform");
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("allow", "fullscreen");
  iframe.setAttribute("data-bf-form-id", formId);

  // Set initial height
  iframe.style.height = "400px";

  // Build and set src
  const url = buildIframeUrl(formId, options);
  iframe.src = url;

  // Append to container
  container.appendChild(iframe);

  return iframe;
};

/**
 * Update iframe height
 */
export const updateIframeHeight = (iframe: HTMLIFrameElement, height: number): void => {
  // Add some padding to prevent scrollbars
  const adjustedHeight = height + 2;
  iframe.style.height = `${adjustedHeight}px`;
};

/**
 * Destroy iframe and cleanup
 */
export const destroyIframe = (iframe: HTMLIFrameElement): void => {
  iframe.remove();
};
