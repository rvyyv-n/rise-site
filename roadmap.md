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
old pass names (S2 to S11) are kept as target names. Build passes 1 to 5 are done.

| Build pass | Targets | Model | State |
| --- | --- | --- | --- |
| 1 `foundation` | scaffold (S2), looks (S3) | Opus 5.5, high | Done |
| 2 `landing` | hero (S4), sections (S5) | Sonnet 5.5, high | Done |
| 3 `shots` | shots (S6) | Sonnet 5.5, high | Done |
| 4 `get and pages` | downloads (S7), privacy (S8) | Sonnet 5.5, high | Done |
| 5 `interaction` | motion (S9), demo (S10) | Opus 5.5, high | Done |
| 6 `audit` | audit (S11) | Opus 5.5, high | Next |

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

Each target lists what to read (paths in `H/`), what it does, and when it is
done. Read only what the target lists. Use `Grep` for the section id in
`Main.dc.html` and read that range, not the whole file.

### audit (S11)

- **Reads:** the whole site; plan's Verification section.
- **Does:** a Playwright run (`playwright-core`, system Chrome) that fails on
  any request leaving the origin; contrast in all four pairs; 44px targets;
  Lighthouse; and a fix for the layout shift when the fonts swap in.
- **Done when:** zero external requests, AA everywhere apart from the accepted
  shortfall (reported), Lighthouse 95 or above, and all 49 renders compared
  once.

## Notes for the next build pass

- The font-swap shift, measured on a throttled link (150ms, 200 kB/s):
  landing 0.015 at 1440 and 0.009 at 390, privacy 0.018, in Reel; about 0.001
  in Paper. Most of it is Barlow Semi Condensed replacing `system-ui` and
  rewrapping lines. Preloading the Look's first-screen faces from `head.js`
  only took 1440 to 0.011, so it was not kept. Taking it to zero needs
  fallback faces with `size-adjust` and ascent overrides, named in the
  `--font-*` stacks, and those live in `tokens.css`, which stays unchanged:
  the audit decides whether to ask the owner.
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
| `src/css/page.css` | Site additions: `body{margin:0}`, 44px targets (Look and Install switches, demo), `[hidden]`, the header's slim margin, the demo's line height, the 320 Get Rise cards |
| `public/_headers` | CSP and other headers; `vite preview` serves the same |
| `public/assets/fonts/` | Eight handoff woff2 files and four OFL licences |
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
