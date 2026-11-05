(function () {
  'use strict';

  const SOURCE_HOSTS = ['x.com', 'twitter.com'];
  const DEFAULTS = { enabled: true, baseDomain: '' };

  let config = { enabled: true, baseDomain: '' };

  function normalizeBase(value) {
    if (!value) return '';
    let host = String(value).trim().toLowerCase();
    host = host.replace(/^[a-z]+:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
    if (!host) return '';
    if (!host.includes('.')) host += '.com';
    return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(host) ? host : '';
  }

  function hasStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
  }

  function loadConfig() {
    return new Promise((resolve) => {
      if (!hasStorage()) return resolve(config);
      try {
        chrome.storage.sync.get(DEFAULTS, (stored) => {
          if (chrome.runtime && chrome.runtime.lastError) return resolve(config);
          config = {
            enabled: stored.enabled !== false,
            baseDomain: normalizeBase(stored.baseDomain)
          };
          resolve(config);
        });
      } catch {
        resolve(config);
      }
    });
  }

  const configReady = loadConfig();

  if (hasStorage() && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync') return;
      if (changes.enabled) config.enabled = changes.enabled.newValue !== false;
      if (changes.baseDomain) config.baseDomain = normalizeBase(changes.baseDomain.newValue);
    });
  }

  function cleanXUrl(url) {
    try {
      const urlObj = new URL(url, window.location.href);
      const host = urlObj.hostname
        .replace(/^www\./, '')
        .replace(/^mobile\./, '')
        .replace(/^m\./, '');
      if (!SOURCE_HOSTS.includes(host)) return url;
      urlObj.search = '';
      if (config.baseDomain) urlObj.hostname = config.baseDomain;
      return urlObj.toString();
    } catch {
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

  function isCopyLinkButton(el) {
    if (!el) return false;
    const aria   = (el.getAttribute('aria-label')  || '').toLowerCase();
    const text   = (el.textContent || '').trim().toLowerCase();
    const cls    = String(el.className || '').toLowerCase();
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

  let trackedTweetUrl = null;

  function isMenuTrigger(el) {
    const btn = el.closest('button');
    if (!btn) return false;
    const article = btn.closest('article');
    if (!article) return false;
    if (btn.closest('[role="menu"]')) return false;
    return true;
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const div = document.createElement('div');
    div.textContent = text;
    document.body.appendChild(div);
    const range = document.createRange();
    range.selectNodeContents(div);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    try { document.execCommand('copy'); } catch { }
    sel.removeAllRanges();
    div.remove();
  }

  document.addEventListener('click', (e) => {
    const el = e.target;
    if (!el) return;

    if (isCopyLinkButton(el)) {
      configReady.then(() => {
        if (!config.enabled) return;
        if (!trackedTweetUrl) return;
        const cleanUrl = cleanXUrl(trackedTweetUrl);
        setTimeout(() => {
          copyToClipboard(cleanUrl);
        }, 50);
      });
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
    if (!config.enabled) return;
    const data = e.clipboardData && e.clipboardData.getData('text/plain');
    if (!data) return;
    const cleaned = cleanText(data);
    if (cleaned !== data) {
      e.clipboardData.setData('text/plain', cleaned);
    }
  });
})();
