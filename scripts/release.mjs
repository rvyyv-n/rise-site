// Writes the latest diet-tracker release into the built pages: the version,
// the two download file names and sizes, and their direct URLs. It runs after
// `vite build` and rewrites dist/*.html. The source HTML carries the design's
// v3.0.0 values and the static /releases/latest links, so if the API cannot be
// read the pages are left as they are and the buttons still land on the right
// page. Asset names are picked the way pickAssetUrl() in the app's
// src/js/core/updates.js does.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.github.com/repos/rvyyv-n/diet-tracker/releases/latest";
const DESIGN = {
  version: "v3.0.0",
  android: { name: "Rise_3.0.0.apk", size: "2.52 MB" },
  windows: { name: "Rise_3.0.0_x64-setup.exe", size: "2.77 MB" },
};

export function pickAsset(assets, build) {
  const list = Array.isArray(assets) ? assets : [];
  const find = (test) => list.find((a) => test(String(a?.name ?? "").toLowerCase())) ?? null;
  if (build === "android") return find((n) => n.endsWith(".apk"));
  return find((n) => n.endsWith("-setup.exe") || n.endsWith(".exe"));
}

// The sizes on the page follow the design: bytes / 1024^2 to two places, "MB".
export function formatSize(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Returns the page with the release written in, or the page unchanged for
// anything the release does not have.
export function applyRelease(html, release) {
  let out = html;
  for (const build of ["android", "windows"]) {
    const asset = pickAsset(release?.assets, build);
    if (!asset?.browser_download_url || !asset.name) continue;
    const was = DESIGN[build];
    out = out.split(`${was.name} · ${was.size}`).join(`${asset.name} · ${formatSize(asset.size)}`);
    out = out.replace(
      new RegExp(`(<a\\b[^>]*\\bdata-asset="${build}"[^>]*\\bhref=")[^"]*(")`, "g"),
      (_, a, b) => a + asset.browser_download_url + b,
    );
  }
  const tag = release?.tag_name;
  if (/^v\d[\w.-]*$/.test(tag ?? "")) out = out.split(DESIGN.version).join(tag);
  return out;
}

async function latest() {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "rise-site-build" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(API, { headers, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
  let release;
  try {
    release = await latest();
  } catch (e) {
    console.log(`release: could not read the latest release (${e.message}); links stay on /releases/latest`);
    return;
  }
  for (const file of fs.readdirSync(dist).filter((f) => f.endsWith(".html"))) {
    const p = path.join(dist, file);
    const html = fs.readFileSync(p, "utf8");
    const next = applyRelease(html, release);
    if (next !== html) fs.writeFileSync(p, next);
  }
  console.log(`release: wrote ${release.tag_name}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
