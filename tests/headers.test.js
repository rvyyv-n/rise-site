import { describe, expect, it } from "vitest";
import fs from "node:fs";

// The CSP decided by the owner on 2026-10-02. Change it here and in public/_headers together.
const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:";

describe("public/_headers", () => {
  const src = fs.readFileSync("public/_headers", "utf8");
  it("applies to every path", () => {
    expect(src.split(/\r?\n/)[0]).toBe("/*");
  });
  it("sets the CSP exactly", () => {
    expect(src).toContain(`  Content-Security-Policy: ${CSP}\n`);
  });
  it("sends no referrer", () => {
    expect(src).toContain("  Referrer-Policy: no-referrer\n");
  });
  it("turns off unused features", () => {
    const line = src.split(/\r?\n/).find((l) => l.trim().startsWith("Permissions-Policy:"));
    expect(line).toBeTruthy();
    for (const f of ["camera", "microphone", "geolocation", "payment", "usb", "browsing-topics"]) {
      expect(line).toContain(`${f}=()`);
    }
  });
});
