---
name: build-pass
description: Run a Rise site build pass by number or name - "build pass 2" to "build pass 6", or its name (landing, shots, get and pages, interaction, audit), or one of its targets (hero, sections, shots, downloads, privacy, motion, demo, audit, or S4 to S11). Use whenever the user names one, or says "next build pass". Builds each target in the group from roadmap.md in order, one commit per target, verifies once, deploys, updates the roadmap and stops.
---

# Build a build pass

`roadmap.md` is the spec: the build pass table, the model for each, and each
target's Reads / Does / Done when. `CLAUDE.md` holds the rules. This skill is
the protocol.

## 1. What to run

- "build pass N", its name, or "next build pass" (the first one not Done) runs
  every unfinished target in that group, in order. A single target name runs
  just that target.
- Build passes run in order. If an earlier one isn't done, say which and ask.
- If this session's model differs from the roadmap's, say so in one line and
  carry on unless the user wants to switch.

## 2. For each target

**Read only what it lists.** The target's entry in `roadmap.md`, then its
Reads. In `Main.dc.html`, `Grep` the section id and read that line range. Read
plan sections by heading, never the whole plan. Look at a render only as a crop
from `npm run shot` (below), not the full JPG: the landing renders are up to
16,000px tall.

**Plan in a few lines, then build.** Copy structure, class names, inline
styles and values exactly; replace only the runtime constructs. If the plan
and the source disagree and the roadmap doesn't settle it, stop and ask.

**Check while building, cheaply.** `npm test` after CSS or JS changes (it is
fast and quiet). Prove a change with text or computed values:
`npm run -s shot -- --pairs reel-dark --widths 1440 --eval "<js>"`. No
screenshots per target.

**Commit** each target: `build pass N <target>: <what it does>`, then a few
bullets. No co-author or generated-by line, and no mention of any AI assistant.
If a target removes a literal from `site.css`, lower `LEFTOVER` in
`tests/literals.js` in the same commit.

## 3. Once per build pass, after the last target

1. `npm test` and `npm run build`; start `npm run preview` in the background.
2. `npm run -s shot -- --y <top> --h <height>` for the region the pass
   changed (Reel dark and Paper light, 1440 and 390, by default). Each line
   gives overflow, errors, off-origin requests and a diff against the render.
   Then `--widths 320` for clipping. Add `--pairs reel-light,paper-dark` only
   if the pass changed something pair-specific.
3. View a `.shots/cmp-*.png` only where a diff is high or a check failed, and
   keep `--h` small so the image is small. Report every visible difference.
4. `npm run -s check:looks` only if the pass touched `head.js`, `looks.js`, the
   header or the tiles; `npm run -s check:motion` only if it touched
   `head.js`, the motion or transition scripts, the header or the demo.
5. Push, deploy by hand while `CLOUDFLARE_API_TOKEN` is unset (see roadmap),
   and run `npm run check:headers -- https://getrise.pages.dev` once.
6. Stop the preview server.

## 4. Docs and report

Mark the build pass Done in `roadmap.md`'s table, remove the finished targets'
entries, and note anything the next pass must know, in the last commit. Then
report in a few plain lines: commits, what was checked and how, every
difference from the renders, anything not verified, and the next build pass.
Don't start the next build pass.
