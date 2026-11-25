# Build & QA tools

These scripts were used to art-direct the photography and to verify the page in a real
browser. They are development-only — the deployed site does not reference them.

## Asset pipeline

| Script | Purpose |
|---|---|
| `brand_assets.py` | Composites the IFD mark onto the crew photography, then exports every web-ready JPEG/PNG (hero crops, service cards, OG card, logo lock-ups). Requires Pillow. |
| `render_mark.js` | Renders the traced house mark to transparent PNGs (`mark-white.png`, `mark-dark.png`) at 512px through Chromium, so the mark stays vector-crisp at any size. |

Source photography lives in `../assets-src/generated/` (art-directed) and
`../assets-src/originals/` (the live site's own photography and logo).

```bash
python3 -m venv .venv && . .venv/bin/activate && pip install pillow
python3 tools/brand_assets.py
```

## Browser QA

| Script | Purpose |
|---|---|
| `shots.js` | Section screenshots at a given width. `W=390 H=844 DPR=2 node tools/shots.js` |
| `audit.js` | Sweeps 14 viewport widths for horizontal overflow, console errors, failed requests, broken images, heading order, unlabelled fields and duplicate `h1`s. |
| `contrast.js` | Measures WCAG contrast for every rendered text node and reports anything under AA. |
| `hero-legibility.mjs` | Renders the hero twice (text on / text off) and diffs the pixels, so contrast is measured against the *real* composited photograph + scrim behind the headline. Scores glyph cores only. |

Both browser scripts drive Puppeteer with a local Chromium build.
