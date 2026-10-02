// Checks motion and the Today demo on the built site: every reveal fires, the
// page still shows without its script or with motion reduced (from the start,
// mid-visit, or for print), the header slims without moving the page, the hero
// sun sets and rises, Look and theme changes land with and without view
// transitions and survive fast clicks, the tilt stays still on touch, and the
// demo ticks, undoes and hands focus on. Prints only the failures and a count.
// Needs `npm run preview` running (or BASE=<url>).
import { chromium } from "playwright-core";
const BASE = process.env.BASE || "http://localhost:4173";
const b = await chromium.launch({ channel: "chrome" });
let fails = 0;
let passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log("FAIL " + msg); } };

async function visit({ path = "/", width = 1440, reduced = "no-preference", touch = false, noModule = false, noTransitions = false, storage = {} } = {}) {
  const ctx = await b.newContext({
    viewport: { width, height: width >= 1024 ? 900 : 844 },
    reducedMotion: reduced,
    hasTouch: touch,
    isMobile: touch,
  });
  await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
  if (noTransitions) await ctx.addInitScript(() => { delete Document.prototype.startViewTransition; });
  if (noModule) await ctx.route(/\/assets\/main-.*\.js$/, (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: "load" });
  await p.waitForTimeout(300);
  return { ctx, p };
}
const wait = (p, ms) => p.waitForTimeout(ms);
// A change applies inside a view transition, a frame or two after the input.
const settle = (p) => wait(p, 600);
const pair = (p) => p.evaluate(() => document.documentElement.dataset.look + "-" + document.documentElement.dataset.theme);
const hidden = (p) => p.evaluate(() => [...document.querySelectorAll("[data-reveal]")]
  .filter((el) => el.getBoundingClientRect().height > 0 && getComputedStyle(el).opacity === "0").length);
const scrollThrough = (p) => p.evaluate(async () => {
  for (let y = 0; y < document.documentElement.scrollHeight; y += 200) {
    scrollTo({ top: y, behavior: "instant" });
    await new Promise((r) => setTimeout(r, 50));
  }
  await new Promise((r) => setTimeout(r, 1500));
});

// 1. Every reveal fires as the page is scrolled through, at both widths, on both pages.
for (const path of ["/", "/privacy"]) for (const width of [1440, 390]) {
  const { ctx, p } = await visit({ path, width });
  ok(await p.evaluate(() => document.documentElement.classList.contains("rs-js")), `${path} ${width}: page marked .rs-js`);
  await scrollThrough(p);
  const left = await p.evaluate(() => [...document.querySelectorAll("[data-reveal]")]
    .filter((el) => el.getBoundingClientRect().height > 0 && !el.classList.contains("is-in")).length);
  ok(left === 0, `${path} ${width}: every reveal fired (${left} did not)`);
  ok(await hidden(p) === 0, `${path} ${width}: nothing left hidden`);
  await ctx.close();
}

// 2. Without the page script, the mark comes off at load and everything shows.
{
  const { ctx, p } = await visit({ noModule: true });
  ok(!(await p.evaluate(() => document.documentElement.classList.contains("rs-js"))) && await hidden(p) === 0, "no page script: nothing hidden");
  await ctx.close();
}

// 3. Reduced motion: nothing hidden, no animation running, the hero sun at its end state.
{
  const { ctx, p } = await visit({ reduced: "reduce", storage: { "rise-site:theme": "dark" } });
  ok(await hidden(p) === 0, "reduced motion: nothing hidden");
  ok(await p.evaluate(() => document.getAnimations().length) === 0, "reduced motion: no animations");
  const sun = await p.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector(".rs-hero-sun")).transform).f);
  ok(sun > 100, `reduced motion: hero sun set for dark at once (${Math.round(sun)})`);
  await ctx.close();
}

// 4. Turning motion off mid-visit, or printing, shows everything still to come.
{
  const { ctx, p } = await visit();
  await p.emulateMedia({ reducedMotion: "reduce" });
  await wait(p, 100);
  ok(await p.evaluate(() => [...document.querySelectorAll("[data-reveal]")].every((el) => el.classList.contains("is-in"))), "motion reduced mid-visit: every reveal shown");
  await ctx.close();
}
{
  const { ctx, p } = await visit();
  await p.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  ok(await p.evaluate(() => [...document.querySelectorAll("[data-reveal]")].every((el) => el.classList.contains("is-in"))), "print: every reveal shown");
  await ctx.close();
}

