import assert from "node:assert/strict";
import { test } from "node:test";

import { createTtlCache } from "../src/cache.js";

test("returns cached value until TTL expires", async () => {
  let clock = 0;
  const cache = createTtlCache({ ttlMs: 1000, maxEntries: 10, now: () => clock });
  let calls = 0;
  const compute = async () => ++calls;

  assert.deepEqual(await cache.getOrCompute("k", compute), { value: 1, hit: false });
  clock = 999;
  assert.deepEqual(await cache.getOrCompute("k", compute), { value: 1, hit: true });
  clock = 1000;
  assert.deepEqual(await cache.getOrCompute("k", compute), { value: 2, hit: false });
});

test("evicts least recently used entry", () => {
  const cache = createTtlCache({ ttlMs: 1000, maxEntries: 2, now: () => 0 });
  cache.set("a", 1);
  cache.set("b", 2);
  cache.get("a"); // a is now most recent
  cache.set("c", 3);
  assert.equal(cache.get("b"), undefined);
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.get("c"), 3);
  assert.equal(cache.size, 2);
});

test("shares one computation between concurrent callers", async () => {
  const cache = createTtlCache({ ttlMs: 1000, maxEntries: 10 });
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const compute = async () => { calls += 1; await gate; return "svg"; };

  const first = cache.getOrCompute("k", compute);
  const second = cache.getOrCompute("k", compute);
  release();
  const results = await Promise.all([first, second]);

  assert.equal(calls, 1);
  assert.deepEqual(results.map((r) => r.value), ["svg", "svg"]);
  assert.deepEqual(results.map((r) => r.hit).sort(), [false, true]);
});

test("does not cache failures", async () => {
  const cache = createTtlCache({ ttlMs: 1000, maxEntries: 10 });
  let calls = 0;
  const compute = async () => {
    calls += 1;
    if (calls === 1) throw new Error("rate limited");
    return "ok";
  };

  await assert.rejects(cache.getOrCompute("k", compute), /rate limited/);
  assert.deepEqual(await cache.getOrCompute("k", compute), { value: "ok", hit: false });
});

test("ttl 0 disables caching", async () => {
  const cache = createTtlCache({ ttlMs: 0, maxEntries: 10 });
  let calls = 0;
  await cache.getOrCompute("k", async () => ++calls);
  await cache.getOrCompute("k", async () => ++calls);
  assert.equal(calls, 2);
});
