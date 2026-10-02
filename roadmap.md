# Rise site roadmap

The spec for what is left. A new thread reads the project brief (loaded on
its own), then this file, then only the handoff files the current target lists. Updated
2026-10-02.

The Rise marketing site is a static, 1:1 port of a finished design export to
plain HTML, CSS and JS, built by Vite in vanilla mode and served by Cloudflare
Pages at https://getrise.pages.dev (repo `rvyyv-n/rise-site`, Pages project
`getrise`). The handoff is in `private/rise-website-v1/`, called `H/` below. It
is git-ignored and never imported, served or committed.

## Build passes

A build pass is a group of similar targets, run in one thread on one model. The
old pass names (S2 to S11) are kept as target names. Build passes 1 to 6 are done.

| Build pass | Targets | Model | State |
| --- | --- | --- | --- |
| 1 `foundation` | scaffold (S2), looks (S3) | Opus 5.5, high | Done |
| 2 `landing` | hero (S4), sections (S5) | Sonnet 5.5, high | Done |
| 3 `shots` | shots (S6) | Sonnet 5.5, high | Done |
| 4 `get and pages` | downloads (S7), privacy (S8) | Sonnet 5.5, high | Done |
| 5 `interaction` | motion (S9), demo (S10) | Opus 5.5, high | Done |
| 6 `audit` | audit (S11) | Opus 5.5, high | Done |

Why these models: build passes 2 to 4 are careful copying from the source and
wiring scripts the plan already describes, which Sonnet does well at a lower
cost. Build pass 5 has timing, layout-shift and state bugs that are easy to
miss, and build pass 6 judges the whole site, so both get Opus.

**In diet-tracker, not this repo** (run there, with its own `build-pass` skill
or by hand):

| Target | Model | When |
| --- | --- | --- |
| `site-hook`: a release triggers a site deploy | Sonnet 5.5, medium | After build pass 4 |
| `readme`: the README links the site first | Haiku 4.5 | After build pass 6 |

## Targets

All site targets are done. What is left is `readme` in diet-tracker.

## Notes for the next build pass

- `npm run audit` (`scripts/audit.mjs`, `--only requests,contrast,targets,shift,lighthouse,screens`)
  checks the three pages in all four pairs at 1440, 390 and 320: requests off
  the origin (0), text contrast (gradients sampled from pixels), 44px targets,
  layout shift on a throttled link (bar 0.005), Lighthouse (bar 95; the 404's
  SEO is left out, it is `noindex`), and each screen file against its render.
  Last run: 0 off-origin, 0 low contrast, 0 small targets, shift at most 0.0008.
- Accepted: Reel light's `--ink-muted` (4.40) and `--accent-text` (4.10) on
  `--bg-sunken`, 39 places, the tokens' own values; and the demo's six targets
  overlapping at 320.
- Lighthouse: desktop 100 on every page; mobile privacy 96, 404 97, landing 92
  on the preview server and 89 to 97 live. The landing's LCP is the hero lede,
  which the design's reveal stagger holds back about 540ms after the script;
  bringing it to 95 every time means shortening that, which is the owner's call.
  Best practices 96 on the landing is `image-size-responsive`, a false positive:
  the frames scale their screens down with a transform.
- The font swap no longer shifts: `page.css` adds fallback faces (local Arial
  and Georgia, with `size-adjust` and metric overrides) and restates the
  `--font-*` stacks with them; `tokens.css` is untouched. `head.js` preloads
  the active Look's first-screen faces.
- `npm run fonts` (`scripts/fonts.mjs`, needs `pip install fonttools brotli`)
  cuts the handoff's faces to the Latin set: 875 kB to 384 kB, the same pixels.
- Screens: `srcset` uses width descriptors and each frame's `sizes` is its
  on-screen width. `scroll.js` takes its first measure in a frame.
