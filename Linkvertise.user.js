// ==UserScript==
// @name         Linkvertise Bypass 2025
// @version      2.1
// @match        https://linkvertise.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Redirect /12345/abcde or ?o=sharing → /access/12345/abcde
    if (/^\/\d+\/[^/?]+/.test(location.pathname) && !location.pathname.startsWith('/access')) {
        const parts = location.pathname.match(/^\/(\d+)\/([^/?]+)/);
        const targetUrl = `https://linkvertise.com/access/${parts[1]}/${parts[2]}`;

        // Add status text on top
        const status = document.createElement('div');
        status.style.position = 'fixed';
        status.style.top = '0';
        status.style.left = '0';
        status.style.width = '100%';
        status.style.background = 'yellow';
        status.style.color = 'black';
        status.style.textAlign = 'center';
        status.style.padding = '10px';
        status.style.zIndex = '9999';
        status.textContent = 'Bypassing Linkvertise... Please wait.';
        document.body.appendChild(status);

        // Set your provided localStorage items (cookies stuff)
        const data = {
            accessToken: "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL3B1Ymxpc2hlci5saW5rdmVydGlzZS5jb20vYXBpL3YxL2F1dGgvbG9naW4iLCJpYXQiOjE3NTczNDY0NzgsIm5iZiI6MTc1NzM0NjQ3OCwianRpIjoiVWF4eFBVNXp4SlZxU0xEZyIsInN1YiI6Mzc5MjUwMiwicHJ2IjoiN2IzZmVmNDNmOTgxZTE3Nzc5MGQwMGJkZjQ1M2ZhZGM3NzNmNzI4YyJ9.pT_50ukAibj5NXHHKNqqr9K6Ukr6obK7B1_IcZWUsjQ",
            user_token: "X0Ph7bOT4KCByi11PpnZRaNm5rVVha4sOqB7tpDIoUsWXGlm8xziOLZqkxCqjkZQ",
            subId: "3773872816150989170",
            user_current_location: "pa"
        };

        for (const [k, v] of Object.entries(data)) {
            localStorage.setItem(k, v);
        }

        console.log('[Linkvertise Bypass] LocalStorage set. Waiting 2s before redirect.');

        // Wait 2 seconds, then redirect
        setTimeout(() => {
            console.log('[Linkvertise Bypass] Redirecting to:', targetUrl);
            window.location.replace(targetUrl);
        }, 2000);

        return;
    }

    // Success page auto-click (obfuscation-proof + extra fallbacks)
    if (location.pathname === '/success' || location.pathname.startsWith('/success')) {
        const strongSelectors = [
            'a[target="_blank"][href^="http"]',           // Core: External link in new tab
            'a[rel*="noopener"][href^="http"]',           // Common pair
            'a[href^="http"]:not([href*="linkvertise.com"])', // Any external <a>
            'a[href^="http"]:has-text("Continue")',       // Text-based
            'a[href^="http"]:has-text("Open")',
            'button:has-text("Continue")',                // If it's a button
            'button:has-text("Open")',
            'a[data-testid*="open"]',                     // Data attributes (2025 common)
            'a[class*="btn"], a[class*="button"]',        // Class fallbacks
            'div:has-text("Continue →")'                  // Arrow variants
        ];

        const click = () => {
            for (const sel of strongSelectors) {
                const el = document.querySelector(sel);
                if (el && el.offsetParent !== null && el.getBoundingClientRect().width > 50) { // Visible & sizable
                    console.log('[Linkvertise 2025] Clicking with selector →', sel);
                    el.click();
                    return true;
                }
            }
            return false;
        };

        // Try immediately + watch for changes
        if (click()) return;

        const mo = new MutationObserver(click);
        mo.observe(document.body, { childList: true, subtree: true });

        const interval = setInterval(() => {
            if (click()) {
                clearInterval(interval);
                mo.disconnect();
            }
        }, 600); // Slightly slower for heavy obfuscation/load delays
    }
})();
