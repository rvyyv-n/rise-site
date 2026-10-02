# Rise site

A static, 1:1 port of the Rise design export, built by Vite in vanilla mode and
served at https://getrise.pages.dev. Work goes in build passes: read
`roadmap.md` for the plan and state, and run one with the `build-pass` skill.
The handoff is `private/rise-website-v1/`: never import, serve or commit it.

## Rules

- **No attribution, anywhere.** No mention of the assistant or its maker by
  name in anything that is committed, pushed, deployed or published: files,
  commit messages, PR titles and bodies, release notes, deploy messages, site
  copy. No co-author or generated-by lines. Name these files "the project
  brief" and "the build-pass skill" in prose. The only exceptions are the
  tooling paths themselves (this file's name and the tooling folder). Local git hooks
  (`commit-msg`, `pre-commit`, `pre-push`, untracked, from diet-tracker)
  reject a forbidden name in added lines or messages, and a wrong author or
  committer. Never bypass them with `--no-verify`. The checkout's parent
  folder carries the forbidden name, so write repo-relative paths, never
  absolute ones.
- Plain HTML, CSS and JS. No framework or UI library.
- Nothing leaves the origin: no CDNs, font services, analytics, third-party
  scripts or embeds.
- CSP: `default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:`.
  No inline scripts, `<style>` blocks or `on*=` handlers.
- The design is the source of truth: its tokens (`bundle.css`, in
  `src/css/tokens.css` unchanged), fonts, CSS, structure, class names and
  inline styles, copied exactly. Replace only the runtime constructs
  (`{{holes}}`, `<x-import>`, `<dc-import>`, `<sc-if>`, `<sc-for>`). Where the
  design and the app differ, the design wins; report it.
- No hex or px in CSS or JS outside `tokens.css` and `site-tokens.css`.
  `site.css` is ratcheted in `tests/literals.js`; never raise it. Colours in
  `style` attributes are `var(--…)`.
- Copy is final: sentence case, no emoji, tabular figures, no mention of any AI
  assistant.
- Renders are for layout only, never colours. Where a render and the source
  disagree, the source wins; report it.
- Match at 1440 and 390, no clipping at 320, in Reel dark, Reel light, Paper
  dark and Paper light. 4.5:1 text, 44px targets, visible focus, reduced
  motion turns all motion off.
- `private/rise-website-v1/PROMPT.md` is the original brief; where it differs,
  this file and `roadmap.md` win.

## Working cheaply

- Read only what the current target lists. `Grep` a section id and read its
  range instead of whole files. Don't re-read a file after editing it.
- Prefer text and computed values (`npm run -s shot -- --eval "<js>"`) to
  images. Screenshot once per build pass, not per target, and view a
  `.shots/cmp-*.png` crop only when a diff or check calls for it.
- `npm test` is fast; run it after CSS or JS changes. `check:looks` only when
  Look or theme code changes, `check:motion` only when motion, transition or
  demo code changes. Don't build, deploy or check live headers more
  than once per build pass.
- Use `-s` with npm scripts and keep command output short (`tail`, `grep`).
- Don't spawn subagents, loops or workflows unless asked. Work inline.
- Stop at the end of a build pass and report; the next one starts in a fresh
  thread.
