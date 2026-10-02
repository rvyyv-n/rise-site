// The Look and theme controls. public/js/head.js has already applied the
// starting state before the first paint; this wires up the header's Look switch
// and theme switch, saves what the visitor picks, and keeps an unpicked theme in
// step with the device.

const looks = window.RiseLooks;

function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or storage off: the choice still applies to this page.
  }
}

// Only what the visitor picked is saved: picking a Look leaves the theme
// following the device.
export function pick(next) {
  if (next.look) save(looks.KEYS.look, next.look);
  if (next.theme) save(looks.KEYS.theme, next.theme);
  looks.set(next);
}

const LOOK_OPTION = '[data-control="look"] > [role="radio"]';

function onClick(e) {
  const option = e.target.closest(LOOK_OPTION);
  if (option) {
    pick({ look: option.dataset.value });
    return;
  }
  if (e.target.closest(".rs-theme")) {
    pick({ theme: looks.get().theme === "dark" ? "light" : "dark" });
  }
}

// The Look switch is a radio group: arrow keys move the choice and the focus.
function onKeydown(e) {
  const option = e.target.closest(LOOK_OPTION);
  if (!option) return;
  const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const options = [...option.parentElement.querySelectorAll('[role="radio"]')];
  const next = options[(options.indexOf(option) + step + options.length) % options.length];
  pick({ look: next.dataset.value });
  next.focus();
}

export function initLooks() {
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeydown);
  try {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!looks.saved(looks.KEYS.theme, looks.THEMES)) looks.set({ theme: looks.systemTheme() });
    });
  } catch {
    // No matchMedia: the theme stays as it started.
  }
}
