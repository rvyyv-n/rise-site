// The live Today phone in #today: tick a meal and the total, the bar, the sun
// and the due card move, with the app's toast and Undo. Ported from the
// design's Today screen (blocks, toggle, renderVals). The page holds the
// starting state; this rebuilds the list from the templates beside it. Every
// colour is a token, so the phone follows the Look and theme.

const CLOCK = "16:10";
const TARGET = 3110;
const PROTEIN_TARGET = 150;
const BLOCKS = [
  { id: "b1", t: "08:00", n: "Breakfast", d: "Eggs, flatbreads, milk, butter", k: 705, p: 34, swap: true },
  { id: "b2", t: "11:00", n: "Shake", d: "Milk, banana, PB, oats", k: 580, p: 22, key: true },
  { id: "b3", t: "13:30", n: "Lunch", d: "Chicken curry and rice", k: 580, p: 33, swap: true },
  { id: "wrap", t: "14:20", n: "Chicken wrap", d: "", k: 420, p: 24, off: true },
  { id: "a1", t: "16:00", n: "Snack", d: "Yogurt, dates and almonds", k: 290, p: 11, swap: true, add: true },
  { id: "b4", t: "19:30", n: "Dinner", d: "Egg curry, lentil stew, flatbreads", k: 700, p: 37, swap: true },
  { id: "a2", t: "22:00", n: "Pre-bed", d: "Milk and peanut butter", k: 255, p: 12, add: true },
];
const STATUS = {
  "on-track": ["var(--intake-on-track)", "On track"],
  partial: ["var(--intake-partial)", "Partial"],
  low: ["var(--intake-low)", "Low"],
  none: ["var(--ink-soft)", "Not started"],
};
const fmt = (n) => n.toLocaleString("en-US");

export function initDemo() {
  const root = document.querySelector("[data-demo]");
  if (!root) return;
  const list = root.querySelector("[data-demo-list]");
  const total = root.querySelector("[data-demo-total]");
  const toastRegion = root.querySelector("div[data-demo-toast]");
  const tpl = (sel) => root.querySelector(`template${sel}`).content.firstElementChild.cloneNode(true);
  // The pieces that never change are kept from the page: the timeline's line,
  // the now marker and the off-plan row.
  const [line, ...start] = list.children;
  const nowMarker = start.find((el) => el.textContent === CLOCK);
  const offRow = start.find((el) => el.textContent.includes("off plan"));

  let ticked = ["b1", "b2", "b3"];
  let timer = 0;
  const isTicked = (b) => !!b.off || ticked.includes(b.id);
  const control = (id) => list.querySelector(`[data-block="${id}"]`);

  // The Rise Button's press: scale .97 while held.
  function press(button) {
    const set = (v) => () => (button.style.transform = v);
    button.addEventListener("pointerdown", set("scale(.97)"));
    button.addEventListener("pointerup", set("none"));
    button.addEventListener("pointerleave", set("none"));
  }

  function row(b, state) {
    const el = tpl(`[data-demo-row="${state}"]`);
    const [time, tick, name, kcal] = el.children;
    time.textContent = b.t;
    tick.setAttribute("aria-label", b.n);
    tick.setAttribute("aria-pressed", String(state === "done"));
    tick.dataset.block = b.id;
    name.prepend(b.n);
    const link = name.querySelector("button");
    if (link && !b.swap) link.remove();
    const tag = b.add ? "add-on" : b.key && state !== "done" ? "most skipped" : "";
    if (tag) name.querySelector("span").textContent = tag;
    else name.querySelector("span").remove();
    kcal.textContent = b.k;
    return el;
  }

  function dueCard(b) {
    const el = tpl("[data-demo-due]");
    const [top, actions] = el.children;
    const [info, nums] = top.children;
    const [label, title, desc] = info.children;
    label.textContent = "Due now · " + b.t + (b.add ? " · Add-on" : "") + (b.key ? " · Most skipped" : "");
    title.textContent = b.n;
    if (b.d) desc.textContent = b.d;
    else desc.remove();
    nums.children[0].textContent = b.k;
    nums.children[1].textContent = `kcal · ${b.p} g`;
    const [swap, tick] = actions.children;
    if (!b.swap) {
      swap.remove();
      actions.style.gridTemplateColumns = "1fr";
    }
    tick.replaceChildren(tick.querySelector("svg"), "Tick ", b.n);
    tick.dataset.block = b.id;
    press(tick);
    return el;
  }

  function render() {
    let kcal = 0;
    let protein = 0;
    let left = 0;
    for (const b of BLOCKS) {
      if (isTicked(b)) {
        kcal += b.k;
        protein += b.p;
      } else left++;
    }
    const due = [...BLOCKS].reverse().find((b) => !isTicked(b) && b.t <= CLOCK);

    const nodes = [];
    const now = () => nodes.includes(nowMarker) || nodes.push(nowMarker);
    for (const b of BLOCKS) {
      if (b.t > CLOCK) now();
      if (b === due) {
        now();
        nodes.push(dueCard(b));
      } else if (b.off) {
        nodes.push(offRow);
      } else {
        const done = isTicked(b);
        nodes.push(row(b, done ? "done" : b.t < CLOCK ? "receded" : "idle"));
      }
    }
    now();
    list.replaceChildren(line, ...nodes);

    const f = Math.max(0, Math.min(1, kcal / TARGET));
    const status = kcal === 0 ? "none" : kcal >= TARGET ? "on-track" : f >= 0.55 ? "partial" : "low";
    const [head, figures, bar, foot] = total.children;
    total.style.setProperty("--f", f.toFixed(4));
    const dot = head.children[1];
    dot.firstElementChild.style.background = STATUS[status][0];
    dot.lastChild.textContent = STATUS[status][1];
    figures.children[0].textContent = fmt(kcal);
    bar.children[1].style.background = STATUS[status][0];
    bar.children[4].hidden = f >= 0.9;
    const gap = TARGET - kcal;
    const bold = document.createElement("b");
    bold.textContent = fmt(Math.abs(gap));
    const rest = gap <= 0 ? " over target" : ` to go · ${left} block${left === 1 ? "" : "s"}`;
    foot.children[0].replaceChildren(bold, rest);
    foot.children[1].textContent = `Protein ${protein}/${PROTEIN_TARGET} g`;
  }

  function hideToast() {
    clearTimeout(timer);
    const had = toastRegion.contains(document.activeElement);
    const id = toastRegion.dataset.block;
    toastRegion.replaceChildren();
    if (had && id) control(id)?.focus();
  }

  function showToast(b, undo) {
    const el = tpl("[data-demo-toast]");
    el.prepend(`${b.n} ticked · ${b.k} kcal`);
    el.querySelector("button").addEventListener("click", undo);
    toastRegion.dataset.block = b.id;
    toastRegion.replaceChildren(el);
    timer = setTimeout(hideToast, 3500);
  }

  function toggle(id) {
    const before = ticked;
    const on = before.includes(id);
    const b = BLOCKS.find((x) => x.id === id);
    ticked = on ? before.filter((x) => x !== id) : before.concat(id);
    hideToast();
    render();
    if (!on) {
      showToast(b, () => {
        ticked = before;
        render();
        hideToast();
      });
    }
  }

  list.addEventListener("click", (e) => {
    const button = e.target.closest("button[data-block]");
    if (!button) return;
    // The control is rebuilt, so focus follows the meal to its new control.
    const refocus = button.contains(document.activeElement) || button === document.activeElement;
    toggle(button.dataset.block);
    if (refocus) control(button.dataset.block)?.focus();
  });

  render();
}
