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
old pass names (S2 to S11) are kept as target names. Build pass 1 is done.

| Build pass | Targets | Model | State |
| --- | --- | --- | --- |
| 1 `foundation` | scaffold (S2), looks (S3) | Opus 5.5, high | Done |
| 2 `landing` | hero (S4), sections (S5) | Sonnet 5.5, high | Next |
| 3 `shots` | shots (S6) | Sonnet 5.5, high | To do |
| 4 `get and pages` | downloads (S7), privacy (S8) | Sonnet 5.5, high | To do |
| 5 `interaction` | motion (S9), demo (S10) | Opus 5.5, high | To do |
| 6 `audit` | audit (S11) | Opus 5.5, high | To do |

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

### hero (S4)

- **Reads:** `#top` and `#how` in `canvas/Main.dc.html`; their rules in
  `canvas/site.css`; plan section 3, rows 1 and 2.
- **Does:** ports both sections into `<main>` in `index.html`. Hero: the "Rıse"
  wordmark, H1, sub, the Open Rise, Android and Windows CTAs, the fact line,
  and the desktop window and phone frames (`.rs-window`, `.rs-phone`, CSS only;
  their screens arrive in `shots`, so the frames stay empty). How it works: the
  three steps. Links from plan section 3.
- **Done when:** text matches the source; the top of `landing-1440-*` and
  `landing-390-*` matches; no overflow at 320.

### sections (S5)

- **Reads:** `#today`, `#weight`, `#plan`, `#looks`, `#quiet`, `#private` in
  `Main.dc.html`; plan section 3, rows 3 to 8; the tile logic (`pick`) in its
  script.
- **Does:** ports the six sections, with Today static for now. The four Two
  Looks tiles are a picker: wire them through `src/js/looks.js` (`pick`) and
  `public/js/head.js` (`paint`), so they change the page and show the current
  pair before first paint.
- **Done when:** each section matches the middle of the landing renders; the
  tiles change the page and survive a reload. The Reel light contrast shortfall
  (open items) shows up in `#private`; report it, don't fix it.

### shots (S6)

- **Reads:** plan section 6; the five `canvas/Shot*.dc.html` for what each
  screen shows; diet-tracker's `scripts/readme-shots.mjs`.
- **Does:** `scripts/shots.mjs` runs against the app's dev server and writes
  WebP at 1x and 2x with `sharp`: Today, Weight, Plan groceries, Plan targets,
  Settings (390×844) and Desktop Today (1440×900), in all four pairs. Plus the
  1200×630 Open Graph card from the hero. Puts them in the hero, sections and
  tiles with `width`, `height` and alt text. Only the active pair loads, lazily
  below the fold, and each swaps with Look and theme.
- **Done when:** all 24 screens at both densities are in, under their budgets,
  and compared once against the `screen-*.jpg` renders. Never crop or ship the
  renders.

### downloads (S7)

- **Reads:** `#get` in `Main.dc.html`, and `device`, `setInstall` and `inst` in
  its script; plan sections 3 (row 9 and Links) and 7; `pickAssetUrl()` in
  diet-tracker's `src/js/core/updates.js`.
- **Does:** ports Get Rise: the Web card with the iPhone, Mac and Chrome or
  Edge install tabs, the Android and Windows cards, and the line under them.
  `scripts/release.mjs` reads the latest diet-tracker release at build time and
  writes the version, file names, sizes and direct URLs into the HTML,
  including every `v3.0.0`. Static `href`s stay
  `https://github.com/rvyyv-n/diet-tracker/releases/latest`. `src/js/install.js`
  tags the visitor's card and opens the tabs on their browser.
- **Done when:** the build writes the links and sizes; with the API blocked,
  the buttons fall back; the tabs open on the visitor's browser.

### privacy (S8)

- **Reads:** `canvas/Privacy.dc.html`, `canvas/NotFound.dc.html`, the
  `<footer>` in `Main.dc.html`; plan section 3 (`/privacy`, `/404`, row 10).
- **Does:** adds `privacy.html` and `404.html` as Vite inputs, the footer on
  all three pages, the favicon (`icon.svg` and `icon-192.png` from the app,
  which also ends the favicon 404 seen in every check today), and meta and Open
  Graph tags. Adds `/privacy` and `/404` to `PATHS` in
  `scripts/check-headers.mjs`.
- **Done when:** both pages match their eight renders each, and every link
  resolves.

### motion (S9)

- **Reads:** `H/NOTES.md` (every duration and easing); the motion block of
  `canvas/site.css`; `apply`, `componentDidMount`, `measure`, `tilt`,
  `untilt`, `trackPointer` in the `Main.dc.html` script; plan section 5's
  module table.
- **Does:** `reveal.js`, `scroll.js`, `hero.js`, `transition.js`, and the hero
  sun.
- **Done when:** timing matches `NOTES.md`; reduced motion turns everything
  off and shows the end state; nothing shifts layout; every reveal fires.

### demo (S10)

- **Reads:** `canvas/ShotToday.dc.html`: markup for the layout, `blocks`,
  `toggle` and `renderVals` for the logic.
- **Does:** the live Today phone in `#today`, in plain HTML and JS.
- **Done when:** ticking a meal moves the total, the bar, the sun and the due
  card, and shows the toast with Undo; it follows Look and theme; the starting
  state matches `screen-today-*.jpg`.

### audit (S11)

- **Reads:** the whole site; plan's Verification section.
- **Does:** a Playwright run (`playwright-core`, system Chrome) that fails on
  any request leaving the origin; contrast in all four pairs; 44px targets;
  Lighthouse; and a fix for the layout shift when the fonts swap in.
- **Done when:** zero external requests, AA everywhere apart from the accepted
  shortfall (reported), Lighthouse 95 or above, and all 49 renders compared
  once.

## Repo map

| Path | Holds |
| --- | --- |
| `index.html` | The landing page: `.rs-site` shell, header, and `<main>` that the targets fill |
| `public/js/head.js` | Blocking no-flash script: sets `data-look` and `data-theme`, paints the controls as they are parsed; `window.RiseLooks` |
| `src/js/looks.js`, `main.js` | Look and theme clicks and arrow keys; follows the device until a theme is picked |
| `src/css/tokens.css` | The design's `bundle.css`, unchanged |
| `src/css/site-tokens.css` | Site tokens and `--z-*` screen scales from the handoff `site.css` |
| `src/css/site.css` | The handoff `site.css` as exported (ratcheted) |
| `src/css/page.css` | `body{margin:0}` and the 44px Look option targets |
| `public/_headers` | CSP and other headers; `vite preview` serves the same |
| `public/assets/fonts/` | Eight handoff woff2 files and four OFL licences |
| `dev/states.html` | Dev-only port of `States.dc.html`, at `/dev/states.html` on the dev server; not built |
| `tests/` | Literal test and ratchet, headers, fonts |
| `scripts/shot.mjs` | Screenshots, layout checks and render diffs, one line per shot |
| `scripts/check-looks.mjs` | Look and theme behaviour, including no flash |
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
  Affects the header's unselected Look option and, from `sections`, the Private
  by design panel. `audit` reports it.
- The Look radiogroup has no accessible name, because the design gives none.
- Plan section 10's open questions: whether "2 things use the network" stays;
  whether the wording added during design stands; Variant 2 later. (The
  numbering question is settled: build passes, with the S names as targets.)
