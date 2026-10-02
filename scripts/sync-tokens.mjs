// Copies the Rise tokens from a sibling diet-tracker checkout at a named tag,
// so the site and the app share one source of truth.
//
//   node scripts/sync-tokens.mjs            the default tag below
//   node scripts/sync-tokens.mjs v3.1.0     another tag
//
// Reads through `git show <tag>:<path>`, so the checkout's working tree and its
// current branch do not matter. Writes src/css/tokens.css under a header naming
// the tag and commit: every token layer verbatim, without two app-only layers:
//   fonts  the @font-face rules for the app's font files (see below)
//   base   the app's document floor (box-sizing, heading, link and body
//          resets). The design was drawn without it, so the site keeps its own.
// The sync fails if either layer's marker is missing, rather than guess.
//
// Fonts are not synced. The site ships the fuller font files from the design
// handoff (the app's Barlow and Newsreader are Latin subsets, and its Newsreader
// italic is a single weight). They live in public/assets/fonts/ with their
// licences, at the same /assets/fonts/ paths tokens.css loads.
//
// Re-run with each Rise release.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const APP = path.resolve(process.env.RISE_APP_DIR ?? "../diet-tracker");
const TAG = process.argv[2] ?? "v3.0.0";
const TOKENS_SRC = "src/css/tokens.css";
const TOKENS_OUT = "src/css/tokens.css";

const git = (args) =>
  execFileSync("git", ["-C", APP, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

if (!fs.existsSync(path.join(APP, ".git"))) {
  console.error(`No git checkout at ${APP}. Set RISE_APP_DIR to the diet-tracker checkout.`);
  process.exit(1);
}

let commit;
try {
  commit = git(["rev-list", "-n", "1", TAG]).trim();
} catch {
  console.error(`Tag ${TAG} not found in ${APP}.`);
  process.exit(1);
}

const full = git(["show", `${TAG}:${TOKENS_SRC}`]);

// Each layer starts with a marker comment such as "/* ---- fonts --- */".
const marker = (name) => {
  const m = full.match(new RegExp(`^/\\* -+ ${name} ---.*$`, "m"));
  if (!m) {
    console.error(`No "${name}" layer marker in ${TOKENS_SRC} at ${TAG}. Update sync-tokens.mjs.`);
    process.exit(1);
  }
  return m.index;
};
const fonts = marker("fonts");
const foundation = marker("foundation");
const base = marker("base");
if (!(fonts < foundation && foundation < base)) {
  console.error(`Layers in ${TOKENS_SRC} at ${TAG} are not in the expected order. Update sync-tokens.mjs.`);
  process.exit(1);
}
const tokens = full.slice(0, fonts) + full.slice(foundation, base).trimEnd() + "\n";

const header =
  `/* Synced from diet-tracker ${TAG} (${commit}), ${TOKENS_SRC}.\n` +
  `   Written by scripts/sync-tokens.mjs. Do not edit: change the app and re-sync.\n` +
  `   The app's fonts and base layers are left out: the site declares the design's\n` +
  `   own font files in site.css, and keeps the design's document floor. */\n\n`;
fs.mkdirSync(path.dirname(TOKENS_OUT), { recursive: true });
fs.writeFileSync(TOKENS_OUT, header + tokens);

console.log(`Synced ${TOKENS_OUT} from diet-tracker ${TAG} (${commit.slice(0, 7)}).`);
