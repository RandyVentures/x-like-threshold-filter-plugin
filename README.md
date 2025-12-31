# X Like Threshold Filter

Hide X posts above a like threshold with a whitelist for specific handles.

## Features
- Hide posts with likes greater than your threshold (default: 1000)
- Whitelist handles to always show
- Enable/disable toggle
- Works on infinite scroll
- Placeholder with Show/Whitelist buttons

## Install (Chrome)
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click "Load unpacked" and select `x-like-threshold-filter/`.
4. Visit `https://x.com`.

## Usage
- Open the extension popup to toggle enabled state, set the threshold, and manage the whitelist.
- Hidden posts show a placeholder with "Show" and "Whitelist" actions.

![Usage preview](assets/usage.gif)

## Development
- Content script: `x-like-threshold-filter/src/content.js`
- Popup UI: `x-like-threshold-filter/src/popup.html`
- Like parser: `x-like-threshold-filter/src/like_parser.js`

## Tests
```bash
node tests/parseLikeCount.test.js
```

## Safari (Phase 2)
Convert with Xcode's "Safari Web Extension" tooling once the Chrome build is stable.
