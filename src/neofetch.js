import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchContributions, sumContributions } from "./githubContributions.js";
import { THEMES } from "./themes.js";

const GITHUB_API_BASE = "https://api.github.com";

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

const NEOFETCH_COLOR_BARS = [
  "#3b4252", "#bf616a", "#a3be8c", "#ebcb8b",
  "#81a1c1", "#b48ead", "#88c0d0", "#e5e9f0",
  "#4c566a", "#bf616a", "#a3be8c", "#ebcb8b",
  "#81a1c1", "#b48ead", "#8fbcbb", "#eceff4"
];

/** Match previous avatar ASCII width (~42 cols at 13px). */
const TARGET_LOGO_WIDTH = 328;

/**
 * Official GitHub Octocat ASCII (speech bubble removed for logo panel).
 * Source: https://api.github.com/octocat (also known from octocatsay).
 * Each line is [{ c: colorIndex, t: text }, ...] — colorIndex is 1-based into `colors`.
 */
const GITHUB_LOGO = {
  mono: "#c9d1d9",
  colors: ["#f0f6fc", "#58a6ff", "#8b949e"],
  lines: [
    [{ c: 1, t: "               MMM.           .MMM" }],
    [{ c: 1, t: "               MMMMMMMMMMMMMMMMMMM" }],
    [{ c: 1, t: "               MMMMMMMMMMMMMMMMMMM" }],
    [{ c: 1, t: "              MMMMMMMMMMMMMMMMMMMMM" }],
    [{ c: 1, t: "             MMMMMMMMMMMMMMMMMMMMMMM" }],
    [{ c: 1, t: "            MMMMMMMMMMMMMMMMMMMMMMMM" }],
    [{ c: 1, t: "            MMMM::- -:::::::- -::MMMM" }],
    [
      { c: 1, t: "             MM~:~ " },
      { c: 2, t: "00" },
      { c: 1, t: "~:::::~ " },
      { c: 2, t: "00" },
      { c: 1, t: "~:~MM" }
    ],
    [
      { c: 1, t: "        .. MMMMM::." },
      { c: 2, t: "00" },
      { c: 1, t: ":::+:::." },
      { c: 2, t: "00" },
      { c: 1, t: "::MMMMM .." }
    ],
    [{ c: 1, t: "              .MM::::: " }, { c: 3, t: "._." }, { c: 1, t: " :::::MM." }],
    [{ c: 1, t: "                 MMMM;:::::;MMMM" }],
    [{ c: 1, t: "          -MM        MMMMMMM" }],
    [{ c: 1, t: "          ^  M+     MMMMMMMMM" }],
    [{ c: 1, t: "              MMMMMMM MM MM MM" }],
    [{ c: 1, t: "                   MM MM MM MM" }],
    [{ c: 1, t: "                   MM MM MM MM" }],
    [{ c: 1, t: "                .~~MM~MM~MM~MM~~." }],
    [{ c: 1, t: "             ~~~~MM:~MM~~~MM~:MM~~~~" }],
    [{ c: 1, t: "            ~~~~~~==~==~~~==~==~~~~~~" }],
    [{ c: 1, t: "             ~~~~~~==~==~==~==~~~~~~" }],
    [{ c: 1, t: "                 :~==~==~==~==~~" }]
  ]
};

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function textWidth(text, fontSize = 16) {
  return text.length * (fontSize * 0.62);
}

function promptPartsWidth(parts, fontSize = 16) {
  const promptCharFactor = 0.56;
  return parts.reduce((acc, part) => acc + (part.text.length * (fontSize * promptCharFactor)), 0);
}

function addTextSpans(parts, startX, y, fontSize = 16) {
  const spans = [];
  for (const part of parts) {
    spans.push(`<tspan fill="${part.fill}">${escapeXml(part.text)}</tspan>`);
  }
  return `<text x="${startX}" y="${y}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace">${spans.join("")}</text>`;
}

