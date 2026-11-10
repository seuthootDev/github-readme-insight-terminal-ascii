// HTTP-level checks for routes that don't need GitHub (skills card, validation, redirects).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";

process.env.VERCEL = "1"; // import the app without auto-listening on PORT
const { default: app } = await import("../src/server.js");

let server;
let base;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test("bare root redirects to the repository", async () => {
  const res = await fetch(`${base}/`, { redirect: "manual" });
  assert.equal(res.status, 302);
  assert.match(res.headers.get("location"), /github\.com\/seuthootDev\/github-readme-insight-terminal-ascii/);
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
