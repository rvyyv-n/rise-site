// Checks a served copy of the site sends the security headers from public/_headers.
//
//   node scripts/check-headers.mjs http://localhost:8788    (npm run pages:dev)
//   node scripts/check-headers.mjs https://<project>.pages.dev
//
// Exits non-zero on any missing or different header.

const base = process.argv[2];
if (!base) {
  console.error("Usage: node scripts/check-headers.mjs <base url>");
  process.exit(2);
}

const WANT = {
  "content-security-policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:",
  "referrer-policy": "no-referrer",
};

// Each path a visitor can land on. /privacy and /404 come in S8.
const PATHS = ["/"];

let failed = 0;
for (const p of PATHS) {
  const url = new URL(p, base).href;
  const res = await fetch(url, { redirect: "manual" });
  console.log(`${res.status} ${url}`);
  if (res.status !== 200) {
    console.log("  FAIL status");
    failed++;
  }
  for (const [name, value] of Object.entries(WANT)) {
    const got = res.headers.get(name);
    const ok = got === value;
    if (!ok) failed++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${name}: ${got ?? "(missing)"}`);
  }
  const pp = res.headers.get("permissions-policy");
  const ok = !!pp && /camera=\(\)/.test(pp) && /geolocation=\(\)/.test(pp);
  if (!ok) failed++;
  console.log(`  ${ok ? "ok  " : "FAIL"} permissions-policy: ${pp ?? "(missing)"}`);
}

if (failed) {
  console.error(`${failed} header check(s) failed.`);
  process.exit(1);
}
console.log("All header checks passed.");
