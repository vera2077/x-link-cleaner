# Changelog

## 3.0.0 — 5 November 2026

First version with a settings interface. Core link cleaning is unchanged from 2.8.

### Added
- Settings popup: click the toolbar icon to configure the extension
- Custom base domain (`fixvx`, `fxtwitter`, `vxtwitter`, or any domain you type)
- Presets and a live URL preview
- On/off switch
- Settings stored with `storage.sync`
- Firefox for Android support (142+), shown as a full-width sheet from the browser menu
- Extension icon set and toolbar button

### Changed
- Copied links are now rewritten for `www.`, `mobile.`, and `m.` hosts as well; 2.8 only matched bare `x.com` and `twitter.com`
- Settings changes apply to open tabs immediately, with no reload
- All `console.log` debug output removed

### Fixed
- The settings preview no longer assigns to `innerHTML`, which addons.mozilla.org flags during review

## 2.8

Previous release. Stripped tracking parameters from copied links with a fixed `x.com` / `twitter.com` host and no configuration.