- `shot.mjs` loads the lazy screens before a full-page capture (before, the
  lower phones were missing). Page diffs: landing 3.3 to 6.2, privacy 1.2 to
  2.7, 404 0.6 to 1.6 (at `--vh 900`). Screen files against their renders
  differ by 10 to 39, all app data against the design's demo data (today
  reel-light highest: no due card at the pinned clock). `dev/states.html`'s
  Look tiles now hold the Today screen (diff 3.4).
- At 320 the Android and Windows cards in Get Rise put their glyph above the
  text (`page.css`, below 22.5em), so "Download for Windows" fits in Paper's
  face. The design has no 320 render.
- Motion: `src/js/reveal.js`, `scroll.js`, `hero.js`, `transition.js`, with
  `reduced.js` shared. `public/js/head.js` puts `.rs-js` on `<html>` before the
  first paint (not with reduced motion), and takes it off at load if the page
  script never ran (`window.RiseReveal`). All 50 landing reveals and 16 privacy
  reveals fire.
- Changes from the design, all fixes: the header gives back the 20px it loses
  when it slims as `margin-bottom` (`--header-slim`, `page.css`), so nothing
  below it moves; the hero sun's load animation fills `backwards`, not `both`,
  because `both` held `transform` and the 1600ms set and rise never ran; with
  reduced motion the header still takes the page colour and the progress sun
  still tracks the scroll, but `is-away`, the drift and the No-line focus are
  off; `--scroll` is set on the progress sun, not the page root.
- NOTES says the hero devices lean "up to 6deg"; the design's code leans 3deg
  across and 2deg up and down, and that is what is built.
- `transition.js` waits up to 400ms for the screens in view to decode before
  the new page is captured. `looks.js` keeps the pending state, so a fast second
  click reads it. `check:looks` waits 600ms after each change for this. Its
  module delay now matches the built `main-*.js` (it matched nothing before,
  so the "module held back" checks were not holding it back; they pass).
- `shot.mjs --motion 1` leaves motion on, for timing checks with `--eval`.
- The demo: `#today` holds the design's Today screen as HTML (rendered from the
  design system's components by `npm run demo:markup`), with `<template>`s for the row states, the due
  card and the toast; `src/js/demo.js` rebuilds the list from them. The
  DayTotal bar and sun read `--f`. Controls the demo does not run are `inert`;
  the six live ones get 44px on-screen targets in `page.css`, which overlap
  their neighbours slightly at 320, where a row is 39px tall on screen. The
  tick buttons carry `aria-pressed`, and the toast sits in a `role="status"`
  wrapper; the design has neither. The screen draws at normal line height.
- `tests/screens.test.js` now expects 10 images: the Today section phone is the
  demo, not a screenshot.
- The frames hold the real app screens (`scripts/shots.mjs`); page diffs against
  the landing renders include the real app's data, which differs from the
  design's demo data.
- Get Rise markup adds `data-asset`, `data-control="install"`, `data-install`,
  `data-here` and `data-browser`; `src/js/install.js` uses them. Two Looks tiles
  add `data-pair` and `data-radio`. `scripts/release.mjs` rewrites the release
  links at build.
- `shot.mjs --vh <px>` sets the viewport height; check the 404 at `--vh 900`.
  On Cloudflare Pages `/404` answers 200; unknown paths answer 404.
- `site-hook` in diet-tracker is unblocked: `deploy.yml` here needs a
  `repository_dispatch` trigger for `rise-release`.

## Repo map

