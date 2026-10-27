import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { addDays, toIsoDate } from "./constants.js";
import { fetchContributions, sumContributions } from "./githubContributions.js";
import { THEMES } from "./themes.js";

const GITHUB_API_BASE = "https://api.github.com";

// The card is laid out on a fixed character grid, like a real tmux screen.
const COLS = 112;
const ROWS = 29;
const CELL_W = 8.4;
const LINE_H = 17;
const FONT_SIZE = 14;
const GRID_X = 44;
const GRID_Y = 86;
const GRAPH_WEEKS = 26;
const SPARK_DAYS = 30;
const SPARK_GLYPHS = " ▁▂▃▄▅▆▇█";
const LANG_LIMIT = 5;

const PALETTES = {
  mac: {
    fg: "#c5c8c6", dim: "#5c6370", mute: "#8b949e", green: "#98c379", blue: "#61afef",
    cyan: "#56b6c2", yellow: "#e5c07b", purple: "#c678dd", orange: "#d19a66",
    border: "#4b5263", active: "#98c379", cat: "#3fb950",
    bar: "#98c379", barText: "#0d1117",
    levels: ["#2d333b", "#0e4429", "#006d32", "#26a641", "#39d353"],
    blocks: ["#3b4252", "#bf616a", "#a3be8c", "#ebcb8b", "#81a1c1", "#b48ead", "#88c0d0", "#e5e9f0"]
  },
  windows: {
    fg: "#cccccc", dim: "#5a5a5a", mute: "#9a9a9a", green: "#16c60c", blue: "#3b78ff",
    cyan: "#61d6d6", yellow: "#f9f1a5", purple: "#b4009e", orange: "#c19c00",
    border: "#3a3a3a", active: "#3b78ff", cat: "#61d6d6",
    bar: "#0037da", barText: "#f2f2f2",
    levels: ["#262626", "#0a2a6b", "#0037da", "#3b78ff", "#61d6d6"],
    blocks: ["#0c0c0c", "#c50f1f", "#13a10e", "#c19c00", "#0037da", "#881798", "#3a96dd", "#cccccc"]
  },
  ubuntu: {
    fg: "#d3d7cf", dim: "#555753", mute: "#888a85", green: "#8ae234", blue: "#729fcf",
    cyan: "#34e2e2", yellow: "#fce94f", purple: "#ad7fa8", orange: "#e95420",
    border: "#5e2750", active: "#e95420", cat: "#e95420",
    bar: "#e95420", barText: "#ffffff",
    levels: ["#2d2d2d", "#4a1d45", "#77216f", "#c34113", "#f0814f"],
    blocks: ["#2e3436", "#cc0000", "#4e9a06", "#c4a000", "#3465a4", "#75507b", "#06989a", "#d3d7cf"]
  }
};

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Dart: "#00B4AB"
};

const CAT = [
  String.raw`  /\_/\  `,
  " ( o.o ) ",
  "  > ^ <  ",
  String.raw` /|   |\ `,
  "(_|   |_)"
];

const STAT_ICONS = {
  stars: [String.raw` \ / `, "--*--", String.raw` / \ `],
  prs: ["o-.  ", "|  o ", "o-'  "],
  issues: [" .-. ", "( ! )", " '-' "],
  contribs: ["   |", " | |", "||||"]
};

