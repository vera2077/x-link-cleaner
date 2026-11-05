// ==UserScript==
// @name         Twitter/X Link Cleaner
// @namespace    https://greasyfork.org/en/scripts/twitter-x-link-cleaner
// @version      3.0.0
// @description  Strips tracking parameters from X/Twitter links, and lets you choose the base domain they are copied with (fixvx, fxtwitter, vxtwitter, or your own).
// @author       birbium
// @license      MIT
// @match        https://x.com/*
// @match        https://twitter.com/*
// @match        https://mobile.twitter.com/*
// @match        https://m.twitter.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  const KEY_ENABLED = 'xlc_enabled';
  const KEY_BASE = 'xlc_baseDomain';
  const SOURCE_HOSTS = ['x.com', 'twitter.com'];
  const SAMPLE_URL = 'https://x.com/jack/status/20?s=20&t=Gv3Fy2Xb';
  const PANEL_HOST_ID = 'xlc-panel-host';

  const PRESETS = [
    { label: 'Original', value: '' },
    { label: 'fixvx', value: 'fixvx.com' },
    { label: 'fxtwitter', value: 'fxtwitter.com' },
    { label: 'vxtwitter', value: 'vxtwitter.com' },
  ];

  // ---------------------------------------------------------------- storage

  function getValue(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') {
        const v = GM_getValue(key, fallback);
        return v === undefined || v === null ? fallback : v;
      }
    } catch (e) { /* fall through */ }
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function setValue(key, value) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(key, value);
        return;
      }
    } catch (e) { /* fall through */ }
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------- url logic

  function normalizeBase(value) {
    if (!value) return '';
    let host = String(value).trim().toLowerCase();
    host = host.replace(/^[a-z]+:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!host) return '';
    if (!host.includes('.')) host += '.com';
    return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(host) ? host : '';
  }

  function isValidBase(value) {
    if (!String(value || '').trim()) return true;
    return normalizeBase(value) !== '';
  }

  const state = {
    enabled: getValue(KEY_ENABLED, true) !== false,
    baseDomain: normalizeBase(getValue(KEY_BASE, '')),
  };

  function cleanXUrl(url) {
    try {
      const urlObj = new URL(url, window.location.href);
      const host = urlObj.hostname
        .replace(/^www\./, '')
        .replace(/^mobile\./, '')
        .replace(/^m\./, '');
      if (!SOURCE_HOSTS.includes(host)) return url;
      urlObj.search = '';
      if (state.baseDomain) urlObj.hostname = state.baseDomain;
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }

  function cleanText(text) {
    if (!text) return text;
    return text.replace(
      /https?:\/\/(?:(?:www|mobile|m)\.)?(?:x|twitter)\.com\/[^\s"')]+/g,
      (match) => cleanXUrl(match)
    );
  }

  // ----------------------------------------------------------- copy helpers

  function copyToClipboard(text) {
    try {
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(text, 'text');
        return;
      }
    } catch (e) { /* fall through */ }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    ta.remove();
  }

  // ---------------------------------------------------------------- tracking

  let trackedTweetUrl = null;

  function isCopyLinkButton(el) {
    if (!el || !el.getAttribute) return false;
    const aria = (el.getAttribute('aria-label') || '').toLowerCase();
    const text = (el.textContent || '').trim().toLowerCase();
    const cls = String(el.className || '').toLowerCase();
    const testid = (el.getAttribute('data-testid') || '').toLowerCase();
    return (
      aria.includes('copy link') ||
      text.includes('copy link') ||
      cls.includes('copy-link') ||
      cls.includes('copylink') ||
      testid.includes('copy-link') ||
      testid.includes('copylink')
    );
  }

  function isMenuTrigger(el) {
    const btn = el.closest && el.closest('button');
    if (!btn) return false;
    const article = btn.closest('article');
    if (!article) return false;
    if (btn.closest('[role="menu"]')) return false;
    return true;
  }

  document.addEventListener('click', (e) => {
    const el = e.target;
    if (!el || !el.closest) return;

    if (isCopyLinkButton(el)) {
      if (!state.enabled || !trackedTweetUrl) return;
      const cleanUrl = cleanXUrl(trackedTweetUrl);
      setTimeout(() => {
        copyToClipboard(cleanUrl);
        showToast('Link cleaned');
      }, 50);
      return;
    }

    if (isMenuTrigger(el)) {
      const article = el.closest('article');
      const statusLink = article ? article.querySelector('a[href*="/status/"]') : null;
      if (statusLink) {
        trackedTweetUrl = statusLink.getAttribute('href') || null;
      }
    }
  }, { capture: true });

  document.addEventListener('copy', (e) => {
    if (!state.enabled) return;
    const data = e.clipboardData && e.clipboardData.getData('text/plain');
    if (!data) return;
    const cleaned = cleanText(data);
    if (cleaned !== data) {
      e.clipboardData.setData('text/plain', cleaned);
      showToast('Link cleaned');
    }
  });

  // ------------------------------------------------------------------ toast

  let toastTimer = null;

  function showToast(message) {
    let toast = document.getElementById('xlc-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'xlc-toast';
      toast.style.cssText = [
        'position:fixed', 'right:18px', 'bottom:18px', 'z-index:2147483647',
        'padding:9px 14px', 'border-radius:999px',
        'background:rgba(15,20,25,0.95)', 'color:#e7e9ea',
        'font:600 12px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
        'border:1px solid #2a3441', 'box-shadow:0 6px 20px rgba(0,0,0,0.35)',
        'opacity:0', 'transform:translateY(6px)',
        'transition:opacity .16s ease,transform .16s ease',
        'pointer-events:none', 'max-width:70vw',
      ].join(';');
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
    }, 1200);
  }

  // ------------------------------------------------------------- settings UI

  const PANEL_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    .backdrop {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px); z-index: 2147483646;
      animation: fade .14s ease;
    }
    .panel {
      position: fixed; z-index: 2147483647;
      top: 50%; left: 50%; transform: translate(-50%, -50%);
      width: 340px; max-width: calc(100vw - 32px);
      max-height: calc(100vh - 48px); overflow-y: auto;
      background: #0f1419; color: #e7e9ea;
      border: 1px solid #2a3441; border-radius: 16px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
      font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      animation: pop .16s ease;
    }
    @keyframes fade { from { opacity: 0 } }
    @keyframes pop { from { opacity: 0; transform: translate(-50%, -48%) scale(.98) } }
    .head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 15px 16px 13px; border-bottom: 1px solid #2a3441;
    }
    .head h2 { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
    .head h2 span { color: #1d9bf0; }
    .close {
      width: 26px; height: 26px; padding: 0; border: 0; border-radius: 8px;
      background: transparent; color: #8b98a5; cursor: pointer;
      font-size: 17px; line-height: 1;
    }
    .close:hover { background: #1e2630; color: #e7e9ea; }
    .body { display: flex; flex-direction: column; gap: 15px; padding: 16px; }
    .row {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px; background: #171d23; border: 1px solid #2a3441; border-radius: 12px;
      cursor: pointer;
    }
    .row-text { display: flex; flex-direction: column; }
    .row-text strong { font-size: 13px; font-weight: 600; }
    .row-text small { color: #8b98a5; font-size: 11px; }
    .row input[type="checkbox"] {
      appearance: none; -webkit-appearance: none; position: relative; flex: 0 0 auto;
      width: 40px; height: 23px; margin: 0; border-radius: 999px;
      background: #1e2630; border: 1px solid #2a3441; cursor: pointer;
      transition: background .18s ease, border-color .18s ease;
    }
    .row input[type="checkbox"]::after {
      content: ""; position: absolute; top: 2px; left: 2px;
      width: 17px; height: 17px; border-radius: 50%; background: #8b98a5;
      transition: transform .18s ease, background .18s ease;
    }
    .row input[type="checkbox"]:checked { background: #1d9bf0; border-color: #1d9bf0; }
    .row input[type="checkbox"]:checked::after { transform: translateX(17px); background: #fff; }
    .field { display: flex; flex-direction: column; gap: 7px; }
    .field > label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .06em; color: #8b98a5;
    }
    .input {
      display: flex; align-items: stretch; overflow: hidden;
      background: #171d23; border: 1px solid #2a3441; border-radius: 12px;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .input:focus-within { border-color: #1d9bf0; box-shadow: 0 0 0 3px rgba(29,155,240,.14); }
    .input .prefix {
      display: flex; align-items: center; padding-left: 12px; color: #8b98a5;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 12px;
      user-select: none;
    }
    .input input {
      flex: 1; min-width: 0; padding: 10px 12px 10px 4px;
      background: transparent; border: 0; outline: none; color: #e7e9ea;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 12px;
    }
    .input input::placeholder { color: #556270; }
    .hint { margin: 0; font-size: 11px; color: #8b98a5; }
    .presets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: -7px; }
    .preset {
      padding: 5px 10px; background: #171d23; border: 1px solid #2a3441;
      border-radius: 999px; color: #8b98a5; font-size: 11px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      transition: color .15s ease, border-color .15s ease, background .15s ease;
    }
    .preset:hover { color: #e7e9ea; border-color: #3b4a5c; }
    .preset.active { color: #1d9bf0; border-color: #1d9bf0; background: rgba(29,155,240,.14); }
    .preview {
      display: flex; flex-direction: column; gap: 6px; padding: 11px 12px;
      background: #171d23; border: 1px solid #2a3441; border-radius: 12px;
    }
    .preview > span {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .06em; color: #8b98a5;
    }
    .preview code {
      display: block; overflow-wrap: anywhere; color: #e7e9ea;
      font-family: ui-monospace, "Cascadia Code", Consolas, monospace; font-size: 11.5px;
    }
    .preview em { color: #1d9bf0; font-style: normal; }
    .foot {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      padding: 10px 16px; border-top: 1px solid #2a3441;
    }
    .status { font-size: 11px; color: #8b98a5; transition: color .15s ease; }
    .status.saved { color: #00ba7c; }
    .reset {
      padding: 5px 9px; background: transparent; border: 0; border-radius: 6px;
      color: #8b98a5; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
    }
    .reset:hover { color: #e7e9ea; background: #1e2630; }
    .disabled .field, .disabled .presets, .disabled .preview { opacity: .45; pointer-events: none; }
  `;

  const PANEL_HTML = `
    <style>${PANEL_CSS}</style>
    <div class="backdrop"></div>
    <div class="panel" role="dialog" aria-modal="true" aria-label="X Link Cleaner settings">
      <div class="head">
        <h2>X Link Cleaner <span>v3.0</span></h2>
        <button class="close" type="button" aria-label="Close">&#10005;</button>
      </div>
      <div class="body">
        <label class="row">
          <span class="row-text">
            <strong>Clean copied links</strong>
            <small>Strip tracking parameters automatically</small>
          </span>
          <input class="enabled" type="checkbox" role="switch">
        </label>
        <div class="field">
          <label for="xlc-base">Base domain</label>
          <div class="input">
            <span class="prefix">https://</span>
            <input id="xlc-base" class="base" type="text" inputmode="url"
                   spellcheck="false" autocomplete="off" placeholder="x.com">
          </div>
          <p class="hint">Leave empty to keep the original x.com / twitter.com domain.</p>
        </div>
        <div class="presets"></div>
        <div class="preview">
          <span>Preview</span>
          <code></code>
        </div>
      </div>
      <div class="foot">
        <span class="status">Changes save automatically</span>
        <button class="reset" type="button">Reset</button>
      </div>
    </div>
  `;

  let statusTimer = null;

  function buildPanel() {
    const host = document.createElement('div');
    host.id = PANEL_HOST_ID;
    host.style.cssText = 'all:initial;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = PANEL_HTML;

    const panel = root.querySelector('.panel');
    const body = root.querySelector('.body');
    const enabledEl = root.querySelector('.enabled');
    const baseEl = root.querySelector('.base');
    const previewEl = root.querySelector('.preview code');
    const statusEl = root.querySelector('.status');
    const presetsEl = root.querySelector('.presets');
    const resetEl = root.querySelector('.reset');

    const presetButtons = PRESETS.map((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset';
      btn.textContent = p.label;
      btn.addEventListener('click', () => {
        baseEl.value = p.value;
        render();
        persist();
        baseEl.focus();
      });
      presetsEl.appendChild(btn);
      return { btn, value: p.value };
    });

    function setStatus(text, saved) {
      statusEl.textContent = text;
      statusEl.classList.toggle('saved', Boolean(saved));
      clearTimeout(statusTimer);
      if (saved) {
        statusTimer = setTimeout(() => {
          statusEl.textContent = 'Changes save automatically';
          statusEl.classList.remove('saved');
        }, 1600);
      }
    }

    function renderPreview() {
      const base = normalizeBase(baseEl.value);
      const url = new URL(SAMPLE_URL);
      url.search = '';
      if (base) url.hostname = base;
      const href = url.toString();

      previewEl.textContent = '';
      const index = base ? href.indexOf(base) : -1;
      if (index === -1) {
        previewEl.textContent = href;
        return;
      }
      const accent = document.createElement('em');
      accent.textContent = base;
      previewEl.append(
        document.createTextNode(href.slice(0, index)),
        accent,
        document.createTextNode(href.slice(index + base.length))
      );
    }

    function render() {
      const enabled = enabledEl.checked;
      body.classList.toggle('disabled', !enabled);
      const valid = isValidBase(baseEl.value);
      baseEl.setAttribute('aria-invalid', valid ? 'false' : 'true');
      baseEl.style.color = valid ? '' : '#f4212e';
      renderPreview();

      const current = normalizeBase(baseEl.value);
      for (const { btn, value } of presetButtons) {
        btn.classList.toggle('active', current === value);
      }
    }

    function persist() {
      state.enabled = enabledEl.checked;
      state.baseDomain = normalizeBase(baseEl.value);
      setValue(KEY_ENABLED, state.enabled);
      setValue(KEY_BASE, state.baseDomain);
      setStatus('Saved', true);
    }

    enabledEl.checked = state.enabled;
    baseEl.value = state.baseDomain;
    render();

    enabledEl.addEventListener('change', () => { render(); persist(); });
    baseEl.addEventListener('input', () => { render(); persist(); });

    resetEl.addEventListener('click', () => {
      enabledEl.checked = true;
      baseEl.value = '';
      render();
      persist();
      setStatus('Reset to defaults', true);
    });

    function close() {
      host.remove();
      document.removeEventListener('keydown', onKey, true);
    }

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    }

    root.querySelector('.close').addEventListener('click', close);
    root.querySelector('.backdrop').addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);

    panel.addEventListener('click', (e) => e.stopPropagation());

    return host;
  }

  function openSettings() {
    const existing = document.getElementById(PANEL_HOST_ID);
    if (existing) existing.remove();
    document.body.appendChild(buildPanel());
  }

  // ------------------------------------------------------------ menu wiring

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('X Link Cleaner settings', openSettings);
    GM_registerMenuCommand('Toggle link cleaning', () => {
      state.enabled = !state.enabled;
      setValue(KEY_ENABLED, state.enabled);
      showToast(state.enabled ? 'Link cleaning on' : 'Link cleaning off');
    });
  }

  if (typeof GM_getValue !== 'function') {
    console.warn('[X Link Cleaner] No userscript manager detected; settings panel is unavailable.');
  }
})();
