// The site audit: every page, Look, theme and width, against the built site.
//
//   node scripts/audit.mjs [--only requests,contrast,targets,shift,lighthouse,screens]
//                          [--base http://localhost:4173]
//
// requests  any request that leaves the origin is blocked and fails the run
// contrast  every visible run of text against the colour drawn behind it
// targets   every control the keyboard can reach is hit across a 44px square
// shift     layout shift while the fonts load on a slow link
// lighthouse  the four scores, desktop and mobile, for each page; 95 or above
// screens   the 24 app screens against their renders, each written beside its
//           render to .shots/cmp-screen-*.png
//
// One line per page and pair, then a summary. Exits 1 on any failure apart from
// the accepted contrast shortfall (ACCEPTED). Needs `npm run preview` running.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((out, a, i, all) => (a.startsWith("--") ? [...out, [a.slice(2), all[i + 1]]] : out), []),
);
const BASE = args.base || "http://localhost:4173";
const ONLY = new Set((args.only || "requests,contrast,targets,shift,lighthouse,screens").split(","));
const PAGES = ["/", "/privacy", "/404"];
const PAIRS = ["reel-dark", "reel-light", "paper-dark", "paper-light"];
const WIDTHS = [1440, 390, 320];
const RENDERS = "private/rise-website-v1/renders/";
const OUT = ".shots/";
fs.mkdirSync(OUT, { recursive: true });

// The design's own shortfall, kept to stay 1:1 (roadmap, open items): in Reel
// light, --ink-muted and --accent-text on --bg-sunken.
// Kept as the two ratios they measure, 4.40:1 and 4.10:1.
const ACCEPTED = { "reel-light": [4.4, 4.1] };
const accepted = (pair, ratio) => (ACCEPTED[pair] || []).some((r) => Math.abs(ratio - r) < 0.03);

let failed = 0;
const fail = (line) => (failed++, console.log(`FAIL ${line}`));

const browser = await chromium.launch({ channel: "chrome", args: ["--disable-lcd-text"] });

async function open(pair, width, opts = {}) {
  const [look, theme] = pair.split("-");
  const ctx = await browser.newContext({
    viewport: { width, height: width >= 1024 ? 900 : 844 },
    reducedMotion: opts.motion ? "no-preference" : "reduce",
  });
  await ctx.addInitScript(([l, t]) => {
    localStorage.setItem("rise-site:look", l);
    localStorage.setItem("rise-site:theme", t);
  }, [look, theme]);
  const blocked = [];
  await ctx.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith("data:")) return route.continue();
    blocked.push(url);
    return route.abort("blockedbyclient");
  });
  return { ctx, page: await ctx.newPage(), blocked };
}