const FLAME = ["   (  ", "  ) ) ", " ( ( )", "  )_) ", " [___]"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POWERSHELL_ICON_PATH = path.resolve(__dirname, "..", "resources", "PowerShell_icon.svg");

function loadPowershellIconDataUri() {
  try {
    const raw = fs.readFileSync(POWERSHELL_ICON_PATH, "utf8");
    const base64 = Buffer.from(raw, "utf8").toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return null;
  }
}

const POWERSHELL_ICON_DATA_URI = loadPowershellIconDataUri();

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateFit(text, maxChars) {
  const t = String(text);
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function formatCompact(value) {
  const n = Number(value ?? 0);
  if (n < 10000) return formatNumber(n);
  if (n < 1000000) return `${(n / 1000).toFixed(n < 100000 ? 1 : 0)}k`;
  return `${(n / 1000000).toFixed(1)}M`;
}

function resolveOutputScale(input) {
  const parsed = Number.parseFloat(String(input ?? "1"));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(0.05, parsed));
}

async function fetchJson(url) {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-readme-insight-terminal-ascii"
  };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const resetEpoch = response.headers.get("x-ratelimit-reset");
      const resetHint = resetEpoch
        ? ` (reset at ${new Date(Number.parseInt(resetEpoch, 10) * 1000).toISOString()})`
        : "";
      if (!githubToken && remaining === "0") {
        throw new Error(`GitHub API rate limit exceeded. Set GITHUB_TOKEN or GH_TOKEN to increase limit${resetHint}.`);
      }
      throw new Error(`GitHub API access forbidden (HTTP ${response.status})${resetHint}.`);
    }
    if (response.status === 404) {
      throw new Error("GitHub user not found.");
    }
    throw new Error(`Failed to fetch GitHub API: HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchAllRepos(username) {
  const repos = [];
  let page = 1;
  while (true) {
    const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?type=owner&per_page=100&page=${page}`;
    const chunk = await fetchJson(url);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    repos.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
    if (page > 5) break;
  }
  return repos;
}

async function fetchSearchCount(query) {
  const data = await fetchJson(`${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}&per_page=1`);
  return data?.total_count ?? 0;
}

function computeStreaks(contributions) {
  const dates = Object.keys(contributions).sort();
  let longest = 0;
  let run = 0;
  for (const date of dates) {
    run = contributions[date] > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  // Today without contributions yet doesn't break the current streak.
  let current = 0;
  for (let i = dates.length - 1; i >= 0; i -= 1) {
    const count = contributions[dates[i]];
    if (i === dates.length - 1 && count === 0) continue;
    if (count === 0) break;
    current += 1;
  }
  return { current, longest };
}

function aggregateLanguages(repos) {
  const counts = new Map();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, LANG_LIMIT - 1);
  const rest = sorted.slice(LANG_LIMIT - 1).reduce((acc, [, count]) => acc + count, 0);
  if (rest > 0) top.push(["Other", rest]);
  else if (sorted.length === LANG_LIMIT) top.push(sorted[LANG_LIMIT - 1]);
  return top.map(([name, count]) => ({ name, pct: Math.round((count / total) * 100) }));
}

