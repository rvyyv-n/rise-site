// Checks the Look and theme behaviour on the built site: fresh visits follow the
// device, saved pairs paint from the first frame, choices survive a reload, the
// keyboard works, and reduced motion stops the switch animating. Prints only the
// failures and a count. Needs `npm run preview` running (or BASE=<url>).
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:4173";
const b = await chromium.launch({ channel: "chrome" });
let fails = 0;
let passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log("FAIL " + msg); } };

// Records, at every frame until settled, what is about to be painted.
const FRAME_PROBE = () => {
  window.__frames = [];
  const tick = () => {
    const site = document.querySelector(".rs-site"), sw = document.querySelector(".rs-theme");
    const on = document.querySelector('[data-control="look"] [aria-checked="true"]');
    const knob = document.querySelector(".rs-theme-knob");
    window.__frames.push({
      html: document.documentElement.dataset.look + "-" + document.documentElement.dataset.theme,
      site: site ? site.dataset.look + "-" + site.dataset.theme : null,
      sw: sw ? sw.getAttribute("aria-checked") : null,
      on: on ? on.dataset.value : null,
      anims: knob ? knob.getAnimations({ subtree: true }).length : 0,
    });
    if (window.__frames.length < 120) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// A change applies inside a view transition, a frame or two after the input
// (and up to 400ms while the screens in view decode); let it land.
const settle = (p) => p.waitForTimeout(600);

async function visit({ scheme = "light", storage = null, delayModule = 0, reduced = "no-preference" } = {}) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: reduced });
  if (storage) {
    await ctx.addInitScript((s) => {
      if (!sessionStorage.getItem("seeded")) {
        for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
        sessionStorage.setItem("seeded", "1");
      }
    }, storage);
  }
  await ctx.addInitScript(FRAME_PROBE);
  if (delayModule) {
    await ctx.route(/\/assets\/main-.*\.js$/, async (r) => { await new Promise((res) => setTimeout(res, delayModule)); r.continue(); });
  }
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "load" });
  await p.waitForTimeout(300);
  return { ctx, p };
}
const frames = (p) => p.evaluate(() => window.__frames);
const state = (p) => p.evaluate(() => ({
  html: document.documentElement.dataset.look + "-" + document.documentElement.dataset.theme,
  site: document.querySelector(".rs-site").dataset.look + "-" + document.querySelector(".rs-site").dataset.theme,
  sw: document.querySelector(".rs-theme").getAttribute("aria-checked"),
  on: document.querySelector('[data-control="look"] [aria-checked="true"]').dataset.value,
  stored: [localStorage.getItem("rise-site:look") || "", localStorage.getItem("rise-site:theme") || ""].join(","),
}));
const steady = (fs, want) => fs.filter((f) => f.site !== null).every((f) =>
  f.html === want && f.site === want && f.sw === String(want.endsWith("dark")) && f.on === want.split("-")[0] && f.anims === 0);

// 1. Fresh visits follow the device; Look defaults to Reel. The module is held back 1.5s, so the first paint is head.js alone.
for (const scheme of ["light", "dark"]) {
  const { ctx, p } = await visit({ scheme, delayModule: 1500 });
  const fs = await frames(p), s = await state(p);
  ok(s.html === `reel-${scheme}` && s.stored === ",", `fresh visit, device ${scheme}: reel-${scheme}, nothing saved (got ${s.html}, saved "${s.stored}")`);
  ok(fs.filter((f) => f.site).length > 3 && steady(fs, `reel-${scheme}`), `  every frame from the first paint shows reel-${scheme}, no switch animation (${fs.filter((f) => f.site).length} frames)`);
  await ctx.close();
}

// 2. Each saved pair is right from the first frame, with the device set the other way and the module held back.
for (const pair of ["paper-light", "paper-dark", "reel-light", "reel-dark"]) {
  const [look, theme] = pair.split("-");
  const { ctx, p } = await visit({ scheme: theme === "dark" ? "light" : "dark", storage: { "rise-site:look": look, "rise-site:theme": theme }, delayModule: 1500 });
  ok(steady(await frames(p), pair), `saved ${pair}, device the opposite: every frame shows ${pair}`);
  await ctx.close();
}

