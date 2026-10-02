// Scroll-linked moments, measured once a frame: the sun's place on the
// header's horizon (--scroll), the header taking the page colour (is-stuck)
// and, on phones, slipping away while reading down (is-away), the No lines
// coming into focus (--o), and the Plan phones drifting apart (--shift).
// With reduced motion the header still takes the page colour and the sun still
// marks the place, but nothing else moves.
import { reduced } from "./reduced.js";

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function initScroll() {
  const root = document.querySelector(".rs-site");
  if (!root) return;
  const header = root.querySelector(".rs-header");
  const sun = root.querySelector(".rs-progress-sun");
  const focus = [...root.querySelectorAll("[data-focus]")];
  const drift = [...root.querySelectorAll("[data-drift]")];
  let lastY = 0;
  let raf = 0;

  function measure() {
    const se = document.scrollingElement || document.documentElement;
    const vh = window.innerHeight || 1;
    const y = se.scrollTop || 0;
    const max = se.scrollHeight - vh;
    const scrolls = max > 40;
    const still = reduced();
    // Set on the sun alone, so a scroll restyles one element, not the page.
    if (sun) sun.style.setProperty("--scroll", scrolls ? clamp(y / max, 0, 1).toFixed(4) : "0");

    if (header) {
      header.classList.toggle("is-stuck", y > 8);
      if (still) header.classList.remove("is-away");
      if (Math.abs(y - lastY) >= 10) {
        // On phones the header slips away while reading down and comes back on the way up.
        const narrow = root.clientWidth <= 640;
        const away = !still && narrow && y > lastY && y > 300 && !header.contains(document.activeElement);
        header.classList.toggle("is-away", away);
        lastY = y;
      }
    }

    if (!scrolls || still) {
      focus.forEach((li) => li.style.removeProperty("--o"));
      drift.forEach((el) => el.style.removeProperty("--shift"));
      return;
    }
    // Read every box first, then write, so the frame lays out once.
    const lines = focus.map((li) => li.getBoundingClientRect());
    const boxes = drift.map((el) => el.getBoundingClientRect());
    focus.forEach((li, i) => {
      const r = lines[i];
      const d = Math.abs(r.top + r.height / 2 - vh * 0.5) / (vh * 0.5);
      li.style.setProperty("--o", String(clamp(1.2 - d, 0.35, 1)));
    });
    drift.forEach((el, i) => {
      // Measured without its own shift, so the drift does not feed back into itself.
      const top = boxes[i].top - (parseFloat(el.style.getPropertyValue("--shift")) || 0);
      const p = clamp((vh - top) / (vh + boxes[i].height), 0, 1);
      el.style.setProperty("--shift", ((p - 0.5) * Number(el.dataset.drift) * 90).toFixed(1) + "px");
    });
  }

  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      measure();
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", onScroll);
  measure();
  // Measure again once fonts and screens have settled the layout.
  document.fonts?.ready.then(onScroll);
  setTimeout(onScroll, 600);
  setTimeout(onScroll, 2400);
}