async function fetchDashboardData(username) {
  // The contribution calendar 404s for a nonexistent user, so it stays unwrapped
  // as the existence check; the API calls below degrade to "n/a" on failure.
  let contributions;
  try {
    contributions = await fetchContributions(username);
  } catch (error) {
    if (String(error?.message ?? "").includes("HTTP 404")) throw new Error("GitHub user not found.");
    throw error;
  }

  const [profileResult, reposResult, prsResult, issuesResult] = await Promise.allSettled([
    fetchJson(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`),
    fetchAllRepos(username),
    fetchSearchCount(`author:${username} type:pr`),
    fetchSearchCount(`author:${username} type:issue`)
  ]);
  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const repos = reposResult.status === "fulfilled" ? reposResult.value : null;
  const ownedRepos = (repos ?? []).filter((repo) => !repo.fork);

  return {
    login: profile?.login || username,
    name: profile?.name || "",
    createdAt: profile?.created_at ?? null,
    publicRepos: profile?.public_repos ?? null,
    followers: profile?.followers ?? null,
    stars: repos ? ownedRepos.reduce((acc, repo) => acc + Number(repo.stargazers_count ?? 0), 0) : null,
    prs: prsResult.status === "fulfilled" ? prsResult.value : null,
    issues: issuesResult.status === "fulfilled" ? issuesResult.value : null,
    contributions,
    contributionsYear: sumContributions(contributions),
    streak: computeStreaks(contributions),
    languages: repos ? aggregateLanguages(repos) : []
  };
}

function buildDashboardPrompt(themeName, githubId, palette) {
  if (themeName === "windows") {
    return [
      { text: "PS ", color: palette.purple },
      { text: `C:\\Users\\${githubId}`, color: palette.yellow },
      { text: "> ", color: palette.fg }
    ];
  }

  if (themeName === "ubuntu") {
    return [
      { text: `${githubId}@ubuntu`, color: palette.green },
      { text: ":", color: palette.fg },
      { text: "~", color: palette.blue },
      { text: "$ ", color: palette.fg }
    ];
  }

  return [
    { text: `${githubId}@MacBook`, color: palette.green },
    { text: " ~ ", color: palette.blue },
    { text: "% ", color: palette.fg }
  ];
}

function buildDashboardCommand(themeName, githubId) {
  if (themeName === "windows") return `github-cli.exe dash --user ${githubId}`;
  if (themeName === "ubuntu") return `./github-cli dash --user=${githubId}`;
  return `github-cli dash --user ${githubId}`;
}

function createGrid() {
  const cells = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => null));
  let group = "g0";
  return {
    cells,
    setGroup(name) {
      group = name;
    },
    put(row, col, text, color, bold = false) {
      [...String(text)].forEach((ch, i) => {
        if (row >= 0 && row < ROWS && col + i >= 0 && col + i < COLS) {
          cells[row][col + i] = { ch, color, bold, group };
        }
      });
    }
  };
}

function drawPane(grid, palette, r0, c0, r1, c1, title, active = false) {
  const color = active ? palette.active : palette.border;
  grid.put(r0, c0, `┌${"─".repeat(c1 - c0 - 1)}┐`, color);
  for (let r = r0 + 1; r < r1; r += 1) {
    grid.put(r, c0, "│", color);
    grid.put(r, c1, "│", color);
  }
  grid.put(r1, c0, `└${"─".repeat(c1 - c0 - 1)}┘`, color);
  grid.put(r0, c0 + 2, ` ${title} `, active ? palette.active : palette.mute, active);
}

function formatSince(createdAt) {
  if (!createdAt) return "n/a";
  const created = new Date(createdAt);
  const years = Math.floor((Date.now() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${created.getUTCFullYear()} (${years}y)`;
}

function valueOrNa(value, format = formatCompact) {
  return value === null || value === undefined ? "n/a" : format(value);
}

function drawProfilePane(grid, palette, data) {
  grid.setGroup("p0");
  drawPane(grid, palette, 1, 0, 14, 45, "0:profile", true);
  CAT.forEach((line, i) => grid.put(3 + i, 2, line, palette.cat, true));
  grid.put(9, 3, "~ meow ~", palette.dim);

  const infoX = 15;
  const login = truncateFit(data.login, 22);
  grid.put(2, infoX, login, palette.cyan, true);
  grid.put(2, infoX + login.length, "@", palette.fg);
  grid.put(2, infoX + login.length + 1, "github", palette.cyan, true);
  grid.put(3, infoX, "-".repeat(login.length + 7), palette.fg);
  const topLang = data.languages.find((lang) => lang.name !== "Other")?.name ?? "n/a";
  [
    ["Name", data.name || data.login],
    ["Repos", data.publicRepos === null ? "n/a" : `${formatNumber(data.publicRepos)} public`],
    ["Followers", valueOrNa(data.followers)],
    ["Stars", data.stars === null ? "n/a" : `${formatCompact(data.stars)} earned`],
    ["Since", formatSince(data.createdAt)],
    ["Top lang", topLang],
    ["Uptime", `${data.streak.current}d streak`]
  ].forEach(([key, value], i) => {
    grid.put(4 + i, infoX, key, palette.yellow, true);
    grid.put(4 + i, infoX + key.length, ":", palette.fg);
    grid.put(4 + i, infoX + 11, truncateFit(value, 18), palette.fg);
  });
  palette.blocks.forEach((color, i) => grid.put(12, infoX + i * 3, "███", color));
}

function drawStatsPane(grid, palette, data) {
  grid.setGroup("p1");
  drawPane(grid, palette, 1, 46, 6, 111, "1:stats");
  [
    ["stars", data.stars, "stars", palette.yellow],
    ["prs", data.prs, "pull reqs", palette.purple],
    ["issues", data.issues, "issues", palette.green],
    ["contribs", data.contributionsYear, "contribs/yr", palette.cyan]
  ].forEach(([icon, value, label, color], i) => {
    const col = 48 + i * 15;
    STAT_ICONS[icon].forEach((line, r) => grid.put(2 + r, col, line, color, true));
    grid.put(3, col + 6, valueOrNa(value), color, true);
    grid.put(4, col + 6, label, palette.mute);
  });
}

function drawStreakPane(grid, palette, data, today) {
  grid.setGroup("p2");
  drawPane(grid, palette, 7, 46, 14, 111, "2:streak");
  FLAME.forEach((line, i) => grid.put(8 + i, 48, line, i < 4 ? palette.orange : palette.mute, true));
  const { current, longest } = data.streak;
  grid.put(9, 56, "current", palette.mute);
  grid.put(10, 56, `${formatNumber(current)} day${current === 1 ? "" : "s"}`, palette.orange, true);
  grid.put(9, 66, "longest", palette.mute);
  grid.put(10, 66, `${formatNumber(longest)} day${longest === 1 ? "" : "s"}`, palette.fg, true);

  const meterCols = 14;
  const ratio = longest > 0 ? current / longest : 0;
  const filled = Math.round(meterCols * ratio);
  grid.put(12, 56, "[", palette.fg);
  grid.put(12, 57, "#".repeat(filled), palette.orange, true);
  grid.put(12, 57 + filled, ".".repeat(meterCols - filled), palette.dim);
  grid.put(12, 57 + meterCols, `] ${Math.round(ratio * 100)}% of best`, palette.fg);

  const counts = [];
  for (let i = SPARK_DAYS - 1; i >= 0; i -= 1) {
    counts.push(data.contributions[toIsoDate(addDays(today, -i))] ?? 0);
  }
  const max = Math.max(1, ...counts);
  grid.put(9, 79, `last ${SPARK_DAYS} days`, palette.mute);
  counts.forEach((count, i) => {
    const level = count === 0 ? 0 : Math.max(1, Math.round(Math.sqrt(count / max) * 8));
    grid.put(10, 79 + i, level === 0 ? "▁" : SPARK_GLYPHS[level], level === 0 ? palette.dim : palette.green);
  });
  grid.put(11, 79, "30d ago", palette.dim);
  grid.put(11, 104, "today", palette.dim);
}

function drawGraphPane(grid, palette, data, today) {
  grid.setGroup("p3");
  drawPane(grid, palette, 15, 0, 26, 72, `3:graph · last ${GRAPH_WEEKS} weeks`);
  const lastSunday = addDays(today, -today.getDay());
  const firstSunday = addDays(lastSunday, -(GRAPH_WEEKS - 1) * 7);

  // Levels are quartiles of active days (like GitHub), so one huge day doesn't dim the rest.
  const activeCounts = [];
  for (let i = 0; i < GRAPH_WEEKS * 7; i += 1) {
    const count = data.contributions[toIsoDate(addDays(firstSunday, i))] ?? 0;
    if (count > 0) activeCounts.push(count);
  }
  activeCounts.sort((a, b) => a - b);
  const quartile = (q) => activeCounts[Math.min(activeCounts.length - 1, Math.floor(activeCounts.length * q))] ?? 0;
  const thresholds = [quartile(0.25), quartile(0.5), quartile(0.75)];
  const levelFor = (count) => (count === 0 ? 0 : 1 + thresholds.filter((t) => count > t).length);

  let lastMonthEnd = -1;
  let total = 0;
  for (let w = 0; w < GRAPH_WEEKS; w += 1) {
    const weekStart = addDays(firstSunday, w * 7);
    const col = 7 + w * 2;
    const monthStartsThisWeek = w === 0 || weekStart.getMonth() !== addDays(weekStart, -7).getMonth();
    if (monthStartsThisWeek && col > lastMonthEnd + 1) {
      const label = weekStart.toLocaleString("en-US", { month: "short" });
      if (col + label.length <= 7 + GRAPH_WEEKS * 2) {
        grid.put(16, col, label, palette.mute);
        lastMonthEnd = col + label.length;
      }
    }
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(weekStart, d);
      if (date > today) continue;
      const count = data.contributions[toIsoDate(date)] ?? 0;
      total += count;
      grid.put(17 + d, col, "■", palette.levels[levelFor(count)]);
    }
  }
  ["", "Mon", "", "Wed", "", "Fri", ""].forEach((label, d) => label && grid.put(17 + d, 2, label, palette.mute));
  grid.put(25, 2, `${formatNumber(total)} contributions in ${GRAPH_WEEKS} weeks`, palette.mute);
  grid.put(25, 56, "less", palette.dim);
  palette.levels.forEach((color, i) => grid.put(25, 61 + i, "■", color));
  grid.put(25, 67, "more", palette.dim);
}

function drawLanguagesPane(grid, palette, data) {
  grid.setGroup("p4");
  drawPane(grid, palette, 15, 73, 26, 111, "4:langs");
  if (data.languages.length === 0) {
    grid.put(17, 75, "no language data", palette.mute);
    return;
  }
  const barCols = 16;
  const maxPct = Math.max(...data.languages.map((lang) => lang.pct));
  data.languages.forEach(({ name, pct }, i) => {
    const row = 17 + i * 2;
    const filled = Math.max(1, Math.round((pct / maxPct) * barCols));
    grid.put(row, 75, truncateFit(name, 11), palette.fg);
    grid.put(row, 87, "█".repeat(filled), LANGUAGE_COLORS[name] ?? palette.mute);
    grid.put(row, 87 + filled, "·".repeat(barCols - filled), palette.dim);
    grid.put(row, 104, `${String(pct).padStart(3)}%`, palette.mute);
  });
}

function drawStatusBar(grid, palette, login, now) {
  grid.setGroup("bar");
  grid.put(27, 0, "[dash] ", palette.barText, true);
  grid.put(27, 7, "0:profile* 1:stats  2:streak  3:graph  4:langs", palette.barText);
  const time = now.toISOString().slice(11, 16);
  const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit", timeZone: "UTC" }).replaceAll(" ", "-");
  const right = `"${truncateFit(login, 20)}" ${time} ${date}`;
  grid.put(27, COLS - right.length - 1, right, palette.barText);
}

function renderGridText(grid) {
  const out = [];
  grid.cells.forEach((cells, row) => {
    let col = 0;
    while (col < COLS) {
      const cell = cells[col];
      if (!cell || cell.ch === " ") {
        col += 1;
        continue;
      }
      let end = col + 1;
      while (end < COLS && cells[end] && cells[end].color === cell.color && cells[end].bold === cell.bold && cells[end].group === cell.group) {
        end += 1;
      }
      const text = cells.slice(col, end).map((c) => c.ch).join("").replace(/ +$/, "");
      const length = [...text].length;
      // textLength pins every run to the grid, so fallback fonts can't drift the columns.
      out.push(`<text class="${cell.group}" x="${(GRID_X + col * CELL_W).toFixed(1)}" y="${GRID_Y + row * LINE_H}" font-size="${FONT_SIZE}" font-family="Consolas, Menlo, monospace" fill="${cell.color}"${cell.bold ? ` font-weight="700"` : ""} textLength="${(length * CELL_W).toFixed(1)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${escapeXml(text)}</text>`);
      col = end;
    }
  });
  return out.join("\n");
}

function createAnimationCss(timeline) {
  const groups = ["p0", "p1", "p2", "p3", "p4", "bar"];
  const rules = groups.map((group, i) => `.${group} { opacity: 0; animation: reveal 0.18s ease-out ${(timeline.panesAt + i * timeline.paneStagger).toFixed(2)}s forwards; }`);
  return `
  ${rules.join("\n  ")}
  .typing-cursor { animation: hide-cursor 0.01s linear ${timeline.typingDuration}s forwards; }
  @keyframes reveal { from { opacity: 0; } to { opacity: 1; } }
  @keyframes hide-cursor { to { opacity: 0; } }
  `;
}

export async function generateDashboardSvg(themeName, githubId, options = {}) {
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }
  const palette = PALETTES[themeName];

  const data = await fetchDashboardData(githubId);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const grid = createGrid();
  drawProfilePane(grid, palette, data);
  drawStatsPane(grid, palette, data);
  drawStreakPane(grid, palette, data, today);
  drawGraphPane(grid, palette, data, today);
  drawLanguagesPane(grid, palette, data);
  drawStatusBar(grid, palette, data.login, now);

  const width = Math.round(GRID_X * 2 + COLS * CELL_W);
  const promptY = 66 + 20;
  const gridTop = promptY + LINE_H * 0.5;
  const statusRowY = gridTop + 27 * LINE_H;
  const height = Math.round(statusRowY + 40);
  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const termW = width - 40;
  const termH = height - termY - 20;
  const outputScale = resolveOutputScale(options.scale);

  const promptParts = buildDashboardPrompt(themeName, githubId, palette);
  const promptCols = promptParts.reduce((acc, part) => acc + part.text.length, 0);
  const commandText = buildDashboardCommand(themeName, githubId);
  const commandX = GRID_X + promptCols * CELL_W;
  const commandWidth = commandText.length * CELL_W;
  const timeline = { typingDuration: 1.0, panesAt: 1.15, paneStagger: 0.12 };
  const typingClipId = "dashboard-command-typing-clip";

  const controlsY = termY + 20;
  const controlsX = themeName === "mac"
    ? termX + 18
    : (themeName === "windows" ? termX + termW - 74 : termX + termW - 62);

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * outputScale)}" height="${Math.round(height * outputScale)}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub dashboard card for ${escapeXml(githubId)}">`);
  svg.push(`<title>${escapeXml(theme.title(githubId))}</title>`);
  svg.push(`<defs>`);
  svg.push(`<style>${createAnimationCss(timeline)}</style>`);
  svg.push(`<clipPath id="${typingClipId}"><rect x="${commandX}" y="${promptY - 16}" width="0" height="22"><animate attributeName="width" values="0;${commandWidth + 6}" dur="${timeline.typingDuration}s" fill="freeze" /></rect></clipPath>`);
  svg.push(`</defs>`);

  svg.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + headerH}" width="${termW - 2}" height="${termH - headerH - 1}" rx="0" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (themeName === "windows" && POWERSHELL_ICON_DATA_URI) {
    svg.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  svg.push(theme.controlsSvg(controlsX, controlsY));
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(githubId))}</text>`);

  let promptX = GRID_X;
  for (const part of promptParts) {
    svg.push(`<text x="${promptX.toFixed(1)}" y="${promptY}" font-size="${FONT_SIZE + 1}" font-family="Consolas, Menlo, monospace" fill="${part.color}" textLength="${(part.text.trimEnd().length * CELL_W).toFixed(1)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${escapeXml(part.text.trimEnd())}</text>`);
    promptX += part.text.length * CELL_W;
  }
  svg.push(`<text x="${commandX.toFixed(1)}" y="${promptY}" font-size="${FONT_SIZE + 1}" font-family="Consolas, Menlo, monospace" fill="${palette.fg}" textLength="${commandWidth.toFixed(1)}" lengthAdjust="spacingAndGlyphs" clip-path="url(#${typingClipId})">${escapeXml(commandText)}</text>`);
  svg.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="${palette.fg}" font-size="${FONT_SIZE + 1}" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" values="${commandX};${commandX + commandWidth + 2}" dur="${timeline.typingDuration}s" fill="freeze" /></text>`);

  svg.push(`<g transform="translate(0 ${(gridTop - GRID_Y).toFixed(1)})">`);
  svg.push(`<rect class="bar" x="${termX + 1}" y="${GRID_Y + 27 * LINE_H - LINE_H + 4}" width="${termW - 2}" height="${LINE_H}" fill="${palette.bar}"/>`);
  svg.push(renderGridText(grid));
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}
