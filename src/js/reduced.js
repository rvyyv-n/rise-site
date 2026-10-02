// True when the visitor has asked for reduced motion. Read on each use, so a
// change in the system setting takes effect without a reload.
export function reduced() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}
