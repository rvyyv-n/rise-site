/* Rise website: the Look and theme, set before the first paint.

   Loaded as a blocking script in <head>, so it runs before anything is drawn.
   It reads the visitor's saved choices (or, with no saved theme, the device's),
   sets data-look and data-theme on <html>, and then stamps the same state onto
   each control as the parser inserts it: the .rs-site page root, the theme
   switch and the Look switch. A MutationObserver callback runs before the
   browser gets a chance to paint what was inserted, so nothing ever shows in
   the wrong state.

   src/js/looks.js wires the controls up and calls RiseLooks.set() on a change. */
(function () {
  "use strict";

  var KEYS = { look: "rise-site:look", theme: "rise-site:theme" };
  var LOOKS = ["paper", "reel"];
  var THEMES = ["light", "dark"];

  function saved(key, allowed) {
    try {
      var v = localStorage.getItem(key);
      return allowed.indexOf(v) >= 0 ? v : null;
    } catch (e) {
      return null;
    }
  }

  function systemTheme() {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (e) {
      return "dark";
    }
  }

  var state = {
    look: saved(KEYS.look, LOOKS) || "reel",
    theme: saved(KEYS.theme, THEMES) || systemTheme()
  };

  var CONTROLS = '.rs-site, .rs-theme, [data-control="look"] > [role="radio"], .rs-look, img[data-screen]';

  // Bring one element in line with the current state.
  function paint(el) {
    if (el.hasAttribute("data-screen")) {
      // A screenshot: only the active pair is requested, and a change swaps the file.
      // The files are described by width, and each frame's sizes in the markup
      // give its width on screen (the frames scale the screen down with a
      // transform, so its layout width is the file's), so a phone takes the 1x
      // file wherever the frame is small enough for it.
      var base = "/assets/screens/" + el.getAttribute("data-screen") + "-" + state.look + "-" + state.theme;
      var w = Number(el.getAttribute("width"));
      el.srcset = base + ".webp " + w + "w, " + base + "@2x.webp " + 2 * w + "w";
      el.src = base + ".webp";
    } else if (el.classList.contains("rs-site")) {
      el.setAttribute("data-look", state.look);
      el.setAttribute("data-theme", state.theme);
    } else if (el.classList.contains("rs-theme")) {
      el.setAttribute("aria-checked", String(state.theme === "dark"));
    } else if (el.classList.contains("rs-look")) {
      // A Two Looks tile: its button is pressed, and its Radio filled, when it
      // is the current pair.
      var pressed = el.getAttribute("data-pair") === state.look + "-" + state.theme;
      el.setAttribute("aria-pressed", String(pressed));
      var radio = el.parentElement.querySelector("[data-radio]");
      if (radio) radio.style.boxShadow = pressed ? "var(--radio-dot)" : "var(--radio-ring)";
    } else {
      // A Look option in the Rise Segmented control.
      var on = el.getAttribute("data-value") === state.look;
      el.setAttribute("aria-checked", String(on));
      el.tabIndex = on ? 0 : -1;
      el.style.background = on ? "var(--ink)" : "transparent";
      el.style.color = on ? "var(--bg-canvas)" : "var(--ink-muted)";
    }
  }

  function paintWithin(root) {
    if (root.matches && root.matches(CONTROLS)) paint(root);
    var found = root.querySelectorAll(CONTROLS);
    for (var i = 0; i < found.length; i++) paint(found[i]);
  }

  function paintRoot() {
    var html = document.documentElement;
    html.setAttribute("data-look", state.look);
    html.setAttribute("data-theme", state.theme);
  }

  paintRoot();

  // The Look's faces, asked for now rather than once the stylesheet has
  // arrived and the page is laid out.
  var FACES = {
    reel: ["barlow-semi-condensed-500", "barlow-semi-condensed-600", "barlow-semi-condensed-700", "newsreader-italic"],
    paper: ["atkinson-next", "fraunces-normal"]
  };
  FACES[state.look].forEach(function (face) {
    var link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    link.href = "/assets/fonts/" + face + ".woff2";
    document.head.appendChild(link);
  });

  // Reveals hide things until they come into view (src/js/reveal.js), so the
  // page is marked before the first paint, never after it. With reduced motion,
  // or no IntersectionObserver, nothing is hidden. If the page script never
  // runs, the mark comes off at load, so nothing stays hidden.
  var still = false;
  try {
    still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) {}
  if (!still && "IntersectionObserver" in window) {
    document.documentElement.classList.add("rs-js");
    window.addEventListener("load", function () {
      if (!window.RiseReveal) document.documentElement.classList.remove("rs-js");
    });
  }

  // While the page is parsed, catch each control as it arrives.
  var parsing = new MutationObserver(function (records) {
    for (var r = 0; r < records.length; r++) {
      var added = records[r].addedNodes;
      for (var n = 0; n < added.length; n++) {
        if (added[n].nodeType === 1) paintWithin(added[n]);
      }
    }
  });
  parsing.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener(
    "DOMContentLoaded",
    function () {
      parsing.disconnect();
      paintWithin(document);
    },
    { once: true }
  );

  window.RiseLooks = {
    KEYS: KEYS,
    LOOKS: LOOKS,
    THEMES: THEMES,
    systemTheme: systemTheme,
    saved: saved,
    get: function () {
      return { look: state.look, theme: state.theme };
    },
    // Switch at once. src/js/transition.js wraps this call in a view transition.
    set: function (next) {
      state = {
        look: LOOKS.indexOf(next.look) >= 0 ? next.look : state.look,
        theme: THEMES.indexOf(next.theme) >= 0 ? next.theme : state.theme
      };
      paintRoot();
      paintWithin(document);
    }
  };
})();
