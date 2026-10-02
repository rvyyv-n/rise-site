// Get Rise: tag the visitor's own card and open the install steps on their
// browser. Without this the Chrome steps show and nothing is tagged.
const CONTROL = '[data-control="install"]';

function device() {
  let ua = "";
  try {
    ua = navigator.userAgent || "";
  } catch {
    // No user agent: nothing is detected.
  }
  const iphone = /iPhone|iPad|iPod/.test(ua);
  const android = /Android/.test(ua);
  const edge = /Edg\//.test(ua);
  const chromium = /Chrome\/|Chromium\//.test(ua) && !android && !iphone;
  const macSafari = /Macintosh/.test(ua) && /Safari\//.test(ua) && !chromium && !iphone;
  return {
    iphone,
    android,
    windows: /Windows/.test(ua) && !android,
    macSafari,
    chromium,
    browserName: edge ? "Edge" : "Chrome",
  };
}

const dev = device();
const detected = dev.iphone ? "iphone" : dev.macSafari ? "mac" : dev.chromium ? "chrome" : null;

function show(value) {
  for (const radio of document.querySelectorAll(`${CONTROL} > [role="radio"]`)) {
    const on = radio.dataset.value === value;
    radio.setAttribute("aria-checked", String(on));
    radio.style.background = on ? "var(--ink)" : "transparent";
    radio.style.color = on ? "var(--bg-canvas)" : "var(--ink-muted)";
  }
  for (const panel of document.querySelectorAll("[data-install]")) {
    panel.hidden = panel.dataset.install !== value;
  }
  const here = document.querySelector("[data-here='']");
  if (here) {
    here.hidden = !detected || value !== detected;
    here.textContent = detected === "iphone" ? "This device" : "This browser";
  }
}

function onClick(e) {
  const radio = e.target.closest(`${CONTROL} > [role="radio"]`);
  if (radio) show(radio.dataset.value);
}

// A radio group: arrow keys move the choice and the focus.
function onKeydown(e) {
  const radio = e.target.closest(`${CONTROL} > [role="radio"]`);
  if (!radio) return;
  const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
  if (!step) return;
  e.preventDefault();
  const radios = [...radio.parentElement.querySelectorAll('[role="radio"]')];
  const next = radios[(radios.indexOf(radio) + step + radios.length) % radios.length];
  show(next.dataset.value);
  next.focus();
}

export function initInstall() {
  if (!document.querySelector(CONTROL)) return;
  for (const el of document.querySelectorAll("[data-browser]")) el.textContent = dev.browserName;
  if (dev.android) document.querySelector('[data-here="android"]').hidden = false;
  if (dev.windows) document.querySelector('[data-here="windows"]').hidden = false;
  show(detected || "chrome");
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeydown);
}
