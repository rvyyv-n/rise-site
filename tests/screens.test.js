import { describe, expect, it } from "vitest";
import fs from "node:fs";

// Budgets in KB, per file: a phone screen and the desktop one, at 1x and 2x.
const BUDGET = { phone: { "1x": 30, "2x": 60 }, desktop: { "1x": 60, "2x": 120 } };
const SCREENS = ["today", "weight", "plan-groceries", "plan-targets", "settings", "desktop-today"];
const PAIRS = ["reel-dark", "reel-light", "paper-dark", "paper-light"];
const DIR = "public/assets/screens/";

describe("screens", () => {
  for (const name of SCREENS) {
    for (const pair of PAIRS) {
      for (const density of ["1x", "2x"]) {
        const file = `${DIR}${name}-${pair}${density === "2x" ? "@2x" : ""}.webp`;
        it(`${file} exists and is under its budget`, () => {
          const kb = fs.statSync(file).size / 1024;
          const limit = BUDGET[name.startsWith("desktop") ? "desktop" : "phone"][density];
          expect(kb).toBeLessThan(limit);
        });
      }
    }
  }

  it("every image in the page has width, height and alt text", () => {
    const html = fs.readFileSync("index.html", "utf8");
    const imgs = html.match(/<img\b[^>]*>/g) ?? [];
    // Ten: the Today section phone is the live demo, not an image.
    expect(imgs.length).toBeGreaterThanOrEqual(10);
    for (const img of imgs) {
      expect(img).toMatch(/\swidth="\d+"/);
      expect(img).toMatch(/\sheight="\d+"/);
      expect(img).toMatch(/\salt="[^"]+"/);
    }
  });
});
