// Copies the Rise tokens and fonts from a sibling diet-tracker checkout at a
// named tag, so the site and the app share one source of truth.
//
//   node scripts/sync-tokens.mjs            the default tag below
//   node scripts/sync-tokens.mjs v3.1.0     another tag
//
// Reads through `git show <tag>:<path>`, so the checkout's working tree and its
// current branch do not matter. Writes:
//   src/css/tokens.css          verbatim, under a header naming the tag and commit
//   public/assets/fonts/*.woff2 verbatim (tokens.css loads them from /assets/fonts/)
//
// Re-run with each Rise release.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const APP = path.resolve(process.env.RISE_APP_DIR ?? "../diet-tracker");
const TAG = process.argv[2] ?? "v3.0.0";
const TOKENS_SRC = "src/css/tokens.css";
const FONTS_SRC = "public/assets/fonts/";
const TOKENS_OUT = "src/css/tokens.css";
const FONTS_OUT = "public/assets/fonts";

const git = (args, encoding = "utf8") =>
  execFileSync("git", ["-C", APP, ...args], { encoding, maxBuffer: 64 * 1024 * 1024 });

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

const tokens = git(["show", `${TAG}:${TOKENS_SRC}`]);
const header =
  `/* Synced from diet-tracker ${TAG} (${commit}), ${TOKENS_SRC}.\n` +
  `   Written by scripts/sync-tokens.mjs. Do not edit: change the app and re-sync. */\n\n`;
fs.mkdirSync(path.dirname(TOKENS_OUT), { recursive: true });
fs.writeFileSync(TOKENS_OUT, header + tokens);

const fonts = git(["ls-tree", "--name-only", `${TAG}:${FONTS_SRC}`])
  .split("\n")
  .filter((f) => f.endsWith(".woff2"));
if (fonts.length === 0) {
  console.error(`No .woff2 files in ${FONTS_SRC} at ${TAG}.`);
  process.exit(1);
}
fs.mkdirSync(FONTS_OUT, { recursive: true });
for (const f of fs.readdirSync(FONTS_OUT)) {
  if (f.endsWith(".woff2") && !fonts.includes(f)) fs.rmSync(path.join(FONTS_OUT, f));
}
for (const f of fonts) {
  fs.writeFileSync(path.join(FONTS_OUT, f), git(["show", `${TAG}:${FONTS_SRC}${f}`], "buffer"));
}

console.log(`Synced ${TOKENS_OUT} and ${fonts.length} fonts from diet-tracker ${TAG} (${commit.slice(0, 7)}).`);
