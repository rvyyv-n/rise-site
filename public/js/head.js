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

  var CONTROLS = '.rs-site, .rs-theme, [data-control="look"] > [role="radio"], .rs-look';

  // Bring one element in line with the current state.
  function paint(el) {
    if (el.classList.contains("rs-site")) {
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
    // Switch at once. S9's view transition wraps this call.
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