function createAnimationCss(timeline) {
  const pct = (seconds) => ((seconds / timeline.cycleDuration) * 100).toFixed(4);

  return `
  .line-fetch { opacity: 0; animation: show-fetch ${timeline.cycleDuration}s linear forwards; }
  .line-success { opacity: 0; animation: show-success ${timeline.cycleDuration}s linear forwards; }
  .line-neofetch { opacity: 0; animation: show-neofetch ${timeline.cycleDuration}s linear forwards; }
  .line-bottom { opacity: 0; animation: show-bottom ${timeline.cycleDuration}s linear forwards; }
  .cursor {
    opacity: 1;
    visibility: hidden;
    animation: cursor-window ${timeline.cycleDuration}s steps(1, end) forwards, blink ${timeline.blinkDuration}s steps(1,end) infinite;
  }
  .typing-cursor {
    opacity: 1;
    animation: typing-cursor-window ${timeline.cycleDuration}s steps(1, end) forwards;
  }
  @keyframes show-fetch { 0%, ${pct(Math.max(0, timeline.fetchStart - 0.01))}% { opacity: 0; } ${pct(timeline.fetchStart)}%, 100% { opacity: 1; } }
  @keyframes show-success { 0%, ${pct(Math.max(0, timeline.successAt - 0.01))}% { opacity: 0; } ${pct(timeline.successAt)}%, 100% { opacity: 1; } }
  @keyframes show-neofetch { 0%, ${pct(Math.max(0, timeline.neofetchAt - 0.01))}% { opacity: 0; } ${pct(timeline.neofetchAt)}%, 100% { opacity: 1; } }
  @keyframes show-bottom { 0%, ${pct(Math.max(0, timeline.bottomAt - 0.01))}% { opacity: 0; } ${pct(timeline.bottomAt)}%, 100% { opacity: 1; } }
  @keyframes cursor-window { 0%, ${pct(Math.max(0, timeline.bottomAt - 0.01))}% { visibility: hidden; } ${pct(timeline.bottomAt)}%, 100% { visibility: visible; } }
  @keyframes typing-cursor-window { 0%, ${pct(timeline.typingDuration)}% { opacity: 1; } ${pct(Math.min(timeline.cycleDuration, timeline.typingDuration + 0.01))}%, 100% { opacity: 0; } }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  `;
}

function resolveOutputScale(input) {
  const parsed = Number.parseFloat(String(input ?? "1"));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(0.2, parsed));
}

function resolveColorMode(input) {
  if (typeof input === "boolean") return input;
  const raw = String(input ?? "mono").trim().toLowerCase();
  return ["1", "true", "yes", "on", "color"].includes(raw);
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
    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const resetEpoch = response.headers.get("x-ratelimit-reset");
      const resetHint = resetEpoch
        ? ` (reset at ${new Date(Number.parseInt(resetEpoch, 10) * 1000).toISOString()})`
        : "";
      if (!githubToken && remaining === "0") {
        throw new Error(`GitHub API rate limit exceeded. Set GITHUB_TOKEN or GH_TOKEN to increase limit${resetHint}.`);
      }
      throw new Error(`GitHub API access forbidden (HTTP 403)${resetHint}.`);
    }
    throw new Error(`Failed to fetch GitHub API: HTTP ${response.status}`);
  }
  return response.json();
}

