// Screenshots the built site in each Look and theme, checks it, and compares it
// with the matching render. One line per shot, so a check costs little to read.
//
//   node scripts/shot.mjs [--page /] [--pairs reel-dark,paper-light] [--widths 1440,390]
//                         [--y 0] [--h 900] [--vh 900] [--eval "js expression"] [--base http://localhost:4173]
//
// --y and --h pick the region to compare, in CSS px from the top of the page
// (default: the whole render). Each shot writes .shots/cmp-<render>.png, the
// render above and the build below, cropped to that region. Look at it only
// when the diff or a check calls for it. Motion is reduced, so every shot shows
// the settled state, as the renders do. Needs `npm run preview` running.
import fs from "node:fs";
import { chromium } from "playwright-core";
import sharp from "sharp";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((out, a, i, all) => (a.startsWith("--") ? [...out, [a.slice(2), all[i + 1]]] : out), []),
);
const BASE = args.base || "http://localhost:4173";
const PAGE = args.page || "/";
const PAIRS = (args.pairs || "reel-dark,paper-light").split(",");
const WIDTHS = (args.widths || "1440,390").split(",").map(Number);
const RENDER = { "/": "landing", "/privacy": "privacy", "/404": "404" }[PAGE];
const RENDERS = "private/rise-website-v1/renders/";
const OUT = ".shots/";
fs.mkdirSync(OUT, { recursive: true });

async function meanDiff(a, b) {
  const [x, y] = await Promise.all([a.raw().toBuffer(), b.raw().toBuffer()]);
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += Math.abs(x[i] - y[i]);
  return sum / x.length;
}

const browser = await chromium.launch({ channel: "chrome", args: ["--disable-lcd-text"] });
for (const pair of PAIRS) {
  for (const width of WIDTHS) {
    const [look, theme] = pair.split("-");
    const scale = width <= 390 && width !== 320 ? 2 : 1;
    const ctx = await browser.newContext({
      viewport: { width, height: args.vh ? Number(args.vh) : width >= 1024 ? 900 : 844 },
      deviceScaleFactor: scale,
      reducedMotion: "reduce",
    });
    await ctx.addInitScript(([l, t]) => {
      localStorage.setItem("rise-site:look", l);
      localStorage.setItem("rise-site:theme", t);
    }, [look, theme]);
    const page = await ctx.newPage();
    const errors = [], offOrigin = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 120)));
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
    page.on("request", (r) => !r.url().startsWith(BASE) && !r.url().startsWith("data:") && offOrigin.push(r.url()));
    await page.goto(BASE + PAGE, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const layout = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll(".rs-site *")) {
        const b = el.getBoundingClientRect();
        if (b.width && (b.left < -0.5 || b.right > innerWidth + 0.5)) out.push(el.className || el.tagName);
      }
      return { overflow: document.documentElement.scrollWidth - innerWidth, outside: out };
    });
    const parts = [`${pair} ${width}`];
    if (args.eval) parts.push(JSON.stringify(await page.evaluate(args.eval)));
    parts.push(layout.overflow > 0 ? `OVERFLOW ${layout.overflow}px` : "no overflow");
    if (layout.outside.length) parts.push(`OUTSIDE ${layout.outside.length}: ${layout.outside.slice(0, 3).join(", ")}`);
    parts.push(errors.length ? `ERRORS ${errors.join(" | ")}` : "no errors");
    parts.push(offOrigin.length ? `OFF-ORIGIN ${offOrigin.join(" ")}` : "no off-origin");

    const renderFile = `${RENDERS}${RENDER}-${width}-${pair}.jpg`;
    if (RENDER && fs.existsSync(renderFile)) {
      const shot = sharp(await page.screenshot({ fullPage: true })).removeAlpha();
      const render = sharp(renderFile).removeAlpha();
      const [sm, rm] = await Promise.all([shot.metadata(), render.metadata()]);
      const top = Math.round((Number(args.y) || 0) * scale);
      const height = Math.min(args.h ? Math.round(Number(args.h) * scale) : rm.height, rm.height - top, sm.height - top);
      const w = Math.min(sm.width, rm.width);
      const region = { left: 0, top, width: w, height };
      const a = sharp(await render.clone().extract(region).toBuffer());
      const b = sharp(await shot.clone().extract(region).toBuffer());
      const diff = await meanDiff(a.clone(), b.clone());
      const name = `${OUT}cmp-${RENDER}-${width}-${pair}.png`;
      await sharp({ create: { width: w, height: height * 2 + 8, channels: 3, background: "#ff00ff" } })
        .composite([{ input: await a.png().toBuffer(), top: 0, left: 0 }, { input: await b.png().toBuffer(), top: height + 8, left: 0 }])
        .png()
        .toFile(name);
      parts.push(`diff ${diff.toFixed(2)}`, `page ${Math.round(sm.height / scale)}px tall, render ${Math.round(rm.height / scale)}px`, name);
    }
    console.log(parts.join(" · "));
    await ctx.close();
  }
}
await browser.close();
