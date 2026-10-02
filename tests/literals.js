// Detectors for the literal test. Kept apart from the test so they can be
// tested themselves (tests/literals-detect.test.js).

import fs from "node:fs";
import path from "node:path";

// The only CSS files that may hold hex and px values.
export const TOKEN_FILES = ["src/css/tokens.css", "src/css/site-tokens.css"];

// Files ported as exported from the design, which keep the design's own px
// values rather than being rewritten onto new tokens. This is a ratchet: each
// count must match exactly, and is lowered here when a literal goes, so the
// list only ever shrinks. Every other file holds none.
export const LEFTOVER = {};

const SKIP_DIRS = new Set(["node_modules", "dist", "private", ".git", ".wrangler"]);

export const walk = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((e) => !SKIP_DIRS.has(e.name))
        .flatMap((e) =>
          e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
        )
        .map((f) => f.split(path.sep).join("/"))
    : [];

// Shipped code only: CSS and JS under src/ and public/.
export const codeFiles = () =>
  [...walk("src"), ...walk("public")].filter(
    (f) => /\.(css|m?js)$/.test(f) && !TOKEN_FILES.includes(f) && !f.endsWith(".test.js"),
  );

export const htmlFiles = () =>
  walk(".").filter((f) => f.endsWith(".html")).map((f) => f.replace(/^\.\//, ""));

export const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !/^\s*\/\//.test(l))
    .map((l) => l.replace(/\s\/\/\s.*$/, ""))
    .join("\n");

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const PX = /(?<![\w.#-])-?(?:\d+\.?\d*|\.\d+)px\b/g;
const COLOUR_FN = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;

// Hex colours and px lengths in a CSS or JS source, comments excluded.
export function codeLiterals(src) {
  const s = stripComments(src);
  return { hex: s.match(HEX) ?? [], px: s.match(PX) ?? [] };
}

// Every style="…" attribute value in an HTML source.
export function styleAttrs(html) {
  return [...html.matchAll(/\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((m) => m[1] ?? m[2]);
}

// Colours in an inline style must be tokens: no hex, no colour functions.
// The keyword `transparent` is allowed; the design uses it in gradients.
export function styleColourLiterals(style) {
  return [...(style.match(HEX) ?? []), ...(style.match(COLOUR_FN) ?? [])];
}

// What the CSP forbids, caught before deploy: <style> blocks, inline scripts,
// and inline event handlers. style="…" attributes are allowed (style-src-attr).
export function inlineViolations(html) {
  const out = [];
  if (/<style[\s>]/i.test(html)) out.push("<style> block");
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\ssrc\s*=/.test(m[1]) || m[2].trim()) out.push("inline <script>");
  }
  for (const m of html.matchAll(/<[a-z][^>]*\s(on[a-z]+)\s*=/gi)) out.push(`${m[1]}= handler`);
  return out;
}
