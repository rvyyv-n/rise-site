import fs from "node:fs";
import { defineConfig } from "vite";

// Vanilla mode: no plugins. public/_headers is what Cloudflare Pages serves; the
// preview server reads the same "/*" block, so a CSP break shows up locally too.
function pagesHeaders() {
  const lines = fs.readFileSync("public/_headers", "utf8").split(/\r?\n/);
  const headers = {};
  let inAll = false;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      inAll = line.trim() === "/*";
      continue;
    }
    if (!inAll) continue;
    const i = line.indexOf(":");
    headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return headers;
}

export default defineConfig({
  appType: "mpa",
  build: {
    rollupOptions: {
      input: { index: "index.html" },
    },
  },
  preview: {
    headers: pagesHeaders(),
  },
  test: {
    include: ["tests/**/*.test.js"],
  },
});
