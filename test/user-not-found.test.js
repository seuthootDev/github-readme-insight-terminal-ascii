// A missing GitHub user is named as one on every card, instead of a raw HTTP 404.
import "./helpers/env.js";
import assert from "node:assert/strict";
import { after, test } from "node:test";

import { fetchContributions } from "../src/githubContributions.js";
import { generateAsciiAvatarSvg } from "../src/asciiAvatar.js";
import { generateSvg } from "../src/renderer.js";

const USER = "this-user-does-not-exist-zz9x";

const savedFetch = globalThis.fetch;
const savedTokens = { GITHUB_TOKEN: process.env.GITHUB_TOKEN, GH_TOKEN: process.env.GH_TOKEN };
after(() => {
  globalThis.fetch = savedFetch;
  for (const [key, value] of Object.entries(savedTokens)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function stubFetch(status) {
  globalThis.fetch = async () => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => "",
    json: async () => ({}),
  });
}

test("fetchContributions names a missing user instead of its HTTP 404", async () => {
  stubFetch(404);
  await assert.rejects(fetchContributions(USER), /GitHub user not found\./);
});

test("fetchContributions keeps its message for other failures", async () => {
  stubFetch(500);
  await assert.rejects(fetchContributions(USER), /Failed to fetch contributions: HTTP 500/);
});

test("the ascii card names a missing user instead of its HTTP 404", async () => {
  stubFetch(404);
  await assert.rejects(generateAsciiAvatarSvg("mac", USER), /GitHub user not found\./);
});

test("the top-lang card names a missing user instead of its HTTP 404", async () => {
  delete process.env.GITHUB_TOKEN;
  delete process.env.GH_TOKEN;
  stubFetch(404);
  const svg = await generateSvg({ githubId: USER, type: "top-lang", themeName: "mac" });
  assert.match(svg, /GitHub user not found\./);
  assert.doesNotMatch(svg, /Failed to fetch languages for/);
});
