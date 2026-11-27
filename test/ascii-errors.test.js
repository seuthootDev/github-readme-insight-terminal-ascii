import assert from "node:assert/strict";
import test from "node:test";

import { generateAsciiAvatarSvg } from "../src/asciiAvatar.js";

const USER = "octocat";
const RESET_EPOCH = "1893456000"; // 2030-01-01T00:00:00.000Z
const RESET_HINT = " (reset at 2030-01-01T00:00:00.000Z)";

function response(status, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: async () => ({})
  };
}

function expectsMessage(expected) {
  return (error) => {
    assert.equal(error.message, expected);
    return true;
  };
}

// The ascii card must fail like the other cards: a readable message instead of
// "GitHub API error 403 for <url>". Each case swaps fetch and the token
// variables, then restores both even when the assertion fails.
async function withStubbedFetch(t, stub, run) {
  const originalFetch = globalThis.fetch;
  const originalGithubToken = process.env.GITHUB_TOKEN;
  const originalGhToken = process.env.GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  delete process.env.GH_TOKEN;
  globalThis.fetch = stub;
  t.after(() => {
    globalThis.fetch = originalFetch;
    if (originalGithubToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = originalGithubToken;
    if (originalGhToken === undefined) delete process.env.GH_TOKEN;
    else process.env.GH_TOKEN = originalGhToken;
  });
  return run();
}

test("ascii card reports the rate limit when GitHub returns 403 without a token", async (t) => {
  await withStubbedFetch(
    t,
    async () => response(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": RESET_EPOCH }),
    async () => {
      await assert.rejects(
        generateAsciiAvatarSvg("mac", USER),
        expectsMessage(
          `GitHub API rate limit exceeded. Set GITHUB_TOKEN or GH_TOKEN to increase limit${RESET_HINT}.`
        )
      );
    }
  );
});

test("ascii card reports forbidden access when a token is configured", async (t) => {
  await withStubbedFetch(
    t,
    async () => response(403, { "x-ratelimit-remaining": "0", "x-ratelimit-reset": RESET_EPOCH }),
    async () => {
      process.env.GITHUB_TOKEN = "test-token";
      await assert.rejects(
        generateAsciiAvatarSvg("mac", USER),
        expectsMessage(`GitHub API access forbidden (HTTP 403)${RESET_HINT}.`)
      );
    }
  );
});

test("ascii card keeps other HTTP failures readable and hides the API URL", async (t) => {
  await withStubbedFetch(
    t,
    async () => response(500),
    async () => {
      await assert.rejects(
        generateAsciiAvatarSvg("mac", USER),
        expectsMessage("GitHub API error (HTTP 500).")
      );
    }
  );
});

test("ascii card still reports a missing user on 404", async (t) => {
  await withStubbedFetch(
    t,
    async () => response(404),
    async () => {
      await assert.rejects(generateAsciiAvatarSvg("mac", USER), expectsMessage("GitHub user not found."));
    }
  );
});
