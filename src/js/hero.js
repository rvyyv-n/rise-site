// The hero devices lean a little towards a mouse, and the primary button's
// hover tone wells up from where the pointer came in.
import { reduced } from "./reduced.js";

function fine() {
  try {
    return window.matchMedia("(pointer: fine)").matches;
  } catch {
    return false;
  }
}

export function initHero() {
  for (const tilt of document.querySelectorAll(".rs-tilt")) {
    const el = tilt.parentElement;
    el.addEventListener("pointermove", (e) => {
      if (reduced() || !fine()) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--ty", (((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(2) + "deg");
      el.style.setProperty("--tx", (((e.clientY - r.top) / r.height - 0.5) * -4).toFixed(2) + "deg");
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--ty", "0deg");
      el.style.setProperty("--tx", "0deg");
    });
  }

  document.addEventListener("pointerover", (e) => {
    const b = e.target.closest?.(".rs-cta-hero");
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty("--mx", e.clientX - r.left + "px");
    b.style.setProperty("--my", e.clientY - r.top + "px");
  });
}
