/**
 * Reform Popup Embed Script
 *
 * This script provides the ability to embed Reform as popups on external websites.
 *
 * Usage:
 * 1. Include this script: <script async src="https://yoursite.com/embed/popup.js"></script>
 * 2. Add trigger elements: <button data-form-id="your-form-id">Open Form</button>
 * 3. Or use the JS API: Reform.openPopup('your-form-id', options)
 */

import { createIframe, destroyIframe, updateIframeHeight } from "./lib/iframe";
import {
  createOverlay,
  destroyOverlay,
  hideEmoji,
  hideLoading,
  updatePopupHeight,
} from "./lib/overlay";
import { injectStyles } from "./lib/styles";
import { checkHashTrigger, setupClickTriggers, setupHashChangeListener } from "./lib/triggers";
import type { IframeEvent, PopupInstance, PopupOptions } from "./lib/types";

// Registry of active popup instances
const activePopups = new Map<string, PopupInstance>();

/**
 * Open a popup for the given form
 */
export const openPopup = (formId: string, options: PopupOptions = {}): void => {
  // Don't open if already open
  if (activePopups.has(formId)) {
    console.warn(`[Reform] Popup for form ${formId} is already open`);
    return;
  }

  // Create overlay and popup container
  const elements = createOverlay(formId, options, () => closePopup(formId));

  // Create iframe
  const iframe = createIframe(formId, options, elements.iframeContainer);

  // Store instance
  const instance: PopupInstance = {
    formId,
    options,
    container: elements.popup,
    iframe,
    overlay: elements.overlay,
  };
  activePopups.set(formId, instance);

  // Setup iframe load handler
  iframe.addEventListener("load", () => {
    hideLoading(elements.loadingEl);
  });

  // Call onOpen callback
  if (options.onOpen) {
    try {
      options.onOpen();
    } catch (e) {
      console.error("[Reform] onOpen callback error:", e);
    }
  }
};

/**
 * Close the popup for the given form
 */
export const closePopup = (formId: string): void => {
  const instance = activePopups.get(formId);
  if (!instance) {
    return;
  }

  // Cleanup iframe
  destroyIframe(instance.iframe);

  // Cleanup overlay
  if (instance.overlay) {
    destroyOverlay(instance.overlay);
  }

  // Remove from registry
  activePopups.delete(formId);

  // Call onClose callback
  if (instance.options.onClose) {
    try {
      instance.options.onClose();
    } catch (e) {
      console.error("[Reform] onClose callback error:", e);
    }
  }
};

/**
 * Handle postMessage events from iframes
 */
const handleMessage = (event: MessageEvent): void => {
  // Parse message data
  let data: IframeEvent;
  try {
    // Support both string and object messages
    data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
  } catch {
    // Not a JSON message, ignore
    return;
  }

  // Only handle Reform events
  if (!data?.event?.startsWith("Reform.")) {
    return;
  }

  // Find the corresponding popup instance by checking iframe source
  let instance: PopupInstance | undefined;
  for (const popup of activePopups.values()) {
    if (popup.iframe.contentWindow === event.source) {
      instance = popup;
      break;
    }
  }

  if (!instance) {
    return;
  }

  switch (data.event) {
    case "Reform.FormLoaded":
      // Form has loaded, hide loading indicator is already handled by iframe load event
      break;

    case "Reform.Resize":
      // Update iframe and popup height
      if (typeof data.height === "number") {
        updateIframeHeight(instance.iframe, data.height);
        updatePopupHeight(instance.container, data.height);
      }
      break;

    case "Reform.FormSubmitted":
      // Handle form submission
      if (instance.options.onSubmit) {
        try {
          instance.options.onSubmit(data.payload);
        } catch (e) {
          console.error("[Reform] onSubmit callback error:", e);
        }
      }

      // Auto-close if configured
      if (instance.options.autoClose && instance.options.autoClose > 0) {
        setTimeout(() => {
          closePopup(instance?.formId);
        }, instance.options.autoClose);
      }

      // TODO: Analytics forwarding (future)
      // Forward to dataLayer/fbq if available
      break;

    case "Reform.PageView":
      // Multi-step form page change
      if (instance.options.onPageView && "page" in data) {
        try {
          instance.options.onPageView(data.page);
        } catch (e) {
          console.error("[Reform] onPageView callback error:", e);
        }
      }

      // Hide emoji after first page
      if ("page" in data && data.page > 1) {
        const overlayEl = instance.overlay;
        if (overlayEl) {
          const emojiEl = overlayEl.querySelector(".bf-emoji") as HTMLElement | null;
          if (emojiEl) {
            hideEmoji(emojiEl);
          }
        }
      }
      break;

    case "Reform.Close":
      // Close requested from iframe
      closePopup(instance.formId);
      break;
  }
};

/**
 * Initialize the embed script
 */
const init = (): void => {
  // Inject styles
  injectStyles();

  // Setup click event triggers
  setupClickTriggers(openPopup);

  // Check for hash trigger on page load
  checkHashTrigger(openPopup);

  // Listen for hash changes
  setupHashChangeListener(openPopup);

  // Setup message listener for iframe communication
  window.addEventListener("message", handleMessage);
};

// Create global API
window.Reform = {
  openPopup,
  closePopup,
};

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Export for potential future module usage
