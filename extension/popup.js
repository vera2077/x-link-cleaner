'use strict';

const DEFAULTS = { enabled: true, baseDomain: '' };

const enabledEl = document.getElementById('enabled');
const baseEl = document.getElementById('baseDomain');
const previewEl = document.getElementById('preview');
const statusEl = document.getElementById('status');
const resetEl = document.getElementById('reset');
const presets = Array.from(document.querySelectorAll('.preset'));

const SAMPLE_URL = 'https://x.com/jack/status/20?s=20&t=Gv3Fy2Xb';

let statusTimer = null;
let saveTimer = null;

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

function hasStorage() {
  return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
}

function setStatus(text, saved) {
  statusEl.textContent = text;
  statusEl.classList.toggle('is-saved', Boolean(saved));
  clearTimeout(statusTimer);
  if (saved) {
    statusTimer = setTimeout(() => {
      statusEl.textContent = 'Changes save automatically';
      statusEl.classList.remove('is-saved');
    }, 1600);
  }
}

function buildPreview() {
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

function syncPresetState() {
  const current = normalizeBase(baseEl.value);
  presets.forEach((btn) => {
    const domain = normalizeBase(btn.dataset.domain || '');
    btn.classList.toggle('is-active', current === domain);
  });
}

function render() {
  const enabled = enabledEl.checked;
  document.body.classList.toggle('is-disabled', !enabled);
  const valid = isValidBase(baseEl.value);
  baseEl.setAttribute('aria-invalid', valid ? 'false' : 'true');
  baseEl.style.color = valid ? '' : '#f4212e';
  buildPreview();
  syncPresetState();
}

function readStored() {
  return new Promise((resolve) => {
    if (!hasStorage()) return resolve({ ...DEFAULTS });
    chrome.storage.sync.get(DEFAULTS, (stored) => {
      if (chrome.runtime && chrome.runtime.lastError) return resolve({ ...DEFAULTS });
      resolve({
        enabled: stored.enabled !== false,
        baseDomain: normalizeBase(stored.baseDomain)
      });
    });
  });
}

function writeStored(value) {
  if (!hasStorage()) return Promise.resolve();
  return new Promise((resolve) => {
    chrome.storage.sync.set(value, () => {
      if (chrome.runtime && chrome.runtime.lastError) {
        setStatus('Could not save: ' + chrome.runtime.lastError.message, false);
        return resolve();
      }
      setStatus('Saved', true);
      resolve();
    });
  });
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    writeStored({
      enabled: enabledEl.checked,
      baseDomain: normalizeBase(baseEl.value)
    });
  }, 250);
}

enabledEl.addEventListener('change', () => {
  render();
  scheduleSave();
});

baseEl.addEventListener('input', () => {
  render();
  scheduleSave();
});

presets.forEach((btn) => {
  btn.addEventListener('click', () => {
    baseEl.value = btn.dataset.domain || '';
    baseEl.focus();
    render();
    scheduleSave();
  });
});

resetEl.addEventListener('click', () => {
  enabledEl.checked = true;
  baseEl.value = '';
  render();
  writeStored({ ...DEFAULTS });
});

readStored().then((stored) => {
  enabledEl.checked = stored.enabled;
  baseEl.value = stored.baseDomain;
  render();
});
