// top-lang's exclude option must work in both GitHub data paths.
import "./helpers/env.js";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateSvg } from "../src/renderer.js";
import { installFetchFixtures } from "./helpers/fetchFixtures.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OPTIONS = { type: "top-lang", themeName: "mac", githubId: "seuthootDev" };

delete process.env.GITHUB_TOKEN;
delete process.env.GH_TOKEN;

const fixtures = installFetchFixtures(join(ROOT, "test", "fixtures", "github.json"));
after(() => fixtures.restore());

test("REST fallback drops excluded repos case-insensitively", async () => {
  const all = await generateSvg(OPTIONS);
  const filtered = await generateSvg({ ...OPTIONS, excludeRepos: "GRAVITA" });

  assert.match(all, /GDScript/);
  assert.doesNotMatch(filtered, /GDScript/);
});

test("GraphQL language edges drop excluded owner/name entries", async () => {
  process.env.GITHUB_TOKEN = "test-token";
  try {
    const all = await generateSvg(OPTIONS);
    const filtered = await generateSvg({ ...OPTIONS, excludeRepos: ["seuthootDev/Gravita"] });

    assert.match(all, /GDScript/);
    assert.doesNotMatch(filtered, /GDScript/);
  } finally {
    delete process.env.GITHUB_TOKEN;
  }
});
