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
old pass names (S2 to S11) are kept as target names. Build passes 1 to 4 are done.

| Build pass | Targets | Model | State |
| --- | --- | --- | --- |
| 1 `foundation` | scaffold (S2), looks (S3) | Opus 5.5, high | Done |
| 2 `landing` | hero (S4), sections (S5) | Sonnet 5.5, high | Done |
| 3 `shots` | shots (S6) | Sonnet 5.5, high | Done |
| 4 `get and pages` | downloads (S7), privacy (S8) | Sonnet 5.5, high | Done |
| 5 `interaction` | motion (S9), demo (S10) | Opus 5.5, high | Next |
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

## Notes for the next build pass

- The frames now hold the real app screens (`scripts/shots.mjs`; the app's dev
  server on port 5199, run `node scripts/shots.mjs`, then `og` against a
  preview). `head.js` sets each `img[data-screen]` to the active pair; the four
  Two Looks tiles have fixed sources. The Today section phone is a plain image
  until `demo` replaces it. The Open Graph card is `public/assets/og.jpg`;
  `privacy` adds the meta tags that point at it. Page diffs against the landing
  renders now include the real app's data, which differs from the design's demo
  data (grocery quantities, Settings content, a few totals).
- Two Looks tile markup adds two attributes the design does not have:
  `data-pair` on each `.rs-look` button and `data-radio` on its Radio span.
  `head.js` sets `aria-pressed` and the Radio ring from them before first paint
  (ring tokens `--radio-ring`, `--radio-dot` in `site-tokens.css`).
- The hero tilt handlers (`onPointerMove`/`onPointerLeave`) and the `.rs-js`
  class are left to `motion`; nothing hides content until it adds `.rs-js`.
- `/privacy`, `/404`, the footer and the favicon are in. Every page has its
  description, canonical and Open Graph tags (the card is `public/assets/og.jpg`).
- Get Rise markup adds a few attributes the design does not have: `data-asset`
  (`android` or `windows`) on the four download buttons, `data-control="install"`
  and an `aria-label` ("Install on") on the install tabs, `data-install` on the
  three step panels, `data-here` on the "This browser" and "This device" tags,
  and `data-browser` on the Chrome or Edge tab and chip. The tags and the iPhone
  and Mac panels start `hidden`; `src/js/install.js` shows them. `page.css` adds
  the 44px install tab targets and `[hidden]{display:none !important}`.
- `scripts/release.mjs` runs after `vite build` (`npm run build` does both) and
  rewrites `dist/*.html`: the version everywhere, the file names, the sizes
  (bytes / 1024^2, which is how the design's 2.52 MB and 2.77 MB come out) and
  the direct URLs. If the API fails the build still passes and the links stay on
  `/releases/latest`. It sends `GITHUB_TOKEN` when set. `RISE_RELEASE_API`
  points it at another URL for testing. `tests/release.test.js` covers it.
- `site-hook` in diet-tracker is now unblocked: it dispatches `rise-release` to
  this repo, and `deploy.yml` needs a `repository_dispatch` trigger to receive it.
- `shot.mjs --vh <px>` sets the viewport height. The 404 centres its content in
  the viewport, so check it at `--vh 900` (the render's height) at 390.
- On Cloudflare Pages `/404` itself answers 200; any unknown path answers 404
  with this page and the CSP. `check-headers` expects 200 for all three paths.

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
| `src/css/page.css` | `body{margin:0}` and the 44px Look option targets |
| `public/_headers` | CSP and other headers; `vite preview` serves the same |
| `public/assets/fonts/` | Eight handoff woff2 files and four OFL licences |
| `dev/states.html` | Dev-only port of `States.dc.html`, at `/dev/states.html` on the dev server; not built |
| `scripts/shots.mjs` | The 24 app screens as WebP at 1x and 2x into `public/assets/screens/`, and the Open Graph card |
| `tests/` | Literal test and ratchet, headers, fonts, screen budgets |
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
  Affects the header's unselected Look option and the Private by design panel
  (now in). `audit` reports it.
- The Look radiogroup has no accessible name, because the design gives none.
- Plan section 10's open questions: whether "2 things use the network" stays;
  whether the wording added during design stands; Variant 2 later. (The
  numbering question is settled: build passes, with the S names as targets.)
