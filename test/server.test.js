// HTTP-level checks for routes that don't need GitHub (skills card, validation, redirects).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.VERCEL = "1"; // import the app without auto-listening on PORT
process.env.CACHE_TTL_SECONDS = "1800"; // keep header assertions deterministic
const { default: app } = await import("../src/server.js");

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test("bare root serves the URL builder page", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const html = await res.text();
  assert.match(html, /<title>Terminal Card Builder<\/title>/);
  // Every card type the server knows must be selectable in the builder.
  const { getAvailableRenderTypes } = await import("../src/renderer.js");
  for (const type of getAvailableRenderTypes()) {
    assert.match(html, new RegExp(`<option value="${type}">`), `builder is missing ${type}`);
  }
});

test("root with a user still renders the graph card", async () => {
  const res = await fetch(`${base}/?theme=nope&user=x`);
  assert.match(res.headers.get("content-type"), /image\/svg\+xml/);
});

test("skills card is cached and sent with CDN cache headers", async () => {
  const first = await fetch(`${base}/svg/skills?i=js,ts`);
  assert.equal(first.status, 200);
  assert.match(first.headers.get("content-type"), /image\/svg\+xml/);
  assert.match(first.headers.get("cache-control"), /s-maxage=\d+/);
  assert.equal(first.headers.get("x-cache"), "MISS");
  const body = await first.text();
  assert.match(body, /^<svg/);

  const second = await fetch(`${base}/svg/skills?i=js,ts`);
  assert.equal(second.headers.get("x-cache"), "HIT");
  assert.equal(await second.text(), body);
});

test("cache_seconds extends CDN caching, clamped to one day", async () => {
  const extended = await fetch(`${base}/svg/skills?i=js&cache_seconds=7200`);
  assert.equal(extended.status, 200);
  assert.match(extended.headers.get("cache-control"), /s-maxage=7200/);

  const maxed = await fetch(`${base}/svg/skills?i=ts&cache_seconds=999999`);
  assert.match(maxed.headers.get("cache-control"), /s-maxage=86400/);
});

test("cache_seconds below the default or invalid is ignored", async () => {
  const tooShort = await fetch(`${base}/svg/skills?i=react&cache_seconds=5`);
  assert.match(tooShort.headers.get("cache-control"), /s-maxage=1800/);

  const invalid = await fetch(`${base}/svg/skills?i=nodejs&cache_seconds=abc`);
  assert.match(invalid.headers.get("cache-control"), /s-maxage=1800/);
});

test("missing user returns an uncached error card", async () => {
  const res = await fetch(`${base}/svg/stats`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.match(await res.text(), /user/i);
});

test("unknown type and theme return error cards", async () => {
  const badType = await (await fetch(`${base}/svg/nope?user=x`)).text();
  assert.match(badType, /Unknown render type/);
  const badTheme = await (await fetch(`${base}/svg/skills?i=js&theme=nope`)).text();
  assert.match(badTheme, /Unknown theme/);
});

test("theme ignores case", async () => {
  const mac = await (await fetch(`${base}/svg/skills?i=js&theme=mac`)).text();
  const mixed = await (await fetch(`${base}/svg/skills?i=js&theme=Mac`)).text();
  assert.doesNotMatch(mixed, /Unknown theme/);
  assert.equal(mixed, mac);
  const upper = await (await fetch(`${base}/svg/skills?i=js&theme=WIN98`)).text();
  assert.doesNotMatch(upper, /Unknown theme/);
  assert.equal(upper, await (await fetch(`${base}/svg/skills?i=js&theme=win98`)).text());
});

test("editor theme takes its colour scheme from the link", async () => {
  const card = async (query) => (await fetch(`${base}/svg/skills?i=js&theme=editor${query}`)).text();
  const dark = await card("");
  const light = await card("&scheme=light");
  assert.match(dark, /rx="8" fill="#1f1f1f"/);
  assert.match(light, /rx="8" fill="#ffffff"/);
  assert.equal(await card("&scheme=dark"), dark);
  assert.equal(await card("&scheme=nope"), dark);
});

test("editor theme switches to IntelliJ with ide=intellij", async () => {
  const card = async (query) => (await fetch(`${base}/svg/skills?i=js&theme=editor${query}`)).text();
  const vscode = await card("");
  const intellij = await card("&ide=intellij");
  assert.match(intellij, /rx="10" fill="#2b2d30"/);
  assert.doesNotMatch(vscode, /font-family="Inter/);
  assert.match(intellij, /font-family="Inter/);
  assert.equal(await card("&ide=vscode"), vscode);
  assert.equal(await card("&ide=nope"), vscode);
});