// 5. The header slims as the page scrolls without moving what is under it; on phones it slips away going down and comes back going up.
for (const width of [1440, 390]) {
  const { ctx, p } = await visit({ width });
  const tops = await p.evaluate(async () => {
    const top = () => Math.round(document.querySelector("main").getBoundingClientRect().top + scrollY);
    const out = [top()];
    scrollTo({ top: 100, behavior: "instant" });
    for (let i = 0; i < 6; i++) { await new Promise((r) => setTimeout(r, 80)); out.push(top()); }
    return out;
  });
  ok(new Set(tops).size === 1, `${width}: header slims without moving the page (${tops.join(",")})`);
  if (width === 390) {
    const cls = await p.evaluate(async () => {
      const h = document.querySelector(".rs-header"), w = () => new Promise((r) => setTimeout(r, 100));
      scrollTo({ top: 2000, behavior: "instant" }); await w();
      scrollTo({ top: 2400, behavior: "instant" }); await w();
      const down = h.classList.contains("is-away");
      scrollTo({ top: 2300, behavior: "instant" }); await w();
      return [down, h.classList.contains("is-away")];
    });
    ok(cls[0] && !cls[1], `390: header away going down, back going up (${cls})`);
  }
  await ctx.close();
}

// 6. The hero sun sets over its 1600ms when the theme goes dark.
{
  const { ctx, p } = await visit({ storage: { "rise-site:theme": "light" } });
  await wait(p, 2000);
  const ys = await p.evaluate(async () => {
    const y = () => Math.round(new DOMMatrix(getComputedStyle(document.querySelector(".rs-hero-sun")).transform).f);
    document.querySelector(".rs-theme").click();
    const out = [];
    for (let i = 0; i < 4; i++) { await new Promise((r) => setTimeout(r, 500)); out.push(y()); }
    return out;
  });
  ok(ys[0] < ys[3] && ys[1] < ys[3] && ys[3] > 100, `hero sun sets gradually (${ys.join(",")})`);
  await ctx.close();
}

// 7. Look and theme changes: the theme wipes from the switch and the class clears; fast clicks land on the right state.
{
  const { ctx, p } = await visit({ storage: { "rise-site:look": "reel", "rise-site:theme": "dark" } });
  await p.click(".rs-theme");
  ok(await p.evaluate(() => document.documentElement.classList.contains("rs-wipe")), "theme change: wipe from the switch");
  await settle(p); await wait(p, 600);
  ok(await pair(p) === "reel-light" && !(await p.evaluate(() => document.documentElement.classList.contains("rs-wipe"))), "theme change: lands on reel-light, wipe class cleared");
  await p.click(".rs-theme"); await p.click(".rs-theme");
  await settle(p);
  ok(await pair(p) === "reel-light", `two fast theme clicks: back on reel-light (got ${await pair(p)})`);
  await p.click('[data-control="look"] [data-value="paper"]'); await p.click(".rs-theme");
  await settle(p);
  ok(await pair(p) === "paper-dark", `Look then theme, fast: paper-dark (got ${await pair(p)})`);
  await p.click(".rs-look[data-pair='reel-light']");
  await settle(p); await wait(p, 600);
  ok(await pair(p) === "reel-light" && !(await p.evaluate(() => document.documentElement.classList.contains("rs-wipe"))), "Two Looks tile: lands on reel-light, wipe class cleared");
  await ctx.close();
}

// 8. Without view transitions the change is immediate.
{
  const { ctx, p } = await visit({ noTransitions: true, storage: { "rise-site:look": "reel", "rise-site:theme": "dark" } });
  const now = await p.evaluate(() => { document.querySelector(".rs-theme").click(); return document.documentElement.dataset.theme; });
  ok(now === "light", `no view transitions: theme switches at once (got ${now})`);
  await ctx.close();
}

