// Snapshot tests for every card type, rendered from recorded GitHub responses at a frozen time.
import "./helpers/env.js";
import { after, mock, test } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { generateSvg } from "../src/renderer.js";
import { generateErrorSvg } from "../src/errorCard.js";
import { installFetchFixtures } from "./helpers/fetchFixtures.js";
import { matchSnapshot } from "./helpers/snapshot.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const USER = "seuthootDev";
const REPO = "seuthootDev/github-readme-insight-terminal-ascii";

if (process.env.RECORD_FIXTURES === "1") {
  // Recording needs a token (lang-history uses GraphQL); pick it up from .env like the server does.
  try {
    for (const line of readFileSync(join(ROOT, ".env"), "utf8").split("\n")) {
      const match = line.trim().match(/^([A-Z_]+)=(.*)$/);
      if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
  }
} else {
  // Replay never touches the network, but a token must be set so the same code paths run as when recording.
  delete process.env.GH_TOKEN;
  process.env.GITHUB_TOKEN = "test-token";
}

const fixtures = installFetchFixtures(join(ROOT, "test", "fixtures", "github.json"));
mock.timers.enable({ apis: ["Date"], now: Date.parse(fixtures.recordedAt) });

after(() => {
  fixtures.save();
  fixtures.restore();
  mock.timers.reset();
});

const CASES = [
  ["graph-mac", { type: "graph", themeName: "mac" }],
  ["graph-windows", { type: "graph", themeName: "windows" }],
  ["graph-ubuntu", { type: "graph", themeName: "ubuntu" }],
  ["stats-mac", { type: "stats", themeName: "mac" }],
  ["stats-windows", { type: "stats", themeName: "windows" }],
  ["top-lang-mac", { type: "top-lang", themeName: "mac" }],
  ["streak-ubuntu", { type: "streak", themeName: "ubuntu" }],
  ["git-log-mac", { type: "git-log", themeName: "mac" }],
  ["pr-issue-mac", { type: "pr-issue", themeName: "mac" }],
  ["repo-mac", { type: "repo", themeName: "mac", repo: REPO }],
  ["lang-history-mac", { type: "lang-history", themeName: "mac" }],
  ["dashboard-mac", { type: "dashboard", themeName: "mac" }],
  ["neofetch-mac-color", { type: "neofetch", themeName: "mac", color: true }],
  ["ascii-mac-mono", { type: "ascii", themeName: "mac" }],
  ["skills-mac", { type: "skills", themeName: "mac", icons: "js,ts,react,nodejs,docker,postgres,unknown-icon-xyz" }]
];

for (const [name, options] of CASES) {
  test(`renders ${name}`, async () => {
    const svg = await generateSvg({ githubId: USER, ...options });
    matchSnapshot(name, svg);
  });
}

test("renders error card", () => {
  const svg = generateErrorSvg("windows", { user: USER, type: "stats", message: "GitHub API rate limit exceeded." });
  matchSnapshot("error-windows", svg);
});