| Path | Holds |
| --- | --- |
| `index.html`, `privacy.html`, `404.html` | The three pages (Vite inputs). The landing page is the `.rs-site` shell, header, and `<main>` with the hero, How it works, Today, Weight, Plan, Two Looks, No nagging, Private and Get Rise sections, then the footer; the frames hold the app screens |
| `src/js/install.js` | Get Rise: tags the visitor's card and opens the install steps on their browser |
| `scripts/release.mjs` | After the build, writes the latest release's version, files, sizes and URLs into `dist/*.html` |
| `public/js/head.js` | Blocking no-flash script: sets `data-look` and `data-theme`, paints the controls as they are parsed; `window.RiseLooks` |
| `src/js/looks.js`, `main.js` | Look and theme clicks and arrow keys, and the four Two Looks tiles (`.rs-look`, `data-pair`); follows the device until a theme is picked |
| `src/css/tokens.css` | The design's `bundle.css`, unchanged |
| `src/css/site-tokens.css` | Site tokens and `--z-*` screen scales from the handoff `site.css` |
| `src/css/site.css` | The handoff `site.css` as exported (ratcheted) |
| `src/css/page.css` | Site additions: `body{margin:0}`, 44px targets (Look and Install switches, demo), `[hidden]`, the header's slim margin, the demo's line height, the 320 Get Rise cards, the sized fallback faces |
| `public/_headers` | CSP and other headers; `vite preview` serves the same |
| `public/assets/fonts/` | Eight handoff woff2 files cut to Latin, and four OFL licences |
| `dev/states.html` | Dev-only port of `States.dc.html`, at `/dev/states.html` on the dev server; not built |
| `scripts/shots.mjs` | The 24 app screens as WebP at 1x and 2x into `public/assets/screens/`, and the Open Graph card |
| `tests/` | Literal test and ratchet, headers, fonts, screen budgets |
| `scripts/shot.mjs` | Screenshots, layout checks and render diffs, one line per shot |
| `scripts/check-looks.mjs` | Look and theme behaviour, including no flash |
| `scripts/check-motion.mjs` | Reveals, reduced motion (at start, mid-visit, print), no script, the header, the hero sun, transitions with and without view transitions, fast clicks, tilt on touch, and the demo |
| `scripts/demo-markup.mjs` | Writes the `#today` demo's markup from the handoff's design system (dev only) |
| `src/js/reveal.js`, `scroll.js`, `hero.js`, `transition.js`, `reduced.js` | Motion: reveals, scroll-linked header, sun, focus and drift, tilt and CTA wash, Look and theme view transitions |
| `src/js/demo.js` | The live Today phone |
| `scripts/check-headers.mjs` | Headers on a live URL |
| `scripts/audit.mjs` | The site audit: requests, contrast, targets, shift, Lighthouse, screens |
| `scripts/fonts.mjs` | Cuts the handoff's faces to the Latin set into `public/assets/fonts/` (dev only) |
| `.github/workflows/deploy.yml` | Test and build on push and PR; deploy `main` |

Look and theme are saved under `rise-site:look` and `rise-site:theme`.

## Deploy

- CI deploys `main` once the `CLOUDFLARE_API_TOKEN` repo secret exists. It is
  **not set yet**, so CI only tests and builds. Set it with
  `gh secret set CLOUDFLARE_API_TOKEN -R rvyyv-n/rise-site`.
- Until then, deploy by hand once per build pass:
  `npm run build`, then
  `npx wrangler pages deploy dist --project-name=getrise --branch=main --commit-hash=$(git rev-parse HEAD) --commit-message="<build pass>" --commit-dirty=false`,
  then `npm run check:headers -- https://getrise.pages.dev`.

## Open items for the owner

- Set `CLOUDFLARE_API_TOKEN` (above).
- **Reel light contrast:** with the design's tokens, `--ink-muted` (4.40:1) and
  `--accent-text` (4.10:1) on `--bg-sunken` fall below 4.5:1. Kept to stay 1:1.
  Affects the header's unselected Look option and the Private by design panel
  (now in). `audit` reports it.
- The Look radiogroup has no accessible name, because the design gives none.
- Plan section 10's open questions: whether "2 things use the network" stays;
  whether the wording added during design stands; Variant 2 later. (The
  numbering question is settled: build passes, with the S names as targets.)
