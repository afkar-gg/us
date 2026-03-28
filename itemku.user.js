// ==UserScript==
// @name         Itemku ultimate gooner
// @namespace    https://tokoku.itemku.com/
// @version      1.0.0
// @description  most random shi i do when bored is on here
// @match        https://tokoku.itemku.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  const PINCODE_SELECTOR = 'input.pincode-input-text';
  const TOTAL_INPUTS = 6;
  const FILL_VALUE = '0';
  const SEND_BUTTON_CANDIDATES = [
    '#send-icon',
    'button .send-icon',
    'button[aria-label*="send" i]',
    'button[aria-label*="kirim" i]',
    'button[title*="send" i]',
    'button[title*="kirim" i]',
    'button[type="submit"]',
    'button.cursor-pointer',
    'button[type="button"]',
  ];

  /**
   * Creates a small status indicator in the bottom-right corner
   */
  function createStatusIndicator() {
    const container = document.createElement('div');
    container.id = 'pincode-autofill-status';
    container.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      padding: 8px 12px;
      background: rgba(0, 128, 0, 0.9);
      color: white;
      font-size: 12px;
      font-family: system-ui, -apple-system, sans-serif;
      border-radius: 6px;
      z-index: 2147483647;
      opacity: 0.9;
      transition: opacity 0.3s;
    `;
    container.textContent = 'Pincode auto-fill ready';
    document.body.appendChild(container);

    // Auto-hide after 3 seconds
    setTimeout(() => {
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 300);
    }, 3000);

    return container;
  }

  /**
   * Fills a single input with '0' and triggers necessary events
   */
  function fillInput(input) {
    if (!input || input.value === FILL_VALUE) return false;

    // Set the value
    input.value = FILL_VALUE;

    // Trigger input event
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    return true;
  }

  /**
   * Attempts to fill all pincode inputs
   */
  function fillAllInputs() {
    const inputs = document.querySelectorAll(PINCODE_SELECTOR);
    let filled = 0;

    inputs.forEach((input) => {
      if (fillInput(input)) {
        filled++;
      }
    });

    return { total: inputs.length, filled };
  }

  /**
   * Waits for all inputs to be present and fills them
   */
  function waitForAndFillInputs() {
    return new Promise((resolve) => {
      const checkAndFill = () => {
        const inputs = document.querySelectorAll(PINCODE_SELECTOR);
        if (inputs.length >= TOTAL_INPUTS) {
          const result = fillAllInputs();
          resolve(result);
          return true;
        }
        return false;
      };

      // Initial check
      if (checkAndFill()) return;

      // Use MutationObserver to watch for new inputs
      const observer = new MutationObserver((mutations) => {
        if (checkAndFill()) {
          observer.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        observer.disconnect();
        const result = fillAllInputs();
        resolve(result);
      }, 10000);
    });
  }

  /**
   * Returns a clickable send button if found
   */
  function getClickableButton(element) {
    const button = element?.closest?.('button');
    if (!(button instanceof HTMLButtonElement)) return null;
    if (button.disabled) return null;
    const style = window.getComputedStyle(button);
    if (style.display === 'none' || style.visibility === 'hidden') return null;
    if (button.getClientRects().length === 0) return null;
    return button;
  }

  /**
   * Checks if key event target is a typing field
   */
  function isTypingField(target) {
    if (!(target instanceof Element)) return false;

    if (target.closest('[contenteditable="true"], [contenteditable=""], [role="textbox"]')) {
      return true;
    }

    const field = target.closest('textarea, input');
    if (!field) return false;
    if (field instanceof HTMLTextAreaElement) return true;
    if (!(field instanceof HTMLInputElement)) return false;

    const type = (field.type || 'text').toLowerCase();
    const nonTextTypes = new Set([
      'button', 'submit', 'reset', 'checkbox', 'radio', 'file', 'image', 'range',
      'color', 'date', 'datetime-local', 'month', 'time', 'week', 'hidden',
    ]);
    return !nonTextTypes.has(type);
  }

  /**
   * Returns a clickable send button if found
   */
  function findSendButton(originTarget) {
    const activeElement = document.activeElement instanceof Element ? document.activeElement : null;
    const origin = originTarget instanceof Element ? originTarget : activeElement;

    // Prefer button in the same form as the typing field.
    const formButton = origin?.closest('form')?.querySelector?.('button[type="submit"], button[type="button"]');
    if (formButton instanceof HTMLButtonElement) {
      const style = window.getComputedStyle(formButton);
      if (!formButton.disabled && style.display !== 'none' && style.visibility !== 'hidden' && formButton.getClientRects().length > 0) {
        return formButton;
      }
    }

    // Then try local container near typing field before global selectors.
    const localContainers = [
      origin?.closest('[class*="chat" i], [class*="message" i], [class*="input" i], [class*="composer" i]'),
      origin?.parentElement,
    ].filter(Boolean);
    for (const container of localContainers) {
      for (const selector of SEND_BUTTON_CANDIDATES) {
        let element = null;
        try {
          element = container.querySelector(selector);
        } catch (_err) {
          continue;
        }
        const button = getClickableButton(element);
        if (button) return button;
      }
    }

    for (const selector of SEND_BUTTON_CANDIDATES) {
      let element = null;
      try {
        element = document.querySelector(selector);
      } catch (_err) {
        continue;
      }
      const button = getClickableButton(element);
      if (button) return button;
    }

    // Last fallback: bottom-right visible button (often chat send control).
    const buttons = Array.from(document.querySelectorAll('button')).filter((button) => {
      if (button.disabled) return false;
      const style = window.getComputedStyle(button);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (button.getClientRects().length === 0) return false;
      return true;
    });
    buttons.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return (br.bottom + br.right) - (ar.bottom + ar.right);
    });
    if (buttons.length > 0) return buttons[0];

    return null;
  }

  /**
   * On Enter key, click send button if available
   */
  function setupEnterToSend() {
    const onEnterKey = (event) => {
      if (event.key !== 'Enter') return;
      if (event.isComposing) return;
      if (event.repeat) return;

      const target = event.target;
      if (!isTypingField(target)) return;

      // Never send on Shift+Enter. Keep default newline behavior.
      if (event.shiftKey) {
        event.stopPropagation();
        if (typeof event.stopImmediatePropagation === 'function') {
          event.stopImmediatePropagation();
        }
        return;
      }

      if (event.ctrlKey || event.altKey || event.metaKey) return;

      const sendButton = findSendButton(target);
      if (!sendButton) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }

      // Some apps rely on pointer/mouse events before click.
      if (typeof PointerEvent !== 'undefined') {
        sendButton.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      }
      sendButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
      sendButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
      sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    };

    // Capture phase to run before app-level bubbling handlers can swallow Enter.
    window.addEventListener('keydown', onEnterKey, true);
  }

  /**
   * Main initialization
   */
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }

    function start() {
      setupEnterToSend();

      // Small delay to ensure page elements are fully rendered
      setTimeout(() => {
        waitForAndFillInputs().then((result) => {
          if (result.total > 0) {
            createStatusIndicator();
            console.log(`[Pincode Auto-fill] Filled ${result.filled}/${result.total} inputs`);
          }
        });
      }, 500);
    }
  }

  init();
})();
