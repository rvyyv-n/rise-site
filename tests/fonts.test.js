import { describe, expect, it } from "vitest";
import fs from "node:fs";

// The site ships the design handoff's faces, cut to the Latin set by
// scripts/fonts.mjs, each family with its licence.
const DIR = "public/assets/fonts";
const FAMILIES = {
  "AtkinsonHyperlegibleNext-OFL.txt": ["atkinson-next.woff2"],
  "BarlowSemiCondensed-OFL.txt": [
    "barlow-semi-condensed-500.woff2",
    "barlow-semi-condensed-600.woff2",
    "barlow-semi-condensed-700.woff2",
  ],
  "Fraunces-OFL.txt": ["fraunces-italic.woff2", "fraunces-normal.woff2"],
  "Newsreader-OFL.txt": ["newsreader-italic.woff2", "newsreader-normal.woff2"],
};

describe("fonts", () => {
  const files = fs.readdirSync(DIR);
  it("ships exactly the eight faces and four licences", () => {
    expect(files.sort()).toEqual(
      [...Object.keys(FAMILIES), ...Object.values(FAMILIES).flat()].sort(),
    );
  });
  for (const licence of Object.keys(FAMILIES)) {
    it(`${licence} is the SIL Open Font License 1.1`, () => {
      expect(fs.readFileSync(`${DIR}/${licence}`, "utf8")).toContain(
        "SIL OPEN FONT LICENSE Version 1.1",
      );
    });
  }
});
