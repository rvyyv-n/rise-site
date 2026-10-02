import { describe, expect, it } from "vitest";
import { applyRelease, formatSize, pickAsset } from "../scripts/release.mjs";

const apk = {
  name: "Rise_3.1.0.apk",
  size: 2750000,
  browser_download_url: "https://github.com/x/y/releases/download/v3.1.0/Rise_3.1.0.apk",
};
const exe = {
  name: "Rise_3.1.0_x64-setup.exe",
  size: 3000000,
  browser_download_url: "https://github.com/x/y/releases/download/v3.1.0/Rise_3.1.0_x64-setup.exe",
};
const page = `<p>Free · v3.0.0</p>
<a class="a" data-asset="android" href="https://github.com/x/y/releases/latest">Android</a>
<a class="a" data-asset="windows" href="https://github.com/x/y/releases/latest">Windows</a>
<p>Rise_3.0.0.apk · 2.52 MB</p><p>Rise_3.0.0_x64-setup.exe · 2.77 MB</p><span>v3.0.0</span>`;

describe("release", () => {
  it("formats sizes the way the design does", () => {
    expect(formatSize(2644356)).toBe("2.52 MB");
    expect(formatSize(2901229)).toBe("2.77 MB");
  });

  it("picks the assets by extension", () => {
    expect(pickAsset([exe, apk], "android")).toBe(apk);
    expect(pickAsset([exe, apk], "windows")).toBe(exe);
    expect(pickAsset([], "android")).toBeNull();
  });

  it("writes the version, names, sizes and direct URLs", () => {
    const out = applyRelease(page, { tag_name: "v3.1.0", assets: [apk, exe] });
    expect(out).not.toContain("3.0.0");
    expect(out).toContain("Rise_3.1.0.apk · 2.62 MB");
    expect(out).toContain(`href="${apk.browser_download_url}"`);
    expect(out).toContain(`href="${exe.browser_download_url}"`);
  });

  it("leaves the page alone when the release has nothing", () => {
    expect(applyRelease(page, null)).toBe(page);
    expect(applyRelease(page, { assets: [] })).toBe(page);
  });
});
