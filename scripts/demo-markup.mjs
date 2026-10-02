// Writes the live Today phone in index.html (#today) from the design. It runs
// the design system's own components from the handoff bundle against a small
// stand-in for React, so the markup and inline styles are exactly what the
// design renders, then splices the result between the phone's screen tags.
// Dev only: the handoff is read here, never imported or shipped. Run it after
// the design system or the design's Today screen changes, then check the demo
// with `npm run check:motion`.
//
//   node scripts/demo-markup.mjs
import fs from "node:fs";
import vm from "node:vm";

const BUNDLE = "private/rise-website-v1/canvas/ds/riseds/components/bundle.js";

// ---------- a stand-in for React that renders to an HTML string ----------
const UNITLESS = new Set(["zIndex", "fontWeight", "lineHeight", "opacity", "flex", "flexGrow", "flexShrink", "order"]);
const ATTR = { className: "class", strokeWidth: "stroke-width", strokeLinecap: "stroke-linecap", strokeLinejoin: "stroke-linejoin" };
const VOID = new Set(["br", "path", "rect", "circle", "line", "polyline", "ellipse", "polygon"]);
const Fragment = Symbol("Fragment");
const kebab = (k) => k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
// As React writes a style object: numbers are px, except unitless ones and 0.
const css = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => `${kebab(k)}: ${typeof v === "number" && !UNITLESS.has(k) && v !== 0 ? v + "px" : v}`)
    .join("; ");

function render(node) {
  if (node === null || node === undefined || node === false || node === true) return "";
  if (Array.isArray(node)) return node.map(render).join("");
  if (typeof node !== "object") return esc(node);
  const { type, props } = node;
  if (type === Fragment) return render(props.children);
  if (typeof type === "function") return render(type(props));
  let attrs = "";
  for (const [k, v] of Object.entries(props)) {
    if (k === "children" || k === "key" || /^on[A-Z]/.test(k) || v === undefined || v === null || v === false) continue;
    if (k === "style") {
      const s = css(v);
      if (s) attrs += ` style="${esc(s)}"`;
      continue;
    }
    attrs += v === true ? ` ${ATTR[k] || k}` : ` ${ATTR[k] || k}="${esc(v)}"`;
  }
  if (VOID.has(type) && !props.children) return type === "br" ? "<br>" : `<${type}${attrs}/>`;
  return `<${type}${attrs}>${render(props.children)}</${type}>`;
}

const React = {
  createElement: (type, props, ...children) => ({ type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }),
  Fragment,
  useState: (v) => [v, () => {}],
  useRef: () => ({ current: null }),
  useEffect: () => {},
};
const ctx = { window: { React } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(BUNDLE, "utf8"), ctx);
const DS = ctx.window.RiseDS;
const h = (C, props, ...children) => render(React.createElement(DS[C], props, ...children));
const on = () => {};

// ---------- the design's Today screen: blocks and renderVals, at its starting state ----------
const CLOCK = "16:10";
const TARGET = 3110;
const BLOCKS = [
  { id: "b1", t: "08:00", n: "Breakfast", d: "Eggs, flatbreads, milk, butter", k: 705, p: 34, swap: true },
  { id: "b2", t: "11:00", n: "Shake", d: "Milk, banana, PB, oats", k: 580, p: 22, key: true },
  { id: "b3", t: "13:30", n: "Lunch", d: "Chicken curry and rice", k: 580, p: 33, swap: true },
  { id: "wrap", t: "14:20", n: "Chicken wrap", d: "", k: 420, p: 24, off: true },
  { id: "a1", t: "16:00", n: "Snack", d: "Yogurt, dates and almonds", k: 290, p: 11, swap: true, add: true },
  { id: "b4", t: "19:30", n: "Dinner", d: "Egg curry, lentil stew, flatbreads", k: 700, p: 37, swap: true },
  { id: "a2", t: "22:00", n: "Pre-bed", d: "Milk and peanut butter", k: 255, p: 12, add: true },
];
const ticked = ["b1", "b2", "b3"];
const isT = (i) => !!i.off || ticked.includes(i.id);
let kcal = 0, protein = 0, left = 0;
for (const i of BLOCKS) if (isT(i)) { kcal += i.k; protein += i.p; } else left++;
const due = [...BLOCKS].reverse().find((i) => !isT(i) && i.t <= CLOCK);
let rows = "", nowDone = false;
const now = () => { if (!nowDone) { rows += h("NowMarker", { time: CLOCK }) + "\n"; nowDone = true; } };
for (const i of BLOCKS) {
  if (i.t > CLOCK) now();
  if (due && i.id === due.id) {
    now();
    rows += h("DueCard", { label: "Due now · " + i.t + (i.add ? " · Add-on" : "") + (i.key ? " · Most skipped" : ""), name: i.n, desc: i.d, kcal: i.k, protein: i.p, swappable: !!i.swap, onTick: on }) + "\n";
    continue;
  }
  const done = isT(i), receded = !done && i.t < CLOCK;
  rows += h("BlockRow", {
    time: i.t, name: i.n, kcal: i.k,
    state: i.off ? "off" : done ? "done" : receded ? "receded" : "idle",
    link: i.off ? "Remove" : i.swap && !done && !receded ? "Swap" : undefined,
    tag: i.add ? "add-on" : i.key && !done ? "most skipped" : undefined,
    onToggle: i.off ? undefined : on,
  }) + "\n";
}
now();
const f = Math.max(0, Math.min(1, kcal / TARGET));
const gap = TARGET - kcal;
const status = kcal === 0 ? "none" : kcal >= TARGET ? "on-track" : f >= 0.55 ? "partial" : "low";
const days = ["on-track", "on-track", "partial", "low", "on-track", "on-track"].map((status) => ({ status })).concat({ status: "today", selected: true });

