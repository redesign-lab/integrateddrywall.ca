# Integrated Framing &amp; Drywall — homepage redesign

A custom, conversion-focused homepage concept for **Integrated Framing & Drywall (IFD)**,
a licensed and insured steel-stud framing and drywall contractor in Toronto, Ontario.

The design is built around the trade itself: an editorial, monochrome construction language
where the galvanized stud grid becomes the visual system — ruled lines, drafting marks,
a single amber safety accent, and full-bleed documentary photography.

> **Concept site.** This is a redesign demo, not the live business site. It is marked
> `noindex, nofollow` so it never competes with `integrateddrywall.ca` in search results.

---

## Live preview

Deployed with GitHub Pages: **<https://redesign-lab.github.io/integrateddrywall.ca/>**

Everything is plain HTML/CSS/JS with relative paths, so it also runs straight from disk
(open `index.html`) or from any subdirectory.

---

## Business information used

All facts below come from the existing website and public business listings — nothing invented.

| | |
|---|---|
| **Business name** | Integrated Framing &amp; Drywall (IFD) |
| **Industry** | Construction — steel stud framing, drywall, finishing, sound insulation |
| **Address** | 201 Bicknell Avenue, Toronto, ON M6M 4H1 |
| **Phone** | (647) 447-3441 — [`tel:+16474473441`](tel:+16474473441) |
| **Hours** | Mon–Fri, 8:00 am – 5:00 pm |
| **Service area** | Toronto &amp; the GTA — Etobicoke, North York, Scarborough, Mississauga, Vaughan, Markham |
| **Facebook** | <https://www.facebook.com/ifdinc> |
| **Positioning** | “Fully licensed and insured framing company” — residential, commercial &amp; industrial |
| **Audience** | Builders, general contractors, architects, homeowners |

**Services shown:** steel stud framing · drywall · taping &amp; sanding · sound insulation ·
plus renovation framing, patch &amp; repair, attic/basement insulation and light demolition.

---

## Design direction

* **Type** — `Oswald` (condensed display, trades/signage feel) + `Inter` (UI and body,
  chosen for legibility at small sizes). Both self-hosted, subset to Latin, no Google Fonts request.
* **Palette** — graphite `#0E0F0F`, bone `#F2F0EB`, stone `#C8C3B7` and a single safety
  amber `#DFA53C`. `#8A5D18` is a darkened amber used only for small text so it passes WCAG AA.
* **Layout** — asymmetric 12-column editorial grids, staggered service cards, a ruled
  "legend" in the hero instead of statistic chips, and a drafting-plate coverage diagram.
* **Motion** — restrained: 22px reveals on scroll, 1.035 image scaling on hover, and a
  sliding mobile drawer. Everything is disabled under `prefers-reduced-motion`.

### Homepage sections

1. Fixed header → condensed sticky state, full-screen mobile drawer
2. Hero — “Finished right.” with a ruled 05 / GTA / L&amp;I legend
3. Trust strip — builders, GCs, architects, homeowners
4. Who we are — planning-led story + credentials
5. Services — asymmetric editorial grid, four scopes + extras
6. Process — four numbered steps on graphite
7. Selected work — real project photography
8. Service area — drafting-plate coverage diagram
9. Quote — contact details + validated request form
10. FAQ — accessible accordion
11. Final CTA — photographic blueprint panel
12. Footer + persistent mobile call/quote bar

---

## Responsive &amp; accessibility notes

* **Mobile-first**: base styles target 360px; enhancements at 480 / 640 / 900 / 1100 / 1440px.
* Verified with **no horizontal overflow at 320, 360, 390, 430, 480, 600, 768, 834, 1024, 1180, 1280, 1440, 1680 and 1920px**.
* Mobile drawer: focus trap, `Escape` to close, scroll lock, `aria-expanded` / `aria-hidden`
  kept in sync, and focus returned to the toggle.
* All rendered text meets **WCAG AA** contrast (checked programmatically).
* Tap targets are ≥ 40px on mobile; the persistent call/quote bar respects `safe-area-inset-bottom`.
* `scroll-padding-top` offsets anchor jumps under the fixed header; the active nav link
  tracks the section in view.
* Semantic landmark structure, one `h1`, ordered headings, labelled form fields, visible
  focus rings, skip link, and descriptive alt text on every image.
* `prefers-reduced-motion` turns off reveals, pulses and smooth scrolling.

## Honest form behaviour

This is a static build with no backend and no verified mailbox, so the quote form
**never claims to send anything**. On submit it validates the details, then offers the
real phone line and a copyable summary. No fake "message sent" state exists anywhere.

---

## Project structure

```
.
├── index.html               # the homepage
├── css/style.css            # design system + all layout/breakpoints
├── js/script.js             # nav, drawer, accordion, reveals, form validation
├── fonts/                   # self-hosted Oswald + Inter (woff2, latin subset)
├── assets/
│   ├── images/              # photography, coverage plate, OG card
│   ├── icons/               # inline SVG icon sources
│   └── logo/                # IFD mark, lock-ups, favicon, touch icon
├── tools/                   # build + QA scripts (dev only, not referenced by the site)
├── assets-src/              # art-directed source photography (pre-composite)
├── .nojekyll                # serve files as-is on GitHub Pages
├── .github/workflows/       # Pages deployment
└── README.md
```

## Running locally

```bash
# any static server works
python3 -m http.server 8080
# then open http://localhost:8080
```

## Deploying on GitHub Pages

The repository ships with `.github/workflows/deploy-pages.yml`, which publishes the
repository root on every push to the default branch. If you prefer the classic setup:
**Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `/(root)`**.

---

## Image credits &amp; how assets were made

* **Brand mark** — the existing IFD house logo, extracted from the live site, cleanly
  re-traced as a vector (`assets/logo/ifd-mark.svg`). The lock-ups reuse the mark with
  Oswald type; the original identity is preserved, not replaced.
* **Project photography** — `project-living-room.jpg` is an IFD project photo published
  on the business’s Yelp listing; `intro-drafting.jpg` is the hero photo from
  `integrateddrywall.ca`.
* **Branded crew photography** — art-directed photographs created for this concept,
  with the IFD mark composited onto the crew members’ shirts and workwear. These are
  **illustrative concept imagery, not photographs of IFD’s own jobs**, and are presented
  in the design as general brand imagery rather than as proof of specific projects.
* Photography is stored under `assets/images/` and `assets-src/generated/`; the shipped
  JPEGs are resized and compressed for the web.

---

## What was tested, and how

Real Chromium runs (Puppeteer) at every viewport listed above, plus interaction tests:

* drawer open/close, focus trap, `Escape`, scroll lock, anchor offsets
* sticky header and floating call bar thresholds
* FAQ accordion open/close and ARIA state
* form validation, error messaging and the honest hand-off state
* zero console errors, zero failed asset requests, zero broken images
* no horizontal overflow, tap-target sizes, heading order, labelled fields
* programmatic contrast audit of every rendered text element

Design review was visual at 390px, 768px and 1440px. Real-device testing on the
client’s own phone is still recommended before anything goes live.

---

© Integrated Framing &amp; Drywall. Redesign concept by the project author.
