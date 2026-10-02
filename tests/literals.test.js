import { describe, expect, it } from "vitest";
import fs from "node:fs";
import {
  LEFTOVER,
  TOKEN_FILES,
  codeFiles,
  codeLiterals,
  htmlFiles,
  inlineViolations,
  styleAttrs,
  styleColourLiterals,
} from "./literals.js";

/**
 * No hard-coded design values outside the two token files.
 *
 * CSS and JS: no hex and no px literal outside src/css/tokens.css and
 * src/css/site-tokens.css, except the exact counts LEFTOVER allows in files
 * kept as exported from the design. HTML: inline style="…" attributes are kept from the
 * design, px and all, but a colour in one is always a token, never hex.
 */

describe("CSS and JS hold no hex or px literals outside the token files", () => {
  const files = codeFiles();
  it("finds the files to check", () => {
    expect(TOKEN_FILES.every((f) => !files.includes(f))).toBe(true);
  });
  it("lists only files that exist in LEFTOVER", () => {
    expect(Object.keys(LEFTOVER).filter((f) => !files.includes(f))).toEqual([]);
  });
  for (const file of files) {
    it(file, () => {
      const got = codeLiterals(fs.readFileSync(file, "utf8"));
      if (LEFTOVER[file]) {
        expect(
          { hex: got.hex.length, px: got.px.length },
          `${file}: literal counts changed; never add one, and lower LEFTOVER when you remove one`,
        ).toEqual(LEFTOVER[file]);
      } else {
        expect(got, `${file}: move these values into a token file`).toEqual({ hex: [], px: [] });
      }
    });
  }
});

describe("HTML inline styles use colour tokens, never hex", () => {
  for (const file of htmlFiles()) {
    it(file, () => {
      const bad = styleAttrs(fs.readFileSync(file, "utf8")).flatMap(styleColourLiterals);
      expect(bad, `${file}: use a var(--…) colour token`).toEqual([]);
    });
  }
});

describe("HTML has nothing inline that the CSP blocks", () => {
  for (const file of htmlFiles()) {
    it(file, () => {
      expect(inlineViolations(fs.readFileSync(file, "utf8")), file).toEqual([]);
    });
  }
});
