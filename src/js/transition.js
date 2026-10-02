// One view transition for each Look or theme change. A Look change cross-fades
// the whole page (site.css's ::view-transition rules, 900ms). A theme change
// from a control grows as a circle from that control, 900ms. Without view
// transitions, or with reduced motion, the change is instant.
import { reduced } from "./reduced.js";

let running = null;

// The screens in view change file with the pair; wait briefly for them, so the
// new page is not captured with empty frames.
function screensInView() {
  const imgs = [...document.querySelectorAll("img[data-screen]")].filter((img) => {
    const r = img.getBoundingClientRect();
    return r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
  });
  const decoded = Promise.allSettled(imgs.map((img) => img.decode()));
  return Promise.race([decoded, new Promise((done) => setTimeout(done, 400))]);
}

export function transition(update, origin) {
  const html = document.documentElement;
  if (!document.startViewTransition || reduced()) return update();
  const rect = origin ? origin.getBoundingClientRect() : null;
  html.classList.toggle("rs-wipe", !!rect);

  let t;
  try {
    t = document.startViewTransition(async () => {
      update();
      await screensInView();
    });
  } catch {
    html.classList.remove("rs-wipe");
    return update();
  }
  running = t;

  if (rect) {
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const w = window.innerWidth;
    const h = Math.min(window.innerHeight, 1400);
    const r = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
    t.ready
      .then(() => {
        html.animate(
          { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
          { duration: 900, easing: "cubic-bezier(.16,1,.3,1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
  }
  // A newer change skips this one; only the latest takes the wipe class off.
  const done = () => {
    if (running !== t) return;
    running = null;
    html.classList.remove("rs-wipe");
  };
  t.finished.then(done, done);
}
