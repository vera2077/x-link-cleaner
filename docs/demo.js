'use strict';

// Same normalisation rules as the extension (content.js / popup.js), so the
// demo never promises output the extension would not actually produce.
const SAMPLE_PATH = '/jack/status/20';
const SAMPLE_QUERY = '?s=20&t=Gv3Fy2Xb';

const SOURCE_HOSTS = ['x.com', 'twitter.com'];

const beforeEl = document.getElementById('demo-before');
const afterEl = document.getElementById('demo-after');
const tallyEl = document.getElementById('demo-tally');
const pasteInput = document.getElementById('paste-input');
const pasteOut = document.getElementById('paste-out');
const domainInputs = Array.from(document.querySelectorAll('input[name="domain"]'));

function currentDomain() {
  const checked = domainInputs.find((input) => input.checked);
  return checked ? checked.value : '';
}

function stripHost(hostname) {
  return hostname
    .replace(/^www\./, '')
    .replace(/^mobile\./, '')
    .replace(/^m\./, '');
}

// Mirrors cleanXUrl() in the extension.
function cleanUrl(raw, baseDomain, fallbackOrigin) {
  let url;
  try {
    url = new URL(raw, fallbackOrigin || 'https://x.com/');
  } catch (err) {
    return null;
  }
  if (!SOURCE_HOSTS.includes(stripHost(url.hostname))) return null;
  url.search = '';
  if (baseDomain) url.hostname = baseDomain;
  return url.toString();
}

function renderBefore() {
  beforeEl.textContent = '';

  const host = document.createElement('span');
  host.className = 'host';
  host.textContent = 'https://x.com';

  const path = document.createTextNode(SAMPLE_PATH);

  const junk = document.createElement('span');
  junk.className = 'junk';
  junk.textContent = SAMPLE_QUERY;

  beforeEl.append(host, path, junk);
}

function renderAfter() {
  const base = currentDomain();
  const cleaned = cleanUrl('https://x.com' + SAMPLE_PATH + SAMPLE_QUERY, base, 'https://x.com/');
  const href = cleaned || 'https://x.com' + SAMPLE_PATH;

  afterEl.textContent = '';

  const target = base || 'x.com';
  const index = href.indexOf(target);
  if (index === -1) {
    afterEl.textContent = href;
  } else {
    const host = document.createElement('span');
    host.className = 'host';
    host.textContent = target;
    afterEl.append(
      document.createTextNode(href.slice(0, index)),
      host,
      document.createTextNode(href.slice(index + target.length))
    );
  }

  updateTally();
}

function updateTally() {
  const original = 'https://x.com' + SAMPLE_PATH + SAMPLE_QUERY;
  const cleaned = 'https://x.com' + SAMPLE_PATH;
  const saved = original.length - cleaned.length;
  const percent = Math.round((saved / original.length) * 100);

  tallyEl.textContent = '';

  const strong = document.createElement('b');
  strong.textContent = saved + ' characters';

  tallyEl.append(strong, document.createTextNode(' removed, ' + percent + '% shorter'));
}

function handlePaste() {
  const value = pasteInput.value.trim();

  pasteOut.classList.remove('is-error');

  if (!value) {
    pasteOut.textContent = '';
    return;
  }

  const cleaned = cleanUrl(value, currentDomain(), 'https://x.com/');

  if (!cleaned) {
    pasteOut.classList.add('is-error');
    pasteOut.textContent = 'That is not an x.com or twitter.com link.';
    return;
  }

  pasteOut.textContent = cleaned;
}

domainInputs.forEach((input) => {
  input.addEventListener('change', () => {
    renderAfter();
    if (pasteInput.value.trim()) handlePaste();
  });
});

pasteInput.addEventListener('input', handlePaste);

renderBefore();
renderAfter();
