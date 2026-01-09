// ==UserScript==
// @name         Linkvertise bypass pro
// @namespace    @afkar
// @version      1.6
// @description  Fire
// @match        https://linkvertise.com/*
// @match        https://*.linkvertise.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  ;(() => {
    try {
      const data = {
        accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3B1Ymxpc2hlci5saW5rdmVydGlzZS5jb20vYXBpL3YxL2F1dGgvbG9naW4iLCJpYXQiOjE3NTczNDY0NzgsIm5iZiI6MTc1NzM0NjQ3OCwianRpIjoiVWF4eFBVNXp4SlZxU0xEZyIsInN1YiI6Mzc5MjUwMiwicHJ2IjoiN2IzZmVmNDNmOTgxZTE3Nzc5MGQwMGJkZjQ1M2ZhZGM3NzNmNzI4YyJ9.pT_50ukAibj5NXHHKNqqr9K6Ukr6obK7B1_IcZWUsjQ",
        user_token: "X0Ph7bOT4KCByi11PpnZRaNm5rVVha4sOqB7tpDIoUsWXGlm8xziOLZqkxCqjkZQ",
        subId: "3773872816150989170",
        user_current_location: "pa"
      };
      for (const [k, v] of Object.entries(data)) {
        try { localStorage.setItem(k, v); } catch (e) {}
      }
    } catch (e) {}
  })();

  const TEXT_GET_LINK = 'get link';
  const TEXT_OPEN = 'open';
  const LOOP_MS = 300;
  const INTERNAL_HOST_RE = /(^|\.)linkvertise\.com$/i;

  const UI_ID = 'lv-auto-ui';
  const ATTR_GENERATED = 'data-lv-generated';

  const state = {
    phase: location.href.includes('/success') ? 'open' : 'get-link',
    found: 0,
    clicked: 0,
    lastAction: 'Initializing…',
    running: true,
    minimized: false,
    done: false,
  };

  function mountUI() {
    if (document.getElementById(UI_ID)) return;

    const ui = document.createElement('div');
    ui.id = UI_ID;
    ui.setAttribute(ATTR_GENERATED, '1');

    ui.innerHTML = `
      <style>
        #${UI_ID}{position:fixed;right:14px;top:14px;z-index:2147483647;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#eaf4ff;user-select:none}
        #${UI_ID} *{box-sizing:border-box}
        #${UI_ID} .card{width:320px;border-radius:12px;background:linear-gradient(180deg, rgba(6,18,34,.95), rgba(3,12,20,.95));border:1px solid rgba(255,255,255,.06);box-shadow:0 16px 40px rgba(2,6,23,.7);overflow:hidden;backdrop-filter: blur(6px)}
        #${UI_ID} .hdr{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.06)}
        #${UI_ID} .title{display:flex;align-items:center;gap:10px;font-weight:700;font-size:13px;letter-spacing:.2px}
        #${UI_ID} .dot{width:10px;height:10px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.12)}
        #${UI_ID}[data-stopped="1"] .dot{background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,.12)}
        #${UI_ID}[data-done="1"] .dot{background:#60a5fa;box-shadow:0 0 0 4px rgba(96,165,250,.12)}
        #${UI_ID} .btns{display:flex;gap:8px;align-items:center}
        #${UI_ID} button{all:unset;cursor:pointer;padding:6px 10px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07);font-size:12px;font-weight:700}
        #${UI_ID} button:hover{background:rgba(255,255,255,.10)}
        #${UI_ID} .body{padding:10px 12px}
        #${UI_ID} .grid{display:grid;grid-template-columns: 1fr 1fr;gap:8px;margin-bottom:10px}
        #${UI_ID} .pill{padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.06)}
        #${UI_ID} .k{font-size:11px;color:rgba(234,244,255,.72)}
        #${UI_ID} .v{font-size:13px;font-weight:800;margin-top:2px}
        #${UI_ID} .action{padding:8px 10px;border-radius:10px;background:rgba(96,165,250,.10);border:1px solid rgba(96,165,250,.20);color:#dcebff;font-size:12px;line-height:1.3;word-break:break-word}
        #${UI_ID} .hint{margin-top:10px;font-size:11px;color:rgba(234,244,255,.62)}
        #${UI_ID}.min .body{display:none}
      </style>
      <div class="card" role="status" aria-live="polite">
        <div class="hdr">
          <div class="title"><span class="dot"></span><span>Linkvertise helper</span></div>
          <div class="btns">
            <button type="button" id="lv-min" title="Minimize">–</button>
            <button type="button" id="lv-close" title="Hide">×</button>
          </div>
        </div>
        <div class="body">
          <div class="grid">
            <div class="pill"><div class="k">Phase</div><div class="v" id="lv-phase">-</div></div>
            <div class="pill"><div class="k">Clicks</div><div class="v" id="lv-clicks">0</div></div>
            <div class="pill"><div class="k">Found</div><div class="v" id="lv-found">0</div></div>
            <div class="pill"><div class="k">State</div><div class="v" id="lv-state">Running</div></div>
          </div>
          <div class="action" id="lv-action">…</div>
          <div class="hint">Hotkey: <b>Esc</b> toggles pause/resume.</div>
        </div>
      </div>
    `;

    document.documentElement.appendChild(ui);

    ui.querySelector('#lv-min')?.addEventListener('click', () => {
      state.minimized = !state.minimized;
      ui.classList.toggle('min', state.minimized);
    });

    ui.querySelector('#lv-close')?.addEventListener('click', () => {
      ui.remove();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        state.running = !state.running;
        updateUI();
      }
    });

    updateUI();
  }

  function updateUI() {
    const ui = document.getElementById(UI_ID);
    if (!ui) return;

    ui.dataset.stopped = state.running ? '0' : '1';
    ui.dataset.done = state.done ? '1' : '0';

    ui.querySelector('#lv-phase') && (ui.querySelector('#lv-phase').textContent = state.phase);
    ui.querySelector('#lv-clicks') && (ui.querySelector('#lv-clicks').textContent = String(state.clicked));
    ui.querySelector('#lv-found') && (ui.querySelector('#lv-found').textContent = String(state.found));
    ui.querySelector('#lv-state') && (ui.querySelector('#lv-state').textContent = state.done ? 'Link Passed' : (state.running ? 'Running' : 'Paused'));
    ui.querySelector('#lv-action') && (ui.querySelector('#lv-action').textContent = state.lastAction);
  }

  mountUI();

  function isGenerated(el) {
    return !!(el && el.closest && el.closest(`[${ATTR_GENERATED}]`));
  }

  function isVisible(el) {
    if (!(el instanceof Element)) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect?.();
    if (!rect || rect.width < 6 || rect.height < 6) return false;
    return true;
  }

  function extractVisibleText(el) {
    if (!el) return '';
    const attrs = ['aria-label', 'title'];
    for (const a of attrs) {
      const v = el.getAttribute?.(a);
      if (v) return v.trim().toLowerCase();
    }
    if (el.value) return String(el.value).trim().toLowerCase();
    let t = (el.innerText || '').trim();
    t = t.replace(/\s+/g, ' ').trim().toLowerCase();
    return t;
  }

  function collectCandidates() {
    const candidates = new Set();
    const selectors = ['button', 'a', '[role="button"]', 'input[type="button"]', 'input[type="submit"]', '[onclick]'];
    try { document.querySelectorAll(selectors.join(',')).forEach((el) => candidates.add(el)); } catch (_) {}

    const q = [document.documentElement];
    while (q.length) {
      const node = q.shift();
      const children = Array.from(node.children || []);
      for (const child of children) {
        q.push(child);
        if (child.shadowRoot) {
          try { child.shadowRoot.querySelectorAll(selectors.join(',')).forEach((el) => candidates.add(el)); } catch (_) {}
          Array.from(child.shadowRoot.children || []).forEach((c) => q.push(c));
        }
      }
    }

    const ui = document.getElementById(UI_ID);
    return Array.from(candidates).filter((el) => el && !isGenerated(el) && !(ui && ui.contains(el)));
  }

  function findBestByText(targetText) {
    const norm = String(targetText).trim().toLowerCase();
    const candidates = collectCandidates().filter(isVisible);

    const matches = [];
    for (const el of candidates) {
      const text = extractVisibleText(el);
      if (!text) continue;
      if (text === norm || text.startsWith(norm) || (norm.length <= 6 && text.includes(norm))) matches.push(el);
    }
    if (!matches.length) return null;

    let best = matches[0];
    let bestTop = best.getBoundingClientRect().top;
    for (const m of matches) {
      const top = m.getBoundingClientRect().top;
      if (top < bestTop) {
        best = m;
        bestTop = top;
      }
    }
    return best;
  }

  function safeClick(el) {
    if (!el) return false;
    try {
      try { el.focus?.({ preventScroll: true }); } catch (_) {}
      try { el.scrollIntoView?.({ behavior: 'auto', block: 'center', inline: 'center' }); } catch (_) {}
      try {
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, composed: true }));
        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
      } catch (_) {}
      try { el.click?.(); } catch (_) {}
      return true;
    } catch (_) {
      return false;
    }
  }

  function normalizeUrlMaybe(url) {
    if (!url) return null;
    try { return new URL(url, location.href).href; } catch (_) { return String(url); }
  }

  function isLikelyFinalUrl(url) {
    try {
      const u = new URL(url, location.href);
      if (!u.protocol.startsWith('http')) return false;
      if (INTERNAL_HOST_RE.test(u.hostname)) return false;
      return true;
    } catch (_) {
      return typeof url === 'string' && url.startsWith('http');
    }
  }

  function openInNewTab(url) {
    const u = normalizeUrlMaybe(url);
    if (!u) return false;
    try {
      const a = document.createElement('a');
      a.href = u;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (_) {}

    try {
      window.open(u, '_blank', 'noopener,noreferrer');
      return true;
    } catch (_) {}

    return false;
  }

  function withForcedNewTabNavigation(fn, opts = {}) {
    const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 2500;
    const originalOpen = window.open;
    const loc = window.location;
    const locProto = Object.getPrototypeOf(loc);
    const originalAssign = locProto?.assign ? locProto.assign.bind(loc) : null;
    const originalReplace = locProto?.replace ? locProto.replace.bind(loc) : null;
    let assignPatched = false;
    let replacePatched = false;
    let resolved = false;
    let capturedUrl = null;
    function capture(url) {
      const u = normalizeUrlMaybe(url);
      if (u && isLikelyFinalUrl(u)) capturedUrl = u;
    }
    try {
      window.open = function patchedOpen(url, target, features) {
        capture(url);
        const u = normalizeUrlMaybe(url);
        if (u && isLikelyFinalUrl(u)) {
          openInNewTab(u);
          return null;
        }
        return originalOpen.call(window, url, target || '_blank', features);
      };
    } catch (_) {}
    if (locProto && originalAssign) {
      try {
        Object.defineProperty(locProto, 'assign', {
          configurable: true,
          writable: true,
          value: function patchedAssign(url) {
            capture(url);
            const u = normalizeUrlMaybe(url);
            if (u && isLikelyFinalUrl(u)) {
              openInNewTab(u);
              return;
            }
            return originalAssign(url);
          },
        });
        assignPatched = true;
      } catch (_) {}
    }
    if (locProto && originalReplace) {
      try {
        Object.defineProperty(locProto, 'replace', {
          configurable: true,
          writable: true,
          value: function patchedReplace(url) {
            capture(url);
            const u = normalizeUrlMaybe(url);
            if (u && isLikelyFinalUrl(u)) {
              openInNewTab(u);
              return;
            }
            return originalReplace(url);
          },
        });
        replacePatched = true;
      } catch (_) {}
    }
    try { fn(); } catch (_) {}
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const t = setInterval(() => {
        if (resolved) return;
        if (capturedUrl) {
          resolved = true;
          cleanup();
          resolve({ capturedUrl, timedOut: false });
          return;
        }
        if (Date.now() - startedAt > timeoutMs) {
          resolved = true;
          cleanup();
          resolve({ capturedUrl: null, timedOut: true });
        }
      }, 50);
      function cleanup() {
        clearInterval(t);
        try { window.open = originalOpen; } catch (_) {}
        if (locProto && assignPatched && originalAssign) {
          try {
            Object.defineProperty(locProto, 'assign', {
              configurable: true,
              writable: true,
              value: function (url) { return originalAssign(url); },
            });
          } catch (_) {}
        }
        if (locProto && replacePatched && originalReplace) {
          try {
            Object.defineProperty(locProto, 'replace', {
              configurable: true,
              writable: true,
              value: function (url) { return originalReplace(url); },
            });
          } catch (_) {}
        }
      }
    });
  }

  const clickedSet = new WeakSet();

  async function tick() {
    if (!state.running || state.done) return;
    if (location.href.includes('/success')) state.phase = 'open';
    if (state.phase === 'get-link') {
      const el = findBestByText(TEXT_GET_LINK);
      state.found = el ? 1 : 0;
      if (el && !clickedSet.has(el)) {
        state.lastAction = `Clicking "${TEXT_GET_LINK}"…`;
        updateUI();
        safeClick(el);
        clickedSet.add(el);
        state.clicked++;
      } else if (!el) {
        state.lastAction = `Waiting for "${TEXT_GET_LINK}"…`;
      } else {
        state.lastAction = `"${TEXT_GET_LINK}" already clicked; waiting…`;
      }
      updateUI();
      return;
    }
    if (state.phase === 'open') {
      const el = findBestByText(TEXT_OPEN);
      state.found = el ? 1 : 0;
      if (el && !clickedSet.has(el)) {
        clickedSet.add(el);
        state.clicked++;
        state.lastAction = `Clicking "${TEXT_OPEN}"…`;
        updateUI();
        const { capturedUrl } = await withForcedNewTabNavigation(() => {
          safeClick(el);
        }, { timeoutMs: 3500 });
        state.lastAction = 'Link Passed';
        state.done = true;
        updateUI();
        return;
      }
      if (!el) {
        state.lastAction = `Waiting for "${TEXT_OPEN}"…`;
        updateUI();
        return;
      }
      state.lastAction = 'Link Passed';
      state.done = true;
      updateUI();
    }
  }

  state.lastAction = 'Auto-running…';
  updateUI();

  let busy = false;
  const timer = setInterval(() => {
    if (busy) return;
    busy = true;
    Promise.resolve(tick())
      .catch((e) => {
        state.lastAction = `Error: ${String(e?.message || e)}`;
        updateUI();
      })
      .finally(() => {
        busy = false;
      });
    if (state.done) clearInterval(timer);
  }, LOOP_MS);
})();
