// Reveals. public/js/head.js marks <html> with .rs-js before the first paint
// (unless motion is reduced), which hides each [data-reveal]; this shows each
// one once, with .is-in, as it comes into view. If this script never runs,
// head.js takes the mark off again at load, so nothing stays hidden.

export function initReveal() {
  window.RiseReveal = true;
  const html = document.documentElement;
  if (!html.classList.contains("rs-js")) return;

  const items = document.querySelectorAll("[data-reveal]");
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }
    },
    { threshold: 0.1 },
  );
  items.forEach((el) => io.observe(el));

  // Turning motion off, or printing, shows everything at once.
  const showAll = () => {
    io.disconnect();
    items.forEach((el) => el.classList.add("is-in"));
  };
  window.addEventListener("beforeprint", showAll);
  try {
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
      if (e.matches) showAll();
    });
  } catch {
    // No matchMedia: nothing to follow.
  }
}
