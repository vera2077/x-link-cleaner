'use strict';

// Shares the extension's normalisation rules so the figures never show an
// output the extension would not actually produce.
const SAMPLE = 'https://x.com/jack/status/20?s=20&t=Gv3Fy2Xb';
const SAMPLE_CLEAN = 'https://x.com/jack/status/20';
const SOURCE_HOSTS = ['x.com', 'twitter.com'];

const resultEl = document.getElementById('result');
const measureEl = document.getElementById('measure');
const probeEl = document.getElementById('probe');
const probeOutEl = document.getElementById('probe-out');
const hostInputs = Array.from(document.querySelectorAll('input[name="host"]'));

function currentHost() {
  const checked = hostInputs.find((input) => input.checked);
  return checked ? checked.value : '';
}

function stripHost(hostname) {
  return hostname
    .replace(/^www\./, '')
    .replace(/^mobile\./, '')
    .replace(/^m\./, '');
}

// Mirrors cleanXUrl() in extension/content.js.
function cleanUrl(raw, host, base) {
  let url;
  try {
    url = new URL(raw, base || 'https://x.com/');
  } catch (err) {
    return null;
  }
  if (!SOURCE_HOSTS.includes(stripHost(url.hostname))) return null;
  url.search = '';
  if (host) url.hostname = host;
  return url.toString();
}

function renderResult() {
  const host = currentHost();
  const cleaned = cleanUrl(SAMPLE, host, 'https://x.com/') || SAMPLE_CLEAN;

  resultEl.textContent = cleaned;

  const saved = SAMPLE.length - SAMPLE_CLEAN.length;
  const percent = Math.round((saved / SAMPLE.length) * 100);
  measureEl.textContent = 'Query string removed: ' + saved + ' characters, ' + percent + '% of the link.';
}

function renderProbe() {
  const value = probeEl.value.trim();

  probeOutEl.classList.remove('is-error');

  if (!value) {
    probeOutEl.textContent = '';
    return;
  }

  const cleaned = cleanUrl(value, currentHost(), 'https://x.com/');

  if (!cleaned) {
    probeOutEl.classList.add('is-error');
    probeOutEl.textContent = 'Not an x.com or twitter.com link. Nothing would change.';
    return;
  }

  probeOutEl.textContent = cleaned;
}

hostInputs.forEach((input) => {
  input.addEventListener('change', () => {
    renderResult();
    if (probeEl.value.trim()) renderProbe();
  });
});

probeEl.addEventListener('input', renderProbe);

renderResult();