// 3. Choices survive a reload, with no flash after it.
{
  const { ctx, p } = await visit({ scheme: "light" });
  await p.click('[data-control="look"] [data-value="paper"]'); await settle(p);
  let s = await state(p);
  ok(s.html === "paper-light" && s.stored === "paper,", `pick Paper: paper-light, only the Look saved (saved "${s.stored}")`);
  await p.click(".rs-theme"); await settle(p);
  s = await state(p);
  ok(s.html === "paper-dark" && s.sw === "true" && s.stored === "paper,dark", "toggle theme: paper-dark, switch on, both saved");
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(300);
  ok(steady(await frames(p), "paper-dark"), "reload: paper-dark from the first frame");
  await p.click('[data-control="look"] [data-value="reel"]'); await settle(p); await p.click(".rs-theme"); await settle(p);
  await p.reload({ waitUntil: "load" }); await p.waitForTimeout(300);
  ok(steady(await frames(p), "reel-light"), "pick Reel, toggle to light, reload: reel-light from the first frame");
  await ctx.close();
}

// 4. An unpicked theme follows the device live; picking a Look does not pin it; a picked theme does not follow.
{
  const { ctx, p } = await visit({ scheme: "light" });
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(100);
  ok((await state(p)).html === "reel-dark", "device turns dark, theme unpicked: follows to reel-dark");
  await p.click('[data-control="look"] [data-value="paper"]');
  await p.emulateMedia({ colorScheme: "light" }); await p.waitForTimeout(100);
  ok((await state(p)).html === "paper-light", "after picking only a Look, the theme still follows the device");
  await p.click(".rs-theme");
  await p.emulateMedia({ colorScheme: "dark" }); await p.waitForTimeout(100);
  await p.emulateMedia({ colorScheme: "light" }); await p.waitForTimeout(100);
  ok((await state(p)).html === "paper-dark", "after picking a theme, device changes are ignored");
  await ctx.close();
}

// 5. Keyboard: Tab reaches the Look switch on the chosen option, arrows move the choice, Space toggles the theme; focus is visible.
{
  const { ctx, p } = await visit({ scheme: "dark" });
  const tabTo = async (pred) => { for (let i = 0; i < 12; i++) { await p.keyboard.press("Tab"); if (await p.evaluate(pred)) return true; } return false; };
  ok(await tabTo(() => document.activeElement.matches('[data-control="look"] [role="radio"]')), "Tab reaches the Look switch");
  ok((await p.evaluate(() => document.activeElement.dataset.value)) === "reel", "  focus lands on the chosen option (Reel)");
  await p.keyboard.press("ArrowLeft"); await settle(p);
  ok((await state(p)).html === "paper-dark" && (await p.evaluate(() => document.activeElement.dataset.value)) === "paper", "  ArrowLeft picks Paper and moves focus");
  ok(await tabTo(() => document.activeElement.matches(".rs-theme")), "Tab reaches the theme switch next");
  await p.waitForTimeout(400);
  const ring = await p.evaluate(() => getComputedStyle(document.activeElement).boxShadow);
  ok(/rgb\(224, 103, 63\)/.test(ring), `  focus ring visible on the theme switch (${ring})`);
  await p.keyboard.press("Space"); await settle(p);
  ok((await state(p)).html === "paper-light", "  Space toggles the theme");
  await ctx.close();
}

// 6. Reduced motion: the switch's knob does not animate.
{
  const { ctx, p } = await visit({ scheme: "light", reduced: "reduce" });
  await p.click(".rs-theme");
  const anims = await p.evaluate(() => document.querySelector(".rs-theme-knob").getAnimations({ subtree: true }).length);
  const t = await p.evaluate(() => getComputedStyle(document.querySelector(".rs-theme-knob")).transitionDuration);
  ok(anims === 0, `reduced motion: no animation when the theme flips (transition-duration ${t})`);
  await ctx.close();
}
console.log(fails ? `${fails} failed, ${passes} passed` : `all ${passes} looks checks passed`);
if (fails) process.exitCode = 1;
await b.close();
