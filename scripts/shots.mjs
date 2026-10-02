// Takes the screens the page shows, from the real app, and writes them as WebP.
//
//   node scripts/shots.mjs               the 24 screens, at 1x and 2x
//   node scripts/shots.mjs today weight  only the screens you name
//   node scripts/shots.mjs og            the 1200x630 Open Graph card, from the hero
//
// Adapted from the app's scripts/readme-shots.mjs. It seeds the demo data
// (dev-seed.html), pins the clock, and shoots each screen in each Look and theme
// by setting them on the profile, as the app's own settings do. Files land in
// public/assets/screens/<screen>-<look>-<theme>.webp (1x) and ...@2x.webp.
// The card is shot from the built site, so run `npm run build` and
// `npm run preview` first, and shoot the screens before it.
//
// APP=http://127.0.0.1:5199 is the app's dev server (npm run dev -- --port 5199
// in diet-tracker). SITE=http://localhost:4173 is this site's preview.
import fs from "node:fs";
import { chromium } from "playwright-core";
import sharp from "sharp";

const APP = process.env.APP ?? "http://127.0.0.1:5199";
const SITE = process.env.SITE ?? "http://localhost:4173";
const OUT = "public/assets/screens/";
const CLOCK = "2026-09-30T15:00:00";
const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };
const PAIRS = [
  ["reel", "dark"],
  ["reel", "light"],
  ["paper", "dark"],
  ["paper", "light"],
];

// tab is the app's ?tab=; end scrolls to the bottom, which is how Targets is shown.
const SCREENS = {
  today: { tab: "today", size: PHONE },
  weight: { tab: "weight", size: PHONE },
  "plan-groceries": { tab: "plan", size: PHONE },
  "plan-targets": { tab: "plan", size: PHONE, end: true },
  settings: { tab: "settings", size: PHONE },
  "desktop-today": { tab: "today", size: DESKTOP },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(SCREENS);
for (const n of names) if (n !== "og" && !SCREENS[n]) throw new Error(`unknown screen: ${n}`);

const browser = await chromium.launch({ channel: "chrome", args: ["--disable-lcd-text"] });

async function screens(list) {
  const ctx = await browser.newContext({ viewport: PHONE, deviceScaleFactor: 2, reducedMotion: "reduce" });
  const app = await ctx.newPage();
  const logs = [];
  app.on("console", (m) => m.type() === "error" && logs.push(`console: ${m.text()}`));
  app.on("pageerror", (e) => logs.push(`pageerror: ${e.message}`));
  await app.clock.setFixedTime(new Date(CLOCK));
  await app.goto(APP + "/dev-seed.html");
  await app.locator("#seed").click();
  await app.waitForTimeout(900);

  fs.mkdirSync(OUT, { recursive: true });
  for (const name of list) {
    const { tab, size, end } = SCREENS[name];
    for (const [look, theme] of PAIRS) {
      await app.emulateMedia({ colorScheme: theme });
      await app.setViewportSize(size);
      await app.evaluate(
        ([t, l]) => {
          const profile = JSON.parse(localStorage.getItem("wgt:profile"));
          profile.themePref = t;
          profile.lookPref = l;
          localStorage.setItem("wgt:profile", JSON.stringify(profile));
        },
        [theme, look],
      );
      await app.goto(`${APP}/?tab=${tab}`);
      await app.evaluate("document.fonts.ready");
      await app.waitForTimeout(400);
      const got = app.getByRole("button", { name: "Got it" });
      if (await got.count()) {
        await got.first().click();
        await got.first().waitFor({ state: "detached" });
      }
      if (end) {
        await app.evaluate(() => {
          for (const el of [document.scrollingElement, ...document.querySelectorAll("*")]) {
            if (el.scrollHeight > el.clientHeight + 1) el.scrollTop = el.scrollHeight;
          }
        });
        await app.waitForTimeout(200);
      }
      const png = await app.screenshot();
      const base = `${OUT}${name}-${look}-${theme}`;
      const webp = (img, file) => img.webp({ quality: 80, effort: 6 }).toFile(file);
      await webp(sharp(png), `${base}@2x.webp`);
      await webp(sharp(png).resize(size.width, size.height), `${base}.webp`);
      console.log("saved", `${base}.webp`);
    }
  }
  if (logs.length) console.log([...new Set(logs)].join("\n"));
  await ctx.close();
}

async function card() {
  const ctx = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    localStorage.setItem("rise-site:look", "reel");
    localStorage.setItem("rise-site:theme", "dark");
  });
  const page = await ctx.newPage();
  await page.goto(SITE, { waitUntil: "networkidle" });
  await page.evaluate("document.fonts.ready");
  const clip = { x: (DESKTOP.width - 1200) / 2, y: 0, width: 1200, height: 630 };
  await page.screenshot({ path: "public/assets/og.jpg", type: "jpeg", quality: 85, clip });
  console.log("saved public/assets/og.jpg");
  await ctx.close();
}

const shotNames = names.filter((n) => n !== "og");
if (shotNames.length) await screens(shotNames);
if (names.includes("og")) await card();
await browser.close();