async function fetchAllRepos(username) {
  const repos = [];
  let page = 1;
  while (true) {
    const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&per_page=100&page=${page}`;
    const chunk = await fetchJson(url);
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    repos.push(...chunk);
    if (chunk.length < 100) break;
    page += 1;
    if (page > 5) break;
  }
  return repos;
}

function formatUptime(createdAt) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return "unknown";
  const now = new Date();
  let years = now.getUTCFullYear() - created.getUTCFullYear();
  let months = now.getUTCMonth() - created.getUTCMonth();
  let days = now.getUTCDate() - created.getUTCDate();
  if (days < 0) {
    months -= 1;
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
    days += prev.getUTCDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts = [];
  if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
  if (months > 0) parts.push(`${months} month${months === 1 ? "" : "s"}`);
  if (parts.length === 0) parts.push(`${Math.max(0, days)} day${days === 1 ? "" : "s"}`);
  return parts.join(", ");
}

function truncate(text, max) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 3))}...`;
}

function topLanguages(repos, limit = 3) {
  const counts = new Map();
  for (const repo of repos) {
    if (repo.fork || !repo.language) continue;
    counts.set(repo.language, (counts.get(repo.language) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([language]) => language);
}

async function fetchNeofetchData(username) {
  let profile = null;
  let repos = [];
  let contributionsYear = 0;
  let partial = false;

  profile = await fetchJson(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`);

  try {
    repos = await fetchAllRepos(username);
  } catch {
    partial = true;
  }

  try {
    const contributions = await fetchContributions(username);
    contributionsYear = sumContributions(contributions);
  } catch {
    partial = true;
  }

  const login = profile.login || username;
  const name = profile.name || login;
  const totalStars = repos.reduce((acc, repo) => acc + Number(repo.stargazers_count ?? 0), 0);
  const languages = topLanguages(repos, 3);

  return {
    login,
    name,
    bio: profile.bio || "",
    company: profile.company || "",
    location: profile.location || "",
    blog: profile.blog || "",
    createdAt: profile.created_at,
    publicRepos: profile.public_repos ?? repos.length,
    followers: profile.followers ?? 0,
    following: profile.following ?? 0,
    totalStars,
    contributionsYear,
    languages,
    partial
  };
}

function buildNeofetchRows(data) {
  const labelColor = "#88c0d0";
  const valueColor = "#e5e9f0";
  const dimColor = "#8b949e";
  const title = `${data.login}@github`;
  const separator = "-".repeat(Math.max(8, title.length));
  const joined = String(data.createdAt ?? "").slice(0, 10) || "unknown";
  const languages = data.languages.length > 0 ? data.languages.join(", ") : "—";

  const rows = [
    { kind: "title", text: title, fill: "#a3be8c" },
    { kind: "title", text: separator, fill: dimColor },
    { kind: "kv", label: "Name", value: data.name, labelColor, valueColor },
    { kind: "kv", label: "Platform", value: "GitHub", labelColor, valueColor },
    { kind: "kv", label: "Host", value: "github.com", labelColor, valueColor },
    { kind: "kv", label: "Joined", value: joined, labelColor, valueColor },
    { kind: "kv", label: "Uptime", value: formatUptime(data.createdAt), labelColor, valueColor },
    { kind: "kv", label: "Repos", value: formatNumber(data.publicRepos), labelColor, valueColor },
    { kind: "kv", label: "Followers", value: formatNumber(data.followers), labelColor, valueColor },
    { kind: "kv", label: "Following", value: formatNumber(data.following), labelColor, valueColor },
    { kind: "kv", label: "Stars", value: formatNumber(data.totalStars), labelColor, valueColor },
    { kind: "kv", label: "Contributions", value: `${formatNumber(data.contributionsYear)} (1y)`, labelColor, valueColor },
    { kind: "kv", label: "Languages", value: languages, labelColor, valueColor }
  ];

  if (data.company) {
    rows.push({ kind: "kv", label: "Company", value: truncate(data.company, 36), labelColor, valueColor });
  }
  if (data.location) {
    rows.push({ kind: "kv", label: "Location", value: truncate(data.location, 36), labelColor, valueColor });
  }
  if (data.blog) {
    rows.push({ kind: "kv", label: "Website", value: truncate(data.blog.replace(/^https?:\/\//, ""), 36), labelColor, valueColor });
  }
  if (data.bio) {
    rows.push({ kind: "kv", label: "Bio", value: truncate(data.bio, 40), labelColor, valueColor });
  }
  if (data.partial) {
    rows.push({ kind: "title", text: "(some fields limited by API)", fill: dimColor });
  }

  return rows;
}

function buildNeofetchPrompt(themeName, githubId) {
  if (themeName === "windows") {
    return [
      { text: "PS ", fill: "#c678dd" },
      { text: `C:\\Users\\${githubId}`, fill: "#e5c07b" },
      { text: "> ", fill: "#c5c8c6" }
    ];
  }
  if (themeName === "ubuntu") {
    return [
      { text: `${githubId}@ubuntu`, fill: "#98c379" },
      { text: ":~", fill: "#c5c8c6" },
      { text: "$ ", fill: "#c5c8c6" }
    ];
  }
  return [
    { text: `${githubId}@MacBook`, fill: "#98c379" },
    { text: " ~ ", fill: "#61afef" },
    { text: "% ", fill: "#c5c8c6" }
  ];
}

function buildNeofetchCommand(themeName, githubId, color) {
  const modeFlag = color ? " --color" : "";
  if (themeName === "windows") {
    return `Get-GHNeofetch ${githubId}${modeFlag}`;
  }
  return `neofetch --github ${githubId}${modeFlag}`;
}

function logoToCells(color) {
  const logo = GITHUB_LOGO;
  const rows = [];
  for (const lineParts of logo.lines) {
    const cells = [];
    for (const part of lineParts) {
      const fill = color
        ? (logo.colors[(part.c ?? 1) - 1] ?? logo.colors[0])
        : logo.mono;
      for (const ch of part.t) {
        cells.push({ ch, fill: ch === " " ? null : fill });
      }
    }
    rows.push(cells);
  }
  return rows;
}

function measureLogoCols(rows) {
  return Math.max(1, ...rows.map((row) => row.length));
}

function resolveLogoMetrics(rows) {
  const cols = measureLogoCols(rows);
  // Scale glyph size so the logo block matches the old avatar width.
  const fontSize = Math.max(12, Math.min(28, Math.round(TARGET_LOGO_WIDTH / (cols * 0.62))));
  const charW = fontSize * 0.62;
  const lineH = fontSize + 4;
  return {
    fontSize,
    charW,
    lineH,
    asciiW: Math.ceil(cols * charW),
    asciiH: Math.ceil(rows.length * lineH)
  };
}

function renderAsciiBlock(rows, { x, y, fontSize, charW, lineH }) {
  const parts = [];
  for (let row = 0; row < rows.length; row += 1) {
    const lineY = y + row * lineH;
    const cells = rows[row];
    let run = "";
    let runFill = null;
    let runX = x;

    const flush = () => {
      if (!run || !runFill) {
        runX += run.length * charW;
        run = "";
        return;
      }
      parts.push(
        `<text x="${runX}" y="${lineY}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace" fill="${runFill}">${escapeXml(run)}</text>`
      );
      runX += run.length * charW;
      run = "";
    };

    for (const cell of cells) {
      if (cell.ch === " " || !cell.fill) {
        flush();
        runFill = null;
        runX += charW;
        continue;
      }
      if (runFill === null) {
        runFill = cell.fill;
        run = cell.ch;
        continue;
      }
      if (cell.fill === runFill) {
        run += cell.ch;
      } else {
        flush();
        runFill = cell.fill;
        run = cell.ch;
      }
    }
    flush();
  }
  return parts.join("\n");
}

function renderInfoRows(rows, { x, y, fontSize, lineH, labelWidth }) {
  const parts = [];
  let cursorY = y;
  for (const row of rows) {
    if (row.kind === "title") {
      parts.push(
        `<text x="${x}" y="${cursorY}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace" fill="${row.fill}">${escapeXml(row.text)}</text>`
      );
    } else {
      parts.push(
        `<text x="${x}" y="${cursorY}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace" fill="${row.labelColor}" font-weight="700">${escapeXml(row.label)}</text>`
      );
      parts.push(
        `<text x="${x + labelWidth}" y="${cursorY}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace" fill="${row.valueColor}">: ${escapeXml(row.value)}</text>`
      );
    }
    cursorY += lineH;
  }
  return { svg: parts.join("\n"), height: cursorY - y };
}

function renderColorBars(x, y) {
  const size = 14;
  const gap = 3;
  const parts = [];
  for (let i = 0; i < NEOFETCH_COLOR_BARS.length; i += 1) {
    const col = i % 8;
    const row = Math.floor(i / 8);
    const bx = x + col * (size + gap);
    const by = y + row * (size + gap);
    parts.push(`<rect x="${bx}" y="${by}" width="${size}" height="${size}" rx="2" fill="${NEOFETCH_COLOR_BARS[i]}"/>`);
  }
  return {
    svg: parts.join("\n"),
    height: 2 * size + gap,
    width: 8 * size + 7 * gap
  };
}

export async function generateNeofetchSvg(themeName, githubId, options = {}) {
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }

  const color = resolveColorMode(options.color ?? options.mode);
  const data = await fetchNeofetchData(githubId);
  const asciiRows = logoToCells(color);
  const infoRows = buildNeofetchRows(data);
  const logoMetrics = resolveLogoMetrics(asciiRows);

  const fontSize = 14;
  const uiFontSize = 15;
  const titleFontSize = 13;
  const infoLineH = 20;
  const { charW, lineH: asciiLineH, asciiW, asciiH, fontSize: logoFontSize } = logoMetrics;

  const labelWidth = Math.ceil(
    Math.max(...infoRows.filter((r) => r.kind === "kv").map((r) => textWidth(r.label, fontSize)), textWidth("Contributions", fontSize))
  ) + 4;
  const maxValueWidth = Math.max(
    ...infoRows.map((r) => {
      if (r.kind === "title") return textWidth(r.text, fontSize);
      return labelWidth + textWidth(`: ${r.value}`, fontSize);
    }),
    textWidth(`${data.login}@github`, fontSize)
  );
  const infoW = Math.ceil(maxValueWidth + 8);

  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const promptY = 86;
  const contentX = 44;
  const contentY = 152;
  const infoGap = 36;
  const fetchLineY = promptY + 22;
  const successLineY = fetchLineY + 20;

  const promptParts = buildNeofetchPrompt(themeName, githubId);
  const commandText = buildNeofetchCommand(themeName, githubId, color);
  const maxPromptCommandWidth = Math.max(
    ...["mac", "windows", "ubuntu"].map((themeVariant) => {
      const p = buildNeofetchPrompt(themeVariant, githubId);
      const c = buildNeofetchCommand(themeVariant, githubId, color);
      return promptPartsWidth(p, uiFontSize) + 3 + textWidth(c, uiFontSize);
    })
  );

  const colorBars = renderColorBars(0, 0);
  const infoBlockH = infoRows.length * infoLineH + 16 + colorBars.height;
  const contentH = Math.max(asciiH + 20, infoBlockH);
  const bottomPromptY = contentY + contentH + 28;
  const termBottomPadding = 24;

  const minWidthForPrompt = Math.ceil(contentX + maxPromptCommandWidth + 60);
  const minWidthForContent = Math.ceil(contentX + asciiW + infoGap + infoW + 44);
  const width = Math.max(680, minWidthForPrompt, minWidthForContent);
  const termW = width - 40;
  const termBodyTop = termY + headerH;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;
  const outputScale = resolveOutputScale(options.scale);
  const outputWidth = Math.round(width * outputScale);
  const outputHeight = Math.round(height * outputScale);

  const promptStartX = contentX;
  const promptW = promptPartsWidth(promptParts, uiFontSize);
  const commandW = textWidth(commandText, uiFontSize);
  const commandX = promptStartX + promptW + 3;
  const commandClipId = "neofetch-command-typing-clip";
  const fetchClipId = "neofetch-fetch-typing-clip";
  const fetchText = "Fetching profile from GitHub API...";
  const fetchWidth = textWidth(fetchText, 13);
  const modeLabel = color ? "color" : "mono";

  const timeline = {
    typingDuration: 1.2,
    fetchStart: 1.2,
    fetchDuration: 0.75,
    successAt: 1.95,
    neofetchAt: 2.05,
    bottomAt: 2.4,
    blinkDuration: 0.8,
    cycleDuration: 2.4
  };
  timeline.typingRatio = (timeline.typingDuration / timeline.cycleDuration).toFixed(6);
  timeline.fetchStartRatio = (timeline.fetchStart / timeline.cycleDuration).toFixed(6);
  timeline.fetchEndRatio = ((timeline.fetchStart + timeline.fetchDuration) / timeline.cycleDuration).toFixed(6);

  const controlsY = termY + 20;
  const controlsX = themeName === "mac"
    ? termX + 18
    : (themeName === "windows" ? termX + termW - 74 : termX + termW - 62);

  const infoX = contentX + asciiW + infoGap;
  const infoY = contentY + 12;
  const logoY = contentY + Math.max(0, Math.floor((contentH - asciiH) / 2));

  const infoRendered = renderInfoRows(infoRows, {
    x: infoX,
    y: infoY,
    fontSize,
    lineH: infoLineH,
    labelWidth
  });
  const bars = renderColorBars(infoX, infoY + infoRendered.height + 10);

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub neofetch card for ${escapeXml(githubId)}">`);
  svg.push(`<title>${escapeXml(theme.title(githubId))}</title>`);
  svg.push(`<defs>`);
  svg.push(`<style>${createAnimationCss(timeline)}</style>`);
  svg.push(`<clipPath id="${commandClipId}"><rect x="${commandX}" y="${promptY - 16}" width="0" height="22"><animate attributeName="width" values="0;${commandW + 6};${commandW + 6}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></rect></clipPath>`);
  svg.push(`<clipPath id="${fetchClipId}"><rect x="${promptStartX}" y="${fetchLineY - 16}" width="0" height="20"><animate attributeName="width" values="0;0;${fetchWidth + 6};${fetchWidth + 6}" keyTimes="0;${timeline.fetchStartRatio};${timeline.fetchEndRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></rect></clipPath>`);
  svg.push(`</defs>`);

  svg.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termBodyTop}" width="${termW - 2}" height="${termH - headerH - 1}" rx="0" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (themeName === "windows" && POWERSHELL_ICON_DATA_URI) {
    svg.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  svg.push(theme.controlsSvg(controlsX, controlsY));
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="${titleFontSize}" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(githubId))}</text>`);

  svg.push(addTextSpans(promptParts, promptStartX, promptY, uiFontSize));
  svg.push(`<text x="${commandX}" y="${promptY}" fill="${theme.text}" font-size="${uiFontSize}" font-family="Consolas, Menlo, monospace" clip-path="url(#${commandClipId})">${escapeXml(commandText)}</text>`);
  svg.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="#c5c8c6" font-size="${uiFontSize}" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" values="${commandX};${commandX + commandW + 2};${commandX + commandW + 2}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></text>`);

  svg.push(`<g class="line-fetch">`);
  svg.push(`<text x="${promptStartX}" y="${fetchLineY}" fill="#8b949e" font-size="13" font-family="Consolas, Menlo, monospace" clip-path="url(#${fetchClipId})">${escapeXml(fetchText)}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-success">`);
  svg.push(`<text x="${promptStartX}" y="${successLineY}" font-size="13" font-family="Consolas, Menlo, monospace"><tspan fill="#98c379">\u2714 </tspan><tspan fill="${theme.text}">${escapeXml(`Success! Generated ${modeLabel} neofetch for '${githubId}'.`)}</tspan></text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-neofetch">`);
  svg.push(renderAsciiBlock(asciiRows, {
    x: contentX,
    y: logoY,
    fontSize: logoFontSize,
    charW,
    lineH: asciiLineH
  }));
  svg.push(infoRendered.svg);
  svg.push(bars.svg);
  svg.push(`</g>`);

  svg.push(`<g class="line-bottom">`);
  svg.push(addTextSpans(promptParts, promptStartX, bottomPromptY, uiFontSize));
  svg.push(`<text class="cursor" x="${promptStartX + promptPartsWidth(promptParts, uiFontSize)}" y="${bottomPromptY}" fill="#c5c8c6" font-size="${uiFontSize}" font-family="Consolas, Menlo, monospace">█</text>`);
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}
