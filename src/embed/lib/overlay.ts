/**
 * Reform Popup Embed - Overlay & Container Management
 */

import type { PopupOptions } from "./types";

/** SVG for close button */
const CLOSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>Close popup</title><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

/** Default popup width */
const DEFAULT_WIDTH = 376;

/** Default popup height (max) */
const DEFAULT_MAX_HEIGHT = 600;

interface OverlayElements {
  overlay: HTMLElement;
  popup: HTMLElement;
  iframeContainer: HTMLElement;
  closeBtn: HTMLButtonElement;
  loadingEl: HTMLElement;
  emojiEl?: HTMLElement;
}

/**
 * Create overlay and popup container elements
 */
export const createOverlay = (
  formId: string,
  options: PopupOptions,
  onClose: () => void,
): OverlayElements => {
  const isModal = options.layout === "modal" || options.position === "center";
  const showOverlay = options.overlay !== false || isModal;
  const position = options.position || "bottom-right";
  const width = options.width || DEFAULT_WIDTH;

  // Create overlay (backdrop)
  const overlay = document.createElement("div");
  overlay.className = `bf-overlay ${!showOverlay ? "bf-overlay--no-bg" : ""}`;
  overlay.setAttribute("data-bf-form-id", formId);

  // Click on overlay backdrop closes popup (if visible)
  if (showOverlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        onClose();
      }
    });
  }

  // Create popup container
  const popup = document.createElement("div");
  popup.className = `bf-popup bf-popup--${isModal ? "center" : position}`;
  Object.assign(popup.style, {
    width: `${width}px`,
    maxHeight: `${DEFAULT_MAX_HEIGHT}px`,
  });

  // Create close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "bf-close-btn";
  closeBtn.innerHTML = CLOSE_ICON;
  closeBtn.setAttribute("aria-label", "Close form");
  closeBtn.addEventListener("click", onClose);

  // Create iframe container
  const iframeContainer = document.createElement("div");
  iframeContainer.className = "bf-iframe-container";

  // Create loading indicator
  const loadingEl = document.createElement("div");
  loadingEl.className = "bf-loading";
  loadingEl.innerHTML = '<div class="bf-loading-spinner"></div>';

  // Create emoji element if specified
  let emojiEl: HTMLElement | undefined;
  if (options.emoji?.text) {
    emojiEl = document.createElement("div");
    emojiEl.className = `bf-emoji ${getEmojiAnimationClass(options.emoji.animation)}`;
    emojiEl.textContent = options.emoji.text;
  }

  // Assemble DOM structure
  popup.appendChild(closeBtn);
  popup.appendChild(loadingEl);
  popup.appendChild(iframeContainer);
  if (emojiEl) {
    popup.appendChild(emojiEl);
  }

  if (isModal) {
    overlay.appendChild(popup);
  } else {
    overlay.appendChild(popup);
  }

  // Prevent body scroll when overlay is visible
  if (showOverlay) {
    document.body.style.overflow = "hidden";
  }

  // Append to body
  document.body.appendChild(overlay);

  return {
    overlay,
    popup,
    iframeContainer,
    closeBtn,
    loadingEl,
    emojiEl,
  };
};

/**
 * Destroy overlay and cleanup
 */
export const destroyOverlay = (overlay: HTMLElement): void => {
  // Restore body scroll
  document.body.style.overflow = "";

  // Remove from DOM with fade out
  overlay.style.opacity = "0";
  overlay.style.transition = "opacity 0.15s ease";

  setTimeout(() => {
    overlay.remove();
  }, 150);
};

/**
 * Update popup height based on iframe content
 */
export const updatePopupHeight = (popup: HTMLElement, height: number): void => {
  const maxHeight = window.innerHeight - 40; // 20px margin top and bottom
  const clampedHeight = Math.min(height, maxHeight);
  popup.style.maxHeight = `${clampedHeight}px`;
};

/**
 * Hide loading indicator
 */
export const hideLoading = (loadingEl: HTMLElement): void => {
  loadingEl.style.display = "none";
};

/**
 * Get CSS class for emoji animation
 */
const getEmojiAnimationClass = (animation?: string): string => {
  switch (animation) {
    case "wave":
      return "bf-emoji--wave";
    case "bounce":
      return "bf-emoji--bounce";
    case "pulse":
      return "bf-emoji--pulse";
    default:
      return "";
  }
};

/**
 * Hide emoji after first page (multi-step forms)
 */
export const hideEmoji = (emojiEl?: HTMLElement): void => {
  if (emojiEl) {
    emojiEl.style.display = "none";
  }
};