// Runs in the page. Each text run's colour, composited over every background
// behind it, against the WCAG thresholds (3:1 for large text).
function contrastIn() {
  const cv = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const rgba = (css) => {
    cv.clearRect(0, 0, 1, 1);
    cv.fillStyle = "#000";
    cv.fillStyle = css;
    cv.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cv.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top, under) => top.slice(0, 3).map((c, i) => c * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = ([r, g, b]) => {
    const f = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // The page grain, drawn on the body and the site shell, is left out.
  const texture = getComputedStyle(document.body).backgroundImage;
  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const el = walker.currentNode.parentElement;
    if (!walker.currentNode.textContent.trim() || seen.has(el)) continue;
    seen.add(el);
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    if (el.closest("[aria-hidden='true'], template, noscript")) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    // Backgrounds, from the page up to the text. The page grain is left out;
    // any other gradient or image is measured from the pixels instead (paint).
    let bg = [255, 255, 255, 1], paint = false, alpha = 1;
    for (let n = el; n; n = n.parentElement) alpha *= Number(getComputedStyle(n).opacity);
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.unshift(n);
    for (const n of chain) {
      const s = getComputedStyle(n);
      const c = rgba(s.backgroundColor);
      if (c[3]) bg = over(c, bg);
      if (s.backgroundImage !== "none" && s.backgroundImage !== texture) paint = true;
    }
    const s = getComputedStyle(el);
    const fg = rgba(s.color);
    fg[3] *= alpha;
    const size = parseFloat(s.fontSize) * (box.width / (el.offsetWidth || box.width));
    const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
    const r = ratio(over(fg, bg), bg);
    const what = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : ""} "${el.textContent.trim().slice(0, 30)}"`;
    if (paint) {
      const range = document.createRange();
      range.selectNodeContents(el);
      const t = range.getBoundingClientRect();
      el.dataset.audit = out.length;
      out.push({ paint: { x: t.left + scrollX, y: t.top + scrollY, width: t.width, height: t.height }, fg, min: large ? 3 : 4.5, large, what });
    } else if (r < (large ? 3 : 4.5)) out.push({ r: Math.round(r * 100) / 100, large, what });
  }
  return out;
}

// In the page and here: hides the text of each painted entry, shoots what is
// behind it, and takes the worst tenth of those pixels.
async function painted(page, entries) {
  const hide = (on) => page.evaluate((on) => {
    for (const el of document.querySelectorAll("[data-audit], [data-audit] *")) {
      if (on) el.style.setProperty("color", "transparent", "important"), el.style.setProperty("transition", "none", "important");
      else el.style.removeProperty("color"), el.style.removeProperty("transition");
    }
  }, on);
  const lum = (r, g, b) => {
    const f = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  await hide(true);
  for (const e of entries.filter((e) => e.paint)) {
    const clip = { ...e.paint, width: Math.max(1, e.paint.width), height: Math.max(1, e.paint.height) };
    const { data, info } = await sharp(await page.screenshot({ fullPage: true, clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const ratios = [];
    for (let i = 0; i < data.length; i += info.channels) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      const [fr, fg, fb] = [0, 1, 2].map((k) => e.fg[k] * e.fg[3] + [r, g, b][k] * (1 - e.fg[3]));
      const [x, y] = [lum(fr, fg, fb), lum(r, g, b)].sort((p, q) => q - p);
      ratios.push((x + 0.05) / (y + 0.05));
    }
    ratios.sort((p, q) => p - q);
    e.r = Math.round(ratios[Math.floor(ratios.length / 10)] * 100) / 100;
  }
  await hide(false);
  return entries.filter((e) => e.r < e.min || (!e.paint && e.r));
}

// Runs in the page. Every control the keyboard reaches, scrolled into view,
// must take a hit across 44px each way through its centre. Links inside a
// sentence are exempt, as WCAG exempts them.
async function targetsIn() {
  const sel = "a[href], button, input, select, textarea, summary, [role=button], [role=radio], [role=tab], [role=switch], [tabindex]:not([tabindex='-1'])";
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest("[inert], template") || el.disabled) continue;
    if (!el.checkVisibility({ visibilityProperty: true })) continue;
    if (getComputedStyle(el).display === "inline" && [...el.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" });
    await new Promise(requestAnimationFrame);
    const b = el.getBoundingClientRect();
    const [cx, cy] = [b.left + b.width / 2, b.top + b.height / 2];
    let miss = 0, by = "";
    // The centre and the middle of each edge: 44px across and 44px down, less
    // a pixel for boxes that sit on fractions. Not the corners, which a pill or
    // circle rounds off.
    let neighbour = true;
    for (const [dx, dy] of [[0, 0], [-21, 0], [21, 0], [0, -21], [0, 21]]) {
      const hit = document.elementFromPoint(cx + dx, cy + dy);
      if (!hit || !(el === hit || el.contains(hit))) miss++, (neighbour &&= !!hit?.closest("[data-demo] button")), (by = hit ? hit.tagName.toLowerCase() + (typeof hit.className === "string" && hit.className ? "." + hit.className.split(" ")[0] : "") : "nothing");
    }
    // The live Today phone's rows are 39px apart on screen at 320, so there its
    // targets overlap their neighbours (roadmap); that much is accepted.
    const accepted = !!el.closest("[data-demo]") && neighbour && innerWidth < 390;
    if (miss) out.push({ miss, by, accepted, w: Math.round(b.width), h: Math.round(b.height), what: `${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 30)}"` });
  }
  scrollTo(0, 0);
  return out;
}

const summary = { blocked: 0, contrast: 0, accepted: 0, targets: 0, overlap: 0 };