// 9. The tilt follows a mouse, and stays still on touch.
for (const touch of [false, true]) {
  const { ctx, p } = await visit({ touch, width: touch ? 390 : 1440 });
  const ty = await p.evaluate(() => {
    const el = document.querySelector(".rs-tilt").parentElement, r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent("pointermove", { clientX: r.right, clientY: r.top, bubbles: true }));
    return el.style.getPropertyValue("--ty");
  });
  ok(touch ? ty === "" : ty === "3.00deg", `${touch ? "touch" : "mouse"}: tilt ${touch ? "stays still" : "leans"} (--ty "${ty}")`);
  await ctx.close();
}

// 10. The demo: starting state, tick, toast, Undo, focus, the toast timing out, the keyboard.
{
  const { ctx, p } = await visit();
  const snap = () => p.evaluate(() => {
    const d = document.querySelector("[data-demo]"), t = d.querySelector("[data-demo-total]");
    return {
      kcal: t.children[1].children[0].textContent,
      status: t.children[0].children[1].textContent,
      foot: t.children[3].children[0].textContent,
      due: d.querySelector("[data-demo-list]").textContent.includes("Due now"),
      toast: d.querySelector("div[data-demo-toast]").textContent,
      focus: document.activeElement.textContent.trim() || document.activeElement.getAttribute("aria-label"),
    };
  });
  let s = await snap();
  ok(s.kcal === "2,285" && s.status === "Partial" && s.foot === "825 to go · 3 blocks" && s.due, `demo starts at 2,285, partial, Snack due (${JSON.stringify(s)})`);
  await p.locator("[data-demo] [data-block='a1']").click();
  s = await snap();
  ok(s.kcal === "2,575" && s.foot === "535 to go · 2 blocks" && !s.due && s.toast === "Snack ticked · 290 kcalUndo", `tick Snack: 2,575, no due card, toast (${JSON.stringify(s)})`);
  ok(s.focus === "Snack", `tick Snack: focus on Snack's row (${s.focus})`);
  await p.locator("[data-demo] div[data-demo-toast] button").click();
  s = await snap();
  ok(s.kcal === "2,285" && s.due && s.toast === "" && s.focus === "Tick Snack", `Undo: back to 2,285, due card back, focus on Tick Snack (${JSON.stringify(s)})`);
  await p.locator("[data-demo] [data-block='b1']").click();
  s = await snap();
  ok(s.kcal === "1,580" && s.status === "Low" && s.toast === "", `untick Breakfast: 1,580, low, no toast (${JSON.stringify(s)})`);
  await p.locator("[data-demo] [data-block='b1']").click();
  await wait(p, 3800);
  ok((await snap()).toast === "", "toast clears after 3.5s");
  await p.locator("[data-demo] [data-block='a1']").focus();
  await p.keyboard.press("Space");
  s = await snap();
  ok(s.kcal === "2,575" && s.focus === "Snack", `keyboard: Space ticks Snack, focus stays with it (${JSON.stringify(s)})`);
  const pressed = await p.evaluate(() => document.querySelector("[data-demo] [data-block='a1']").getAttribute("aria-pressed"));
  ok(pressed === "true", "keyboard: Snack's control reads pressed");
  const live = await p.evaluate(() => [...document.querySelectorAll("[data-demo] button")].filter((x) => !x.closest("[inert]") && !x.disabled).length);
  ok(live === 7, `only the six tick controls and the toast's Undo take focus (${live})`);
  await ctx.close();
}

// 11. The demo follows the Look and theme.
{
  const { ctx, p } = await visit({ storage: { "rise-site:look": "paper", "rise-site:theme": "light" } });
  const same = await p.evaluate(() => getComputedStyle(document.querySelector("[data-demo]")).backgroundColor === getComputedStyle(document.querySelector(".rs-site")).backgroundColor);
  ok(same, "demo takes the page's canvas colour");
  const before = await p.evaluate(() => getComputedStyle(document.querySelector("[data-demo]")).backgroundColor);
  await p.click(".rs-theme"); await settle(p);
  const after = await p.evaluate(() => getComputedStyle(document.querySelector("[data-demo]")).backgroundColor);
  ok(before !== after, `demo follows a theme change (${before} → ${after})`);
  await ctx.close();
}

console.log(fails ? `${fails} failed, ${passes} passed` : `all ${passes} motion checks passed`);
if (fails) process.exitCode = 1;
await b.close();
