# Twitter/X Link Cleaner

Strips tracking parameters from X/Twitter links copied via the **Copy Link** button, and lets you choose the base domain the link is copied with.

X copies links like this:

```
https://x.com/jack/status/20?s=20&t=Gv3Fy2Xb
```

This extension copies this instead:

```
https://x.com/jack/status/20
```

Or, if you set a base domain to `fixvx`:

```
https://fixvx.com/jack/status/20
```

**[Project page](https://USERNAME.github.io/x-link-cleaner/)** · **[Install](#install)**

## Features

- **Removes tracking parameters** — the whole query string goes
- **Custom base domain** — `fixvx`, `fxtwitter`, `vxtwitter`, or any domain you type
- **Presets** — one click for the common front-ends
- **Live preview** — see the exact URL before you copy
- **On/off switch** — disable without uninstalling
- **Cleans pasted text too** — copy a paragraph containing a link and it is rewritten
- **No network requests** — nothing leaves your browser

## Install

### Firefox

Install from [addons.mozilla.org](#) — signed, one click, updates automatically. Also listed for Firefox for Android 142+.

### Chrome, Edge, Brave

The Chrome Web Store charges a one-time developer registration fee, so this ships unpacked:

1. Download `dist/twitter-x-link-cleaner-v3.0.zip` and extract it
2. Open `chrome://extensions`
3. Turn on **Developer mode**
4. Click **Load unpacked** and select the extracted folder

Chrome will prompt about developer-mode extensions on startup. If that is annoying, use the userscript below.

### Userscript

Works in Tampermonkey, Violentmonkey, and ScriptCat, including on mobile. See [x-link-cleaner.user.js](#).

## How it works

Two paths, both in `extension/content.js`:

1. **Click tracking.** When you open a post's `...` menu, the extension records which post it belongs to. When you then click *Copy link*, it waits for X's own handler to write to the clipboard, then overwrites it with the cleaned URL.
2. **Copy event fallback.** A `copy` listener rewrites any x.com/twitter.com link in the copied text. This covers keyboard copies and the cases where X's menu markup changes.

The domain swap changes only the hostname. Paths, fragments, and parameter stripping behave the same either way.

## Repository layout

```
extension/          Source — load this folder unpacked
  manifest.json
  content.js        Copy interception + URL rewriting
  popup.{html,css,js}  Settings UI
  icons/
  make_icons.py     Regenerates icons (dev only)
docs/               GitHub Pages site
dist/               Release zips
```

## Development

There is no build step. Edit files in `extension/`, then reload the extension from `chrome://extensions` or `about:debugging`.

Regenerate icons (requires Python 3 with Pillow and numpy):

```
pip install pillow numpy
python extension/make_icons.py
```

Lint the package the way addons.mozilla.org will:

```
npx web-ext lint --source-dir extension
```

## Permissions

| Permission | Why |
|---|---|
| `clipboardWrite` | Write the cleaned URL after X copies the original |
| `storage` | Remember your domain choice and on/off switch |

The extension runs only on `https://x.com/*` and `https://twitter.com/*`.

## Known limitations

- Front-end domains such as fixvx and fxtwitter are independent third-party services. Choosing one means whoever opens your link visits that service. The extension itself contacts nothing.
- X's mobile web UI exposes *Copy link* inconsistently, so the copy-event path does most of the work on phones.
- Domain input is validated; invalid values fall back to the original host rather than being saved.

## License

MIT