if (ONLY.has("requests") || ONLY.has("contrast") || ONLY.has("targets")) {
  for (const path of PAGES) {
    for (const pair of PAIRS) {
      for (const width of WIDTHS) {
        const { ctx, page, blocked } = await open(pair, width);
        await page.goto(BASE + path, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        const parts = [`${path} ${pair} ${width}`];
        if (blocked.length) {
          summary.blocked += blocked.length;
          fail(`${parts[0]} off-origin: ${blocked.join(" ")}`);
        }
        if (ONLY.has("contrast")) {
          const low = await painted(page, await page.evaluate(contrastIn));
          const ok = low.filter((l) => accepted(pair, l.r));
          const bad = low.filter((l) => !ok.includes(l));
          summary.accepted += ok.length;
          summary.contrast += bad.length;
          parts.push(`contrast ${bad.length} low, ${ok.length} accepted`);
          for (const l of bad) fail(`${parts[0]} contrast ${l.r}${l.large ? " (large)" : ""}${l.paint ? " (on a gradient)" : ""} ${l.what}`);
        }
        if (ONLY.has("targets") && (pair === "reel-dark" || pair === "paper-light")) {
          const found = await page.evaluate(targetsIn);
          const small = found.filter((t) => !t.accepted);
          summary.targets += small.length;
          summary.overlap += found.length - small.length;
          parts.push(`targets ${small.length} small, ${found.length - small.length} overlapping in the demo`);
          for (const t of small) fail(`${parts[0]} target ${t.w}x${t.h}, ${t.miss}/5 missed (${t.by}): ${t.what}`);
        }
        console.log(parts.join(" · "));
        await ctx.close();
      }
    }
  }
}

if (ONLY.has("shift")) {
  // A slow link: 150ms and 200 kB/s, so the fonts land well after first paint.
  for (const path of PAGES) {
    for (const pair of ["reel-dark", "paper-light"]) {
      for (const width of [1440, 390]) {
        const { ctx, page, blocked } = await open(pair, width, { motion: true });
        const cdp = await ctx.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: 200 * 1024, uploadThroughput: 200 * 1024 });
        await page.addInitScript(() => {
          window.__cls = 0;
          new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: "layout-shift", buffered: true });
        });
        await page.goto(BASE + path, { waitUntil: "load", timeout: 60000 });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
        const cls = await page.evaluate(() => window.__cls);
        const line = `shift ${path} ${pair} ${width}: ${cls.toFixed(4)}`;
        cls > 0.005 ? fail(line) : console.log(line);
        if (blocked.length) fail(`${path} off-origin: ${blocked.join(" ")}`);
        await ctx.close();
      }
    }
  }
}

if (ONLY.has("screens")) {
  // The app screens, as shipped (2x), scaled to each render and compared.
  const SCREENS = ["today", "weight", "plan-targets", "plan-groceries", "settings", "desktop-today"];
  for (const s of SCREENS) {
    const line = [s];
    for (const pair of PAIRS) {
      const render = sharp(`${RENDERS}screen-${s}-${pair}.jpg`).removeAlpha();
      const { width, height } = await render.metadata();
      const shot = sharp(`public/assets/screens/${s}-${pair}@2x.webp`).removeAlpha().resize(width, height, { fit: "fill" });
      const [x, y] = await Promise.all([render.raw().toBuffer(), shot.raw().toBuffer()]);
      let sum = 0;
      for (let i = 0; i < x.length; i++) sum += Math.abs(x[i] - y[i]);
      line.push(`${pair} ${(sum / x.length).toFixed(2)}`);
      await sharp({ create: { width: width * 2 + 8, height, channels: 3, background: "#ff00ff" } })
        .composite([{ input: await render.clone().png().toBuffer(), left: 0, top: 0 }, { input: await shot.clone().png().toBuffer(), left: width + 8, top: 0 }])
        .png()
        .toFile(`${OUT}cmp-screen-${s}-${pair}.png`);
    }
    console.log(`screen ${line.join(" · ")}`);
  }
}

await browser.close();

if (ONLY.has("lighthouse")) {
  for (const path of PAGES) {
    for (const preset of ["desktop", "mobile"]) {
      const file = `${OUT}lh-${path.slice(1) || "landing"}-${preset}.json`;
      const flags = [BASE + path, "--quiet", "--output=json", `--output-path=${file}`, "--chrome-flags=--headless=new",
        "--only-categories=performance,accessibility,best-practices,seo", "--throttling-method=simulate"];
      if (preset === "desktop") flags.push("--preset=desktop");
      execFileSync(process.execPath, ["node_modules/lighthouse/cli/index.js", ...flags], { stdio: "ignore" });
      const report = JSON.parse(fs.readFileSync(file, "utf8"));
      // The 404 is kept out of search on purpose (noindex, no description), so
      // its SEO score is not held to the bar.
      const cats = Object.values(report.categories)
        .filter((c) => !(path === "/404" && c.id === "seo"))
        .map((c) => [c.id, Math.round(c.score * 100)]);
      const line = `lighthouse ${path} ${preset}: ${cats.map(([id, s]) => `${id} ${s}`).join(", ")}`;
      cats.some(([, s]) => s < 95) ? fail(line) : console.log(line);
    }
  }
}

console.log(`\n${failed ? `${failed} FAILED` : "all passed"} · off-origin ${summary.blocked} · contrast ${summary.contrast} low, ${summary.accepted} accepted · targets ${summary.targets} small, ${summary.overlap} overlapping in the demo`);
process.exit(failed ? 1 : 0);
