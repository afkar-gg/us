// ==UserScript==
// @name         Multi bypass (Linkvertise + Lootlinks + Others)
// @namespace    @afkar
// @version      1.7
// @description  Linkvertise helper + Lootlinks bypass + some other shortlinks
// @match        https://linkvertise.com/*
// @match        https://*.linkvertise.com/*
// @match        https://lootlinks.co/*
// @match        https://loot-links.com/*
// @match        https://loot-link.com/*
// @match        https://linksloot.net/*
// @match        https://lootdest.com/*
// @match        https://lootlink.org/*
// @match        https://lootdest.info/*
// @match        https://lootdest.org/*
// @match        https://links-loot.com/*
// @match        https://bstlar.com/*
// @match        https://rekonise.com/*
// @match        https://mboost.me/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const host = location.hostname;

  // =========================
  // Shared helpers
  // =========================
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function normalizeUrlMaybe(url) {
    if (!url) return null;
    try {
      return new URL(url, location.href).href;
    } catch (_) {
      return String(url);
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

  // =========================
  // 1) Linkvertise helper (fix duplicated click loop)
  // =========================
  function runLinkvertise() {
    // Keep user's LS injection (unchanged)
    ;(() => {
      try {
        const data = {
          accessToken:
            'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3B1Ymxpc2hlci5saW5rdmVydGlzZS5jb20vYXBpL3YxL2F1dGgvbG9naW4iLCJpYXQiOjE3NTczNDY0NzgsIm5iZiI6MTc1NzM0NjQ3OCwianRpIjoiVWF4eFBVNXp4SlZxU0xEZyIsInN1YiI6Mzc5MjUwMiwicHJ2IjoiN2IzZmVmNDNmOTgxZTE3Nzc5MGQwMGJkZjQ1M2ZhZGM3NzNmNzI4YyJ9.pT_50ukAibj5NXHHKNqqr9K6Ukr6obK7B1_IcZWUsjQ',
          user_token: 'X0Ph7bOT4KCByi11PpnZRaNm5rVVha4sOqB7tpDIoUsWXGlm8xziOLZqkxCqjkZQ',
          subId: '3773872816150989170',
          user_current_location: 'pa',
        };
        for (const [k, v] of Object.entries(data)) {
          try {
            localStorage.setItem(k, v);
          } catch (e) {}
        }
      } catch (e) {}
    })();

    const TEXT_GET_LINK = 'get link';
    const TEXT_OPEN = 'open';
    const LOOP_MS = 300;
    const INTERNAL_HOST_RE = /(^|\.)linkvertise\.com$/i;

    const UI_ID = 'lv-auto-ui';
    const ATTR_GENERATED = 'data-lv-generated';

    // Click de-duplication: cooldown by (phase + signature)
    const clickHistory = new Map();
    const DEFAULT_CLICK_COOLDOWN_MS = 4500;

    function signatureForElement(phase, el) {
      const txt = extractVisibleText(el);
      const href = el && el.getAttribute ? el.getAttribute('href') : '';
      const id = el && el.id ? `#${el.id}` : '';
      const cls = el && el.className ? `.${String(el.className).split(/\s+/).slice(0, 3).join('.')}` : '';
      return `${phase}|${el?.tagName || 'EL'}|${txt}|${href || ''}|${id}${cls}`;
    }

    function canClick(key, cooldownMs = DEFAULT_CLICK_COOLDOWN_MS) {
      const now = Date.now();
      const last = clickHistory.get(key) || 0;
      if (now - last < cooldownMs) return false;
      clickHistory.set(key, now);
      return true;
    }

    const state = {
      phase: location.href.includes('/success') ? 'open' : 'get-link',
      found: 0,
      clicked: 0,
      lastAction: 'Initializing…',
      running: true,
      minimized: false,
      done: false,
      waitUntil: 0, // prevents loop-clicking while UI/navigation is updating
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
      ui.querySelector('#lv-state') &&
        (ui.querySelector('#lv-state').textContent = state.done ? 'Link Passed' : state.running ? 'Running' : 'Paused');
      ui.querySelector('#lv-action') && (ui.querySelector('#lv-action').textContent = state.lastAction);
    }

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
      // inputs
      if (el.value) return String(el.value).trim().toLowerCase();
      let t = (el.innerText || '').trim();
      t = t.replace(/\s+/g, ' ').trim().toLowerCase();
      return t;
    }

    function collectCandidates() {
      const candidates = new Set();
      const selectors = ['button', 'a', '[role="button"]', 'input[type="button"]', 'input[type="submit"]', '[onclick]'];
      try {
        document.querySelectorAll(selectors.join(',')).forEach((el) => candidates.add(el));
      } catch (_) {}

      const q = [document.documentElement];
      while (q.length) {
        const node = q.shift();
        const children = Array.from(node.children || []);
        for (const child of children) {
          q.push(child);
          if (child.shadowRoot) {
            try {
              child.shadowRoot.querySelectorAll(selectors.join(',')).forEach((el) => candidates.add(el));
            } catch (_) {}
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
        try {
          el.focus?.({ preventScroll: true });
        } catch (_) {}
        try {
          el.scrollIntoView?.({ behavior: 'auto', block: 'center', inline: 'center' });
        } catch (_) {}
        try {
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, composed: true }));
          el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, composed: true }));
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
        } catch (_) {}
        try {
          el.click?.();
        } catch (_) {}
        return true;
      } catch (_) {
        return false;
      }
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

      try {
        fn();
      } catch (_) {}

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
          try {
            window.open = originalOpen;
          } catch (_) {}
          if (locProto && assignPatched && originalAssign) {
            try {
              Object.defineProperty(locProto, 'assign', {
                configurable: true,
                writable: true,
                value: function (url) {
                  return originalAssign(url);
                },
              });
            } catch (_) {}
          }
          if (locProto && replacePatched && originalReplace) {
            try {
              Object.defineProperty(locProto, 'replace', {
                configurable: true,
                writable: true,
                value: function (url) {
                  return originalReplace(url);
                },
              });
            } catch (_) {}
          }
        }
      });
    }

    mountUI();

    async function tick() {
      if (!state.running || state.done) return;
      if (Date.now() < state.waitUntil) return;

      if (location.href.includes('/success')) state.phase = 'open';

      if (state.phase === 'get-link') {
        const el = findBestByText(TEXT_GET_LINK);
        state.found = el ? 1 : 0;

        if (!el) {
          state.lastAction = `Waiting for "${TEXT_GET_LINK}"…`;
          updateUI();
          return;
        }

        const key = signatureForElement(state.phase, el);
        if (!canClick(key)) {
          state.lastAction = `"${TEXT_GET_LINK}" already clicked (cooldown); waiting…`;
          updateUI();
          return;
        }

        state.lastAction = `Clicking "${TEXT_GET_LINK}"…`;
        updateUI();
        safeClick(el);
        state.clicked++;

        // IMPORTANT: pause loop briefly so it can't double click while the page/UI updates
        state.waitUntil = Date.now() + 2500;
        updateUI();
        return;
      }

      if (state.phase === 'open') {
        const el = findBestByText(TEXT_OPEN);
        state.found = el ? 1 : 0;

        if (!el) {
          state.lastAction = `Waiting for "${TEXT_OPEN}"…`;
          updateUI();
          return;
        }

        const key = signatureForElement(state.phase, el);
        if (!canClick(key)) {
          state.lastAction = `"${TEXT_OPEN}" already clicked (cooldown); waiting…`;
          updateUI();
          return;
        }

        state.clicked++;
        state.lastAction = `Clicking "${TEXT_OPEN}"…`;
        updateUI();

        await withForcedNewTabNavigation(() => {
          safeClick(el);
        }, { timeoutMs: 3500 });

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
  }

  // =========================
  // 2) Lootlinks / Lootlabs bypass (taken from friend's script)
  // =========================
  function runLootlinks() {
    let countdownInterval;

    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap';
    document.head.appendChild(font);

    function createOverlay() {
      let overlay = document.getElementById('kxBypass-overlay');
      if (overlay) return overlay;

      overlay = document.createElement('div');
      overlay.id = 'kxBypass-overlay';
      overlay.style.cssText = `
        position: fixed !important;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(15,15,15,0.96);
        display: flex; flex-direction: column;
        justify-content: center; align-items: center;
        z-index: 2147483647 !important;
        color: white;
        font-family: 'Poppins', sans-serif;
        text-align: center;
      `;

      overlay.innerHTML = `
        <div style="font-size:28px; font-weight:600; margin-bottom:20px;">Bypassing Lootlinks...</div>
        <div style="width:60px;height:60px;border:6px solid rgba(255,255,255,0.2);border-top:6px solid #00c3ff;border-radius:50%;animation:spin 1s linear infinite;"></div>
        <div id="kxBypass-timer" style="margin-top:20px;font-size:18px;">Estimated time left: 60s</div>
      `;
      document.body.appendChild(overlay);

      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
        #kxBypass-overlay button {padding:12px 24px;background:#00c3ff;color:white;border:none;border-radius:8px;font-size:16px;cursor:pointer;transition:background 0.2s;}
        #kxBypass-overlay button:hover {background:#0090c3;}
      `;
      document.head.appendChild(style);

      let seconds = 60;
      const timerEl = overlay.querySelector('#kxBypass-timer');
      countdownInterval = setInterval(() => {
        seconds--;
        if (seconds > 0) {
          timerEl.textContent = `Estimated time left: ${seconds}s`;
          document.title = `⏳ ${seconds}s left`;
        } else {
          timerEl.textContent = 'Almost done...';
          document.title = 'Almost done!';
          clearInterval(countdownInterval);
        }
      }, 1000);

      return overlay;
    }

    function showSuccess(destinationUrl) {
      const overlay = createOverlay();
      clearInterval(countdownInterval);
      document.title = '✅ Bypass Complete';
      overlay.innerHTML = `
        <div style="font-size:28px; font-weight:600; color:#2ecc71; margin-bottom:20px;">Bypass Successful!</div>
        <div style="font-size:16px; margin-bottom:20px; max-width:80%; word-break:break-all;">${destinationUrl}</div>
        <button id="kxBypass-btn">Continue to Link</button>
        <div style="margin-top:10px; font-size:14px; color:#aaa;">Auto redirecting in 3 seconds...</div>
      `;
      overlay.querySelector('#kxBypass-btn').onclick = () => (window.location.href = destinationUrl);
      setTimeout(() => (window.location.href = destinationUrl), 3000);
    }

    function showError(message) {
      const overlay = createOverlay();
      clearInterval(countdownInterval);
      document.title = '❌ Bypass Failed';
      overlay.innerHTML = `
        <div style="font-size:28px; font-weight:600; color:#e74c3c; margin-bottom:20px;">Error Occurred</div>
        <div style="font-size:16px; margin-bottom:20px; max-width:80%; word-break:break-all;">${message}</div>
        <div style="font-size:14px;color:#aaa;">Check console for details</div>
      `;
    }

    // XOR/Base64 decode
    function decodeDestination(encodedString, prefixLength = 5) {
      let decodedString = '';
      const base64Decoded = atob(encodedString);
      const prefix = base64Decoded.substring(0, prefixLength);
      const encodedPortion = base64Decoded.substring(prefixLength);

      for (let i = 0; i < encodedPortion.length; i++) {
        const encodedChar = encodedPortion.charCodeAt(i);
        const prefixChar = prefix.charCodeAt(i % prefix.length);
        const decodedChar = encodedChar ^ prefixChar;
        decodedString += String.fromCharCode(decodedChar);
      }
      return decodedString;
    }

    function handleLootlinks() {
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const [resource] = args;
        const url = typeof resource === 'string' ? resource : resource.url;

        if (url && url.includes('/tc')) {
          try {
            const response = await originalFetch(...args);
            const data = await response.clone().json();

            if (Array.isArray(data) && data.length > 0) {
              const { urid, task_id, action_pixel_url, session_id } = data[0];

              // These are expected to exist on the page; if not, fail gracefully.
              const INCENTIVE_SERVER_DOMAIN = window.INCENTIVE_SERVER_DOMAIN;
              const INCENTIVE_SYNCER_DOMAIN = window.INCENTIVE_SYNCER_DOMAIN;
              const KEY = window.KEY;
              const TID = window.TID;

              if (!INCENTIVE_SERVER_DOMAIN || !INCENTIVE_SYNCER_DOMAIN || !KEY || !TID) {
                console.warn('Missing Lootlinks constants on page:', {
                  INCENTIVE_SERVER_DOMAIN,
                  INCENTIVE_SYNCER_DOMAIN,
                  KEY,
                  TID,
                });
                showError('Missing required Lootlinks constants on the page.');
                return response;
              }

              const shard = parseInt(String(urid).slice(-5), 10) % 3;

              const ws = new WebSocket(
                `wss://${shard}.${INCENTIVE_SERVER_DOMAIN}/c?uid=${urid}&cat=${task_id}&key=${KEY}&session_id=${session_id}&is_loot=1&tid=${TID}`,
              );

              ws.onopen = () => setInterval(() => ws.send('0'), 1000);
              ws.onmessage = (e) => {
                if (typeof e.data === 'string' && e.data.startsWith('r:')) {
                  const encoded = e.data.slice(2);
                  try {
                    const destinationUrl = decodeDestination(encoded);
                    setTimeout(() => showSuccess(destinationUrl), 2000);
                  } catch (err) {
                    console.error('Decryption error:', err);
                    showError('Failed to decrypt URL');
                  }
                }
              };

              // Send beacons and pixel fetches
              try {
                navigator.sendBeacon(`https://${shard}.${INCENTIVE_SERVER_DOMAIN}/st?uid=${urid}&cat=${task_id}`);
              } catch (_) {}
              try {
                fetch(`https:${action_pixel_url}`);
              } catch (_) {}
              try {
                fetch(`https://${INCENTIVE_SYNCER_DOMAIN}/td?ac=auto_complete&urid=${urid}&cat=${task_id}&tid=${TID}`);
              } catch (_) {}
            }

            return response;
          } catch (err) {
            console.error('Bypass fetch error:', err);
            showError('Bypass failed - try again');
            return originalFetch(...args);
          }
        }

        return originalFetch(...args);
      };

      // Prevent popups
      window.open = () => null;
    }

    window.addEventListener('load', () => {
      createOverlay();
      handleLootlinks();
    });
  }

  // =========================
  // 3) Other shorteners (bstlar/rekonise/mboost) from friend's script
  // =========================
  function runOtherShorteners() {
    const modalHTML = `
      <div id="kxBypass-modal">
        <div id="kxBypass-modal-content">
          <h1>kxBypass</h1>
          <p>Bypass result:</p>
          <input type="text" id="kxBypass-link" value="" readonly>
          <button id="kxBypass-redirect">Redirect</button>
          <button id="kxBypass-close">✕</button>
        </div>
      </div>
    `;

    const styleCSS = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
      #kxBypass-modal{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.7);display:flex;justify-content:center;align-items:center;z-index:2147483647;font-family:'Poppins',sans-serif;}
      #kxBypass-modal-content{background:#fff;padding:20px;border-radius:12px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,.2);max-width:420px;width:92%;position:relative;}
      #kxBypass-modal-content h1{font-size:18px;font-weight:600;margin:0 0 10px;color:#333;}
      #kxBypass-modal-content p{font-size:14px;color:#666;margin:0 0 15px;}
      #kxBypass-link{width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;text-align:center;font-size:14px;color:#333;margin-bottom:10px;}
      #kxBypass-modal-content button{width:100%;padding:10px;margin-top:6px;border:none;border-radius:6px;cursor:pointer;font-weight:600;}
      #kxBypass-redirect{background:#3498db;color:#fff;}
      #kxBypass-redirect:hover{background:#2980b9;}
      #kxBypass-close{background:#eee;color:#333;}
    `;

    function showBypassModal(link) {
      const modalContainer = document.createElement('div');
      modalContainer.innerHTML = modalHTML;
      document.body.appendChild(modalContainer);

      const linkInput = document.getElementById('kxBypass-link');
      if (linkInput) linkInput.value = link;

      document.getElementById('kxBypass-redirect').addEventListener('click', () => {
        window.location.href = link;
      });

      document.getElementById('kxBypass-close').addEventListener('click', () => {
        document.getElementById('kxBypass-modal')?.remove();
      });
    }

    function hasCloudflare() {
      const pageText = document.body?.innerText || '';
      const pageHTML = document.documentElement?.innerHTML || '';
      return pageText.includes('Just a moment') || pageHTML.includes('Just a moment');
    }

    function handleBstlar() {
      if (hasCloudflare()) return;

      const path = new URL(window.location.href).pathname.substring(1);

      fetch(`https://bstlar.com/api/link?url=${path}`, {
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'en-US,en;q=0.9',
          authorization: 'null',
          Referer: window.location.href,
          'Referrer-Policy': 'same-origin',
        },
        method: 'GET',
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.tasks && data.tasks.length > 0) {
            const linkId = data.tasks[0].link_id;
            return fetch('https://bstlar.com/api/link-completed', {
              headers: {
                accept: 'application/json, text/plain, */*',
                'content-type': 'application/json;charset=UTF-8',
                authorization: 'null',
                Referer: window.location.href,
                'Referrer-Policy': 'same-origin',
              },
              body: JSON.stringify({ link_id: linkId }),
              method: 'POST',
            });
          }
          throw new Error('No tasks found in response!');
        })
        .then((response) => response.text())
        .then((finalLink) => showBypassModal(finalLink))
        .catch((e) => showBypassModal(`Error: ${String(e?.message || e)}`));
    }

    function handleRekonise() {
      if (hasCloudflare()) return;

      fetch(`https://api.rekonise.com/social-unlocks${location.pathname}/unlock`, {
        headers: {
          accept: 'application/json, text/plain, */*',
          'content-type': 'application/json;charset=UTF-8',
          authorization: 'null',
          Referer: window.location.href,
          'Referrer-Policy': 'same-origin',
        },
        method: 'GET',
      })
        .then((response) => response.json())
        .then((data) => {
          const responseText = JSON.stringify(data);
          const urlMatch = responseText.match(/(https?:\/\/[^\s"]+)/);
          const foundUrl = urlMatch ? urlMatch[0] : null;
          showBypassModal(foundUrl || 'Error: destination not found');
        })
        .catch((e) => showBypassModal(`Error: ${String(e?.message || e)}`));
    }

    function handleMboost() {
      const pageContent = document.documentElement?.outerHTML || '';
      const targetUrlMatches = [...pageContent.matchAll(/"targeturl\\":\\"(https?:\/\/[^\\"]+)/g)];
      if (targetUrlMatches.length === 0) {
        showBypassModal('Could not find destination!');
        return;
      }
      // If multiple found, show the first.
      showBypassModal(targetUrlMatches[0][1]);
    }

    const style = document.createElement('style');
    style.textContent = styleCSS;
    document.head.appendChild(style);

    if (window.location.href.includes('bstlar.com')) handleBstlar();
    else if (window.location.href.includes('rekonise.com/')) handleRekonise();
    else if (window.location.href.includes('mboost.me/')) handleMboost();
  }

  // =========================
  // Dispatch by site
  // =========================
  if (/(^|\.)linkvertise\.com$/i.test(host)) {
    runLinkvertise();
  } else if (
    /(^|\.)(lootlinks\.co|loot-links\.com|loot-link\.com|linksloot\.net|lootdest\.com|lootlink\.org|lootdest\.info|lootdest\.org|links-loot\.com)$/i.test(
      host,
    )
  ) {
    runLootlinks();
  } else if (/^(bstlar\.com|rekonise\.com|mboost\.me)$/i.test(host)) {
    runOtherShorteners();
  }
})();
