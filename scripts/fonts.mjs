// Writes the eight faces into public/assets/fonts/, cut down to the Latin set.
//
//   node scripts/fonts.mjs        (dev only; needs Python with fonttools and brotli:
//                                  pip install fonttools brotli)
//
// The handoff's files carry every script each family covers: Newsreader alone
// is 455 kB, which on a slow phone link holds the first paint for seconds. This
// keeps the range Google Fonts serves as "latin", plus the arrows the copy
// uses, and every feature, hint and name. Newsreader is drawn at one weight,
// so its weight axis is fixed at 400; Fraunces keeps its weight axis (fixing
// it at 420 moves the anti-aliasing) and drops SOFT and WONK to their
// defaults. Optical size stays in both.
// Each glyph the site draws is the handoff's own. The licences allow it, and
// none reserves a font name. Check a change with shot.mjs: the page should not
// move a pixel.
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";

const FROM = "private/rise-website-v1/canvas/ds/riseds/fonts/";
const TO = "public/assets/fonts/";
const LATIN = [
  "U+0000-00FF", "U+0131", "U+0152-0153", "U+02BB-02BC", "U+02C6", "U+02DA", "U+02DC", "U+0304", "U+0308",
  "U+0329", "U+2000-206F", "U+2074", "U+20AC", "U+2122", "U+2190-2199", "U+2212", "U+2215", "U+FEFF", "U+FFFD",
].join(",");
// Axes fixed per file, as fontTools' instancer takes them (drop: the default).
const PIN = {
  "fraunces-normal.woff2": ["SOFT=drop", "WONK=drop"],
  "fraunces-italic.woff2": ["SOFT=drop", "WONK=drop"],
  "newsreader-normal.woff2": ["wght=400"],
  "newsreader-italic.woff2": ["wght=400"],
};
const python = (...a) => execFileSync("python", a, { stdio: "pipe" });

for (const file of fs.readdirSync(FROM).filter((f) => f.endsWith(".woff2"))) {
  let src = FROM + file;
  if (PIN[file]) {
    const tmp = `${os.tmpdir()}/rise-${file}.ttf`;
    python("-m", "fontTools.varLib.instancer", src, ...PIN[file], "-o", tmp);
    src = tmp;
  }
  python(
    "-m", "fontTools.subset", src,
    `--unicodes=${LATIN}`, "--layout-features=*", "--name-IDs=*", "--name-languages=*",
    "--notdef-outline", "--flavor=woff2", `--output-file=${TO}${file}`,
  );
  console.log(`${file}: ${fs.statSync(FROM + file).size} to ${fs.statSync(TO + file).size} bytes`);
}