// ---------- the site's changes: --f for the bar and sun, inert for controls the demo does not run ----------
const total = h("DayTotal", { eyebrow: "Phase 2 · Week 6", kcal, target: TARGET, status, protein, proteinTarget: 150, remaining: "@remaining" })
  .split(String(f)).join("var(--f)")
  .replace('<div style="font-variant-numeric: tabular-nums">', `<div data-demo-total style="--f: ${f.toFixed(4)}; font-variant-numeric: tabular-nums">`)
  .replace("<span>@remaining</span>", `<span><b>${gap.toLocaleString("en-US")}</b> to go · ${left} block${left === 1 ? "" : "s"}</span>`);
const inertLinks = (s) => s.replace(/<button type="button" style="border: 0; background: none; padding: 0; margin-left: 6px;/g, '<button type="button" inert style="border: 0; background: none; padding: 0; margin-left: 6px;');
const inertSwap = (s) => s.replace(/<button type="button"( style="[^"]*due-secondary-edge\)")>Swap/g, '<button type="button" inert$1>Swap');
const inertBoth = (s) => inertSwap(inertLinks(s));
const row = (state) => h("BlockRow", { time: "", name: "", kcal: "", state, link: state === "idle" ? "Swap" : undefined, tag: "add-on", onToggle: on });

const screen = `<div class="rs-phone-screen">
<div data-demo style="position: relative; width: 390px; height: 844px; overflow: hidden; background-color: var(--bg-canvas); background-image: var(--texture); color: var(--ink); font-family: var(--font-body)">
<div style="padding: 36px 20px 0">
${h("DotStrip", { days, label: "Wed 30" }).replace(/^<div /, "<div inert ")}
</div>
<div style="margin-top: 22px">
${total}
</div>
<div style="margin-top: 26px">
<div data-demo-list style="position: relative; isolation: isolate; padding: 0 20px 0 0">
<div style="position: absolute; z-index: -1; left: 87px; top: 8px; bottom: 8px; width: 2px; background: var(--line)"></div>
${inertBoth(rows).trim()}
</div>
</div>
<div inert style="padding: 0 20px; margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px">
${h("Button", { variant: "secondary" }, "+ Log food")}
${h("Button", { variant: "secondary" }, "+ Add a block")}
</div>
${h("PhoneNav", { active: "today" }).replace("<nav ", "<nav inert ")}
<div data-demo-toast role="status"></div>
<template data-demo-row="idle">${inertLinks(row("idle"))}</template>
<template data-demo-row="done">${row("done")}</template>
<template data-demo-row="receded">${row("receded")}</template>
<template data-demo-due>${inertSwap(h("DueCard", { label: "", name: "", desc: "x", kcal: "", protein: "", swappable: true, onTick: on }))}</template>
<template data-demo-toast>${h("Toast", { message: "", onUndo: on }).replace(' role="status"', "")}</template>
</div>
</div>`;

// ---------- splice it into #today ----------
const page = fs.readFileSync("index.html", "utf8");
const start = page.indexOf('<div class="rs-phone-screen">\n<div data-demo ');
const end = page.indexOf("</div>\n</div>", page.indexOf("<template data-demo-toast>", start)) + "</div>\n</div>".length;
if (start < 0 || end < start) throw new Error("demo-markup: the #today phone screen was not found in index.html");
const next = page.slice(0, start) + screen + page.slice(end);
fs.writeFileSync("index.html", next);
console.log(next === page ? "demo-markup: index.html already up to date" : "demo-markup: wrote the #today phone screen");
