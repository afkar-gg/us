// ==UserScript==
// @name         hugging face gooner
// @namespace    https://huggingface.co/
// @version      0.1.0
// @description  Redirects and helps fill Hugging Face join + token pages with randomized values, with a draggable status UI.
// @match        https://huggingface.co/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(() => {
  'use strict';

  /**
   * NOTE:
   * - This script intentionally does NOT attempt to bypass CAPTCHAs or other anti-bot measures.
   * - Use only in ways that comply with Hugging Face Terms and your local rules.
   */

  // ------------------------------
  // UI (draggable, mobile+desktop)
  // ------------------------------

  function createUI() {
    const root = document.createElement('div');
    root.id = 'hfg-ui-root';

    // Use Shadow DOM so Hugging Face styles don't break our UI.
    const shadow = root.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      .panel {
        position: fixed;
        z-index: 2147483647;
        left: 12px;
        bottom: 12px;
        width: min(360px, calc(100vw - 24px));
        background: rgba(20, 22, 28, 0.88);
        color: #e9eef6;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        box-shadow: 0 16px 50px rgba(0, 0, 0, 0.45);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        background: linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));
        border-bottom: 1px solid rgba(255,255,255,0.10);
        cursor: grab;
        user-select: none;
        touch-action: none;
      }
      .title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .title b {
        font-size: 12px;
        letter-spacing: 0.2px;
        text-transform: lowercase;
      }
      .subtitle {
        font-size: 11px;
        color: rgba(233, 238, 246, 0.75);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip {
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        color: rgba(233, 238, 246, 0.92);
        white-space: nowrap;
      }
      .body { padding: 10px 12px 12px; }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
        margin-bottom: 6px;
      }
      .label { font-size: 11px; color: rgba(233, 238, 246, 0.72); }
      .value {
        font-size: 11px;
        color: rgba(233, 238, 246, 0.95);
        text-align: right;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 240px;
      }
      .log {
        margin-top: 10px;
        max-height: 140px;
        overflow: auto;
        padding-right: 4px;
      }
      .logLine {
        font-size: 11px;
        line-height: 1.35;
        padding: 6px 8px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.10);
        background: rgba(255,255,255,0.04);
        margin-bottom: 6px;
      }
      .actions {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }
      button {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.14);
        background: rgba(255,255,255,0.06);
        cursor: pointer;
        user-select: none;
      }
      button:hover { background: rgba(255,255,255,0.10); }
      button:active { transform: translateY(1px); }
      .danger { border-color: rgba(255, 90, 90, 0.35); }
    `;

    const panel = document.createElement('div');
    panel.className = 'panel';

    const header = document.createElement('div');
    header.className = 'header';

    const title = document.createElement('div');
    title.className = 'title';

    const titleB = document.createElement('b');
    titleB.textContent = 'hugging face gooner';

    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = location.href;

    title.appendChild(titleB);
    title.appendChild(subtitle);

    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = 'idle';

    header.appendChild(title);
    header.appendChild(chip);

    const body = document.createElement('div');
    body.className = 'body';

    const row1 = document.createElement('div');
    row1.className = 'row';
    const stepLabel = document.createElement('div');
    stepLabel.className = 'label';
    stepLabel.textContent = 'step';
    const stepValue = document.createElement('div');
    stepValue.className = 'value';
    stepValue.textContent = '-';
    row1.appendChild(stepLabel);
    row1.appendChild(stepValue);

    const row2 = document.createElement('div');
    row2.className = 'row';
    const infoLabel = document.createElement('div');
    infoLabel.className = 'label';
    infoLabel.textContent = 'info';
    const infoValue = document.createElement('div');
    infoValue.className = 'value';
    infoValue.textContent = '-';
    row2.appendChild(infoLabel);
    row2.appendChild(infoValue);

    const log = document.createElement('div');
    log.className = 'log';

    const actions = document.createElement('div');
    actions.className = 'actions';

    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = 'pause';

    const resumeBtn = document.createElement('button');
    resumeBtn.textContent = 'resume';

    const hideBtn = document.createElement('button');
    hideBtn.className = 'danger';
    hideBtn.textContent = 'hide';

    actions.appendChild(pauseBtn);
    actions.appendChild(resumeBtn);
    actions.appendChild(hideBtn);

    body.appendChild(row1);
    body.appendChild(row2);
    body.appendChild(actions);
    body.appendChild(log);

    panel.appendChild(header);
    panel.appendChild(body);

    shadow.appendChild(style);
    shadow.appendChild(panel);

    document.documentElement.appendChild(root);

    // Persist panel position between reloads
    const POS_KEY = 'hfg_ui_pos_v1';
    let lastLeft = null;
    let lastBottom = null;

    function clampAndApply(left, bottom) {
      // Allow moving beyond screen edges, but keep a small "grab area" visible
      // so the panel can't be dragged completely out of reach.
      const KEEP_VISIBLE_PX = 44;
      const rect = panel.getBoundingClientRect();

      // left ranges from -(width-KEEP) .. (viewport-KEEP)
      const minLeft = -Math.max(0, rect.width - KEEP_VISIBLE_PX);
      const maxLeft = window.innerWidth - KEEP_VISIBLE_PX;

      // bottom ranges from -(height-KEEP) .. (viewport-KEEP)
      const minBottom = -Math.max(0, rect.height - KEEP_VISIBLE_PX);
      const maxBottom = window.innerHeight - KEEP_VISIBLE_PX;

      const newLeft = Math.max(minLeft, Math.min(maxLeft, left));
      const newBottom = Math.max(minBottom, Math.min(maxBottom, bottom));

      panel.style.left = `${newLeft}px`;
      panel.style.bottom = `${newBottom}px`;
      lastLeft = newLeft;
      lastBottom = newBottom;
    }

    function persistPosition() {
      const rect = panel.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const bottom = viewportH - rect.bottom;
      const left = rect.left;
      const pos = {
        left: typeof lastLeft === 'number' ? lastLeft : left,
        bottom: typeof lastBottom === 'number' ? lastBottom : bottom,
      };
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(pos));
      } catch {
        // ignore
      }
    }

    function restorePosition() {
      try {
        const raw = localStorage.getItem(POS_KEY);
        if (!raw) return;
        const pos = JSON.parse(raw);
        if (typeof pos?.left !== 'number' || typeof pos?.bottom !== 'number') return;
        clampAndApply(pos.left, pos.bottom);
      } catch {
        // ignore
      }
    }

    // Restore after layout is ready
    requestAnimationFrame(() => restorePosition());

    // Re-clamp on resize
    window.addEventListener('resize', () => {
      const rect = panel.getBoundingClientRect();
      const viewportH = window.innerHeight;
      clampAndApply(rect.left, viewportH - rect.bottom);
      persistPosition();
    });

    // Persist on navigation (best-effort)
    window.addEventListener('beforeunload', () => persistPosition());

    // Draggable using Pointer Events (works for mouse + touch)
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startBottom = 0;

    function getPanelRect() {
      return panel.getBoundingClientRect();
    }

    header.addEventListener('pointerdown', (e) => {
      dragging = true;
      header.style.cursor = 'grabbing';
      header.setPointerCapture(e.pointerId);

      const rect = getPanelRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;

      // We position with left+bottom; rect.bottom is from top.
      const viewportH = window.innerHeight;
      startBottom = viewportH - rect.bottom;

      e.preventDefault();
    });

    header.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = startLeft + dx;
      let newBottom = startBottom - dy;

      clampAndApply(newLeft, newBottom);
    });

    header.addEventListener('pointerup', () => {
      dragging = false;
      header.style.cursor = 'grab';
      persistPosition();
    });

    header.addEventListener('pointercancel', () => {
      dragging = false;
      header.style.cursor = 'grab';
      persistPosition();
    });

    let paused = false;

    pauseBtn.addEventListener('click', () => {
      paused = true;
      chip.textContent = 'paused';
    });

    resumeBtn.addEventListener('click', () => {
      paused = false;
      chip.textContent = 'running';
    });

    hideBtn.addEventListener('click', () => {
      root.remove();
    });

    function setState(state) {
      chip.textContent = state;
    }

    function setStep(step) {
      stepValue.textContent = step;
    }

    function setInfo(info) {
      infoValue.textContent = info;
    }

    function addLog(line) {
      const el = document.createElement('div');
      el.className = 'logLine';
      const ts = new Date().toLocaleTimeString();
      el.textContent = `[${ts}] ${line}`;
      log.prepend(el);
    }

    function isPaused() {
      return paused;
    }

    return { setState, setStep, setInfo, addLog, isPaused };
  }

  const ui = createUI();

  // ------------------------------
  // Helpers
  // ------------------------------

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  function randomFrom(chars) {
    return chars[Math.floor(Math.random() * chars.length)];
  }

  function randomString(len, chars) {
    let out = '';
    for (let i = 0; i < len; i++) out += randomFrom(chars);
    return out;
  }

  function randomDigits(len) {
    return randomString(len, '0123456789');
  }

  function randomPassword12() {
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const all = lower + upper + digits;

    // Ensure at least 1 of each required class.
    const required = [
      randomFrom(lower),
      randomFrom(upper),
      randomFrom(digits),
    ];

    const rest = randomString(12 - required.length, all).split('');
    const arr = required.concat(rest);

    // Fisher–Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr.join('');
  }

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function setNativeValue(input, value) {
    const proto = Object.getPrototypeOf(input);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) {
      desc.set.call(input, value);
    } else {
      input.value = value;
    }
  }

  function fillInput(input, value) {
    if (!input) return false;
    if (input.disabled || input.readOnly) return false;
    input.focus();
    setNativeValue(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  async function fillInputTwice(getEl, value, delayMs = 140) {
    const el1 = getEl();
    if (el1) fillInput(el1, value);
    // On hydrated React inputs, the value may be reverted on the next microtask / frame.
    await nextFrame();
    if (delayMs) await sleep(delayMs);
    const el2 = getEl();
    if (el2) fillInput(el2, value);
  }

  async function fillInputReliable(getEl, value, {
    timeoutMs = 12000,
    pollMs = 80,
    stableMs = 240,
    stablePollMs = 60,
  } = {}) {
    // Some sites (React-controlled inputs) can wipe the value during late hydration.
    // We retry until the value "sticks" for stableMs.
    const start = now();

    while (now() - start < timeoutMs) {
      if (ui.isPaused()) {
        await sleep(250);
        continue;
      }

      const el = getEl();
      if (!el || !isVisible(el) || el.disabled || el.readOnly) {
        await sleep(pollMs);
        continue;
      }

      fillInput(el, value);
      await sleep(pollMs);

      // Confirm it stuck, even if the element got replaced
      let ok = true;
      const stableStart = now();
      while (now() - stableStart < stableMs) {
        const cur = getEl();
        if (!cur || !isVisible(cur)) { ok = false; break; }
        if ((cur.value ?? '') !== value) { ok = false; break; }
        await sleep(stablePollMs);
      }

      if (ok) return true;
    }

    return false;
  }

  function findInputByLabelText(labelText) {
    // Match label text content -> get associated input via 'for'
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find((l) => (l.textContent || '').trim().toLowerCase() === labelText.toLowerCase());
    if (label) {
      const htmlFor = label.getAttribute('for');
      if (htmlFor) {
        const byId = document.getElementById(htmlFor);
        if (byId && byId.tagName.toLowerCase() === 'input') return byId;
      }
      const nested = label.querySelector('input');
      if (nested) return nested;
    }

    // Try aria-label
    const aria = document.querySelector(`input[aria-label="${CSS.escape(labelText)}"]`);
    if (aria) return aria;

    return null;
  }

  async function waitForElement(getEl, { timeoutMs = 30000, pollMs = 120 } = {}) {
    const start = now();

    while (now() - start < timeoutMs) {
      if (ui.isPaused()) {
        await sleep(250);
        continue;
      }

      const el = getEl();
      if (el && isVisible(el)) return el;
      await sleep(pollMs);
    }

    return null;
  }

  function clickAllCheckboxes(scope = document) {
    const inputBoxes = Array.from(scope.querySelectorAll('input[type="checkbox"]')).filter(isVisible);

    // Some UIs use custom checkboxes (e.g., div[role=checkbox] with aria-checked).
    const roleBoxes = Array.from(scope.querySelectorAll('[role="checkbox"]')).filter(isVisible);

    const all = [...inputBoxes, ...roleBoxes];
    const seen = new Set();

    let clicked = 0;
    for (const box of all) {
      if (seen.has(box)) continue;
      seen.add(box);

      const tag = box.tagName.toLowerCase();
      const shouldClick = tag === 'input'
        ? !box.checked
        : (box.getAttribute('aria-checked') || '').toLowerCase() !== 'true';

      if (!shouldClick) continue;

      // Many React components listen on click.
      box.click();
      clicked++;
    }

    return clicked;
  }

  function findButtonByText(text) {
    const needle = text.trim().toLowerCase();
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));
    const match = buttons.find((b) => {
      const t = (b.textContent || b.value || '').trim().toLowerCase();
      return t === needle || t.includes(needle);
    });
    return match || null;
  }

  function findClickableByText(text) {
    const needle = text.trim().toLowerCase();
    const els = Array.from(document.querySelectorAll('a, button, [role="menuitem"], [role="button"], [data-testid]'));
    const match = els.find((el) => {
      if (!isVisible(el)) return false;
      const t = (el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase();
      return t === needle || t.includes(needle);
    });
    return match || null;
  }

  // ------------------------------
  // Flows
  // ------------------------------

  async function flowJoin() {
    ui.setState('running');
    ui.setStep('join');

    // If the user (or a previous run) already populated the fields, don't overwrite.
    // Still try to satisfy checkboxes / any non-submit interactions.
    const getUsernameEl = () => findInputByLabelText('Username') || document.querySelector('input[name="username"], input#username, input[autocomplete="username"]');
    const getFullNameEl = () => findInputByLabelText('Full name') || findInputByLabelText('Full Name') || document.querySelector('input[name="fullname"], input[name="fullName"], input[name="name"], input#fullName');
    const getPasswordEl = () => findInputByLabelText('Password') || document.querySelector('input[name="password"], input#password, input[type="password"]');

    const existingUsername = (getUsernameEl()?.value || '').trim();
    const existingFullName = (getFullNameEl()?.value || '').trim();
    const existingPassword = (getPasswordEl()?.value || '').trim();

    const alreadyFilled = Boolean(existingUsername && existingFullName && existingPassword);
    if (alreadyFilled) {
      ui.setInfo('fields already filled; checking checkboxes (no submit)');

      // Wait briefly for any checkbox UI to hydrate, then click any unchecked.
      await waitForElement(
        () => document.querySelector('input[type="checkbox"], [role="checkbox"]'),
        { timeoutMs: 12000, pollMs: 80 }
      );

      let clicked = clickAllCheckboxes(document);
      await nextFrame();
      clicked += clickAllCheckboxes(document);
      ui.addLog(`Fields already populated; checked ${clicked} checkbox(es). (Did NOT click Create account)`);
      ui.setInfo('done (no submit)');
      ui.setState('idle');
      return;
    }

    // Fill password
    ui.setInfo('waiting for Password field');
    const passwordInput = await waitForElement(() => {
      return (
        findInputByLabelText('Password') ||
        document.querySelector('input[name="password"], input#password, input[type="password"]')
      );
    });

    if (!passwordInput) {
      ui.addLog('Password input not found (timeout).');
      ui.setState('idle');
      return;
    }

    const password = randomPassword12();
    ui.setInfo('filling Password (verify)');
    const passwordOk = await fillInputReliable(
      () => findInputByLabelText('Password') || document.querySelector('input[name="password"], input#password, input[type="password"]'),
      password,
      { timeoutMs: 20000 }
    );
    ui.addLog(passwordOk ? 'Filled Password (verified).' : 'Tried to fill Password but it did not stick (timeout).');
    ui.setInfo('password filled');

    // Wait for username + full name
    ui.setInfo('waiting for Username + Full name');

    const usernameInput = await waitForElement(() => {
      return (
        findInputByLabelText('Username') ||
        document.querySelector('input[name="username"], input#username, input[autocomplete="username"]')
      );
    }, { timeoutMs: 45000, pollMs: 80 });

    const fullNameInput = await waitForElement(() => {
      return (
        findInputByLabelText('Full name') ||
        findInputByLabelText('Full Name') ||
        document.querySelector('input[name="fullname"], input[name="fullName"], input[name="name"], input#fullName')
      );
    }, { timeoutMs: 45000, pollMs: 80 });

    if (!usernameInput || !fullNameInput) {
      ui.addLog('Username / Full name inputs not found (timeout).');
      ui.setState('idle');
      return;
    }

    // HF usernames often must start with a letter. We'll generate a valid-ish random username.
    const username = `u${randomDigits(15)}`; // 16 chars total, starts with letter
    const fullName = randomDigits(16);

    ui.setInfo('filling Username + Full name');
    await fillInputTwice(
      () => findInputByLabelText('Username') || document.querySelector('input[name="username"], input#username, input[autocomplete="username"]'),
      username,
      500
    );
    ui.addLog(`Filled Username: ${username}`);

    await fillInputTwice(
      () => findInputByLabelText('Full name') || findInputByLabelText('Full Name') || document.querySelector('input[name="fullname"], input[name="fullName"], input[name="name"], input#fullName'),
      fullName,
      500
    );
    ui.addLog(`Filled Full name: ${fullName}`);

    // Click any checkboxes
    ui.setInfo('waiting for checkboxes');
    await waitForElement(
      () => document.querySelector('input[type="checkbox"], [role="checkbox"]'),
      { timeoutMs: 30000, pollMs: 250 }
    );

    await nextFrame();
    let clicked = clickAllCheckboxes(document);
    await sleep(120);
    clicked += clickAllCheckboxes(document);
    ui.addLog(`Checked ${clicked} checkbox(es) found on the page (pass 1+2).`);

    // After checkboxes, click Create account
    ui.setInfo('waiting for Create account button');
    const createAccountBtn = await waitForElement(() => findButtonByText('Create account'), { timeoutMs: 45000 });
    if (!createAccountBtn) {
      ui.addLog('Create account button not found (timeout).');
      ui.setState('idle');
      return;
    }

    if ('disabled' in createAccountBtn && createAccountBtn.disabled) {
      ui.addLog('Create account is disabled; waiting briefly...');
      await sleep(1200);
    }

    ui.addLog('Clicking Create account...');
    createAccountBtn.click();

    ui.setInfo('create account clicked');
    ui.setState('idle');
  }

  async function flowTokenCreate() {
    ui.setState('running');
    ui.setStep('create token');

    ui.setInfo('waiting for Token name');
    const tokenNameInput = await waitForElement(() => {
      return (
        findInputByLabelText('Token name') ||
        document.querySelector('input[name="name"], input#name, input[placeholder*="Token" i]')
      );
    }, { timeoutMs: 45000, pollMs: 80 });

    if (!tokenNameInput) {
      ui.addLog('Token name input not found (timeout).');
      ui.setState('idle');
      return;
    }

    const tokenName = randomString(8, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    ui.setInfo('filling Token name (verify)');
    const tokenOk = await fillInputReliable(
      () => findInputByLabelText('Token name') || document.querySelector('input[name="name"], input#name, input[placeholder*="Token" i]'),
      tokenName,
      { timeoutMs: 25000 }
    );
    ui.addLog(tokenOk ? `Filled Token name (verified): ${tokenName}` : `Tried to fill Token name but it did not stick (timeout): ${tokenName}`);

    // Check all checkboxes (permissions)
    await nextFrame();
    let clicked = clickAllCheckboxes(document);
    ui.addLog(`Checked ${clicked} checkbox(es) (pass 1).`);

    // Some UI renders more permissions after interaction; try again briefly.
    await sleep(160);
    clicked += clickAllCheckboxes(document);
    ui.addLog(`Checked ${clicked} checkbox(es) (pass 1+2 total).`);

    // Click Create token
    ui.setInfo('waiting for Create token button');
    const createBtn = await waitForElement(() => findButtonByText('Create token'), { timeoutMs: 45000 });

    if (!createBtn) {
      ui.addLog('Create token button not found (timeout).');
      ui.setState('idle');
      return;
    }

    if ('disabled' in createBtn && createBtn.disabled) {
      ui.addLog('Create token button is disabled; waiting briefly...');
      await sleep(1500);
    }

    ui.addLog('Clicking Create token...');
    createBtn.click();

    ui.setInfo('create token clicked; waiting for Copy');

    // After token creation, HF shows a token value with a Copy button.
    // Try to click any visible "Copy" button to copy the token to clipboard.
    const copyBtn = await waitForElement(() => findButtonByText('Copy'), { timeoutMs: 45000 });
    if (copyBtn) {
      ui.addLog('Clicking Copy...');
      copyBtn.click();
      ui.setInfo('copy clicked; signing out');

      // Try to click "Sign Out". It may be directly visible or inside the user menu.
      // We'll attempt:
      // 1) direct "Sign Out" link/button
      // 2) open a likely user menu (avatar/button in header)
      // 3) then click "Sign Out" in the menu
      await sleep(120);

      let signOut = findClickableByText('Sign Out') || findClickableByText('Sign out');

      if (!signOut) {
        // Try opening the account/user menu
        const menuCandidates = [
          'button[aria-label*="Account" i]',
          'button[aria-label*="User" i]',
          'button[aria-label*="Profile" i]',
          'button[aria-label*="Menu" i]',
          'header button',
          'nav button',
        ];

        for (const sel of menuCandidates) {
          const btns = Array.from(document.querySelectorAll(sel)).filter(isVisible);
          const btn = btns.find((b) => {
            const t = (b.textContent || b.getAttribute('aria-label') || '').trim().toLowerCase();
            // Prefer buttons that look like profile/avatar/menu
            return t.includes('account') || t.includes('user') || t.includes('profile') || t.includes('menu') || t === '';
          }) || btns[0];

          if (btn) {
            btn.click();
            await sleep(140);
            signOut = findClickableByText('Sign Out') || findClickableByText('Sign out');
            if (signOut) break;
          }
        }
      }

      if (signOut) {
        ui.addLog('Clicking Sign Out...');
        signOut.click();
        ui.setInfo('sign out clicked');
      } else {
        ui.addLog('Sign Out not found (menu may differ).');
        ui.setInfo('sign out not found');
      }
    } else {
      ui.addLog('Copy button not found (timeout).');
      ui.setInfo('no copy button');
    }

    ui.setState('idle');
  }

  // ------------------------------
  // Router
  // ------------------------------

  function hrefIsExactly(url) {
    // Compare origin+pathname for robustness
    try {
      const u = new URL(url);
      return location.origin === u.origin && location.pathname === u.pathname && location.search === u.search;
    } catch {
      return location.href === url;
    }
  }

  async function main() {
    ui.addLog('Script loaded.');

    // If at the homepage, redirect to /join
    if (location.origin === 'https://huggingface.co' && location.pathname === '/') {
      const key = 'hfg_redirect_home_once';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        ui.setState('running');
        ui.setStep('redirect');
        ui.setInfo('redirecting / → /join');
        ui.addLog('Redirecting from homepage to /join...');
        location.replace('https://huggingface.co/join');
        return;
      }
    }

    // If coming from email confirmation suggestions page, redirect to token creation page
    if (
      location.origin === 'https://huggingface.co' &&
      location.pathname === '/organizations/suggestions' &&
      new URLSearchParams(location.search).get('emailConfirmation') === 'true'
    ) {
      const key = 'hfg_redirect_email_confirm_once';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        ui.setState('running');
        ui.setStep('redirect');
        ui.setInfo('redirecting to fine-grained token page');
        ui.addLog('Redirecting to /settings/tokens/new?tokenType=fineGrained ...');
        location.replace('https://huggingface.co/settings/tokens/new?tokenType=fineGrained');
        return;
      }
    }

    // Join flow
    if (location.origin === 'https://huggingface.co' && location.pathname === '/join') {
      await flowJoin();
      return;
    }

    // Token flow
    if (
      location.origin === 'https://huggingface.co' &&
      location.pathname === '/settings/tokens/new' &&
      new URLSearchParams(location.search).get('tokenType')?.toLowerCase() === 'finegrained'
    ) {
      // Avoid creating a token multiple times due to re-renders/navigation.
      const key = 'hfg_token_create_once';
      if (sessionStorage.getItem(key)) {
        ui.addLog('Token create flow already executed once in this tab session; skipping.');
        return;
      }
      sessionStorage.setItem(key, '1');

      await flowTokenCreate();
      return;
    }

    ui.setState('idle');
    ui.setStep('no-op');
    ui.setInfo('no matching page');
  }

  // Run
  main().catch((err) => {
    ui.setState('idle');
    ui.setStep('error');
    ui.setInfo('see console');
    ui.addLog(`Error: ${String(err?.message || err)}`);
    // eslint-disable-next-line no-console
    console.error('[hugging face gooner] error', err);
  });
})();
