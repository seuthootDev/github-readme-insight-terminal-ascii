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
    const safe = escapeXml(part.text);
    spans.push(`<tspan fill="${part.fill}">${safe}</tspan>`);
  }
  return `<text x="${startX}" y="${y}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace">${spans.join("")}</text>`;
}

function createAnimationCss() {
  return `
  .line-fetch { opacity: 0; animation: show 0.01s linear 1.2s forwards; }
  .line-success { opacity: 0; animation: show 0.01s linear 1.95s forwards; }
  .line-stats { opacity: 0; animation: show 0.01s linear 2.05s forwards; }
  .line-bottom { opacity: 0; animation: show 0.01s linear 2.4s forwards; }
  .cursor { opacity: 0; animation: show 0.01s linear 2.4s forwards, blink 1s steps(1,end) 2.4s infinite; }
  .typing-cursor {
    opacity: 1;
    animation: hideTypingCursor 0.01s linear 1.2s forwards;
  }
  .fetch-typing-cursor {
    display: none;
  }
  @keyframes show { to { opacity: 1; } }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  @keyframes hideTypingCursor { to { opacity: 0; } }
  `;
}

async function fetchJson(url) {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const logTokenUsage = ["1", "true", "yes", "on"].includes(String(process.env.LOG_GITHUB_TOKEN_USAGE ?? "").toLowerCase());
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-readme-insight-terminal-ascii"
  };

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  if (logTokenUsage) {
    console.log(`[github-api][stats] token-used=${Boolean(githubToken)} url=${url}`);
  }

  const response = await fetch(url, {
    headers
  });

  if (!response.ok) {
    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const resetEpoch = response.headers.get("x-ratelimit-reset");
      const hasToken = Boolean(githubToken);
      const resetHint = resetEpoch
        ? ` (reset at ${new Date(Number.parseInt(resetEpoch, 10) * 1000).toISOString()})`
        : "";

      if (!hasToken && remaining === "0") {
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
    const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?type=all&per_page=100&page=${page}`;
    const chunk = await fetchJson(url);
    if (!Array.isArray(chunk) || chunk.length === 0) {
      break;
    }

    repos.push(...chunk);
    if (chunk.length < 100) {
      break;
    }

    page += 1;
    if (page > 10) {
      break;
    }
  }

  return repos;
}

async function fetchSearchCount(query) {
  const url = `${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(query)}&per_page=1`;
  const data = await fetchJson(url);
  return data?.total_count ?? 0;
}

async function fetchStatsData(username) {
  const contributions = await fetchContributions(username);

  let profile = null;
  let repos = [];
  let totalPRs = 0;
  let totalIssues = 0;
  let ossContribs = 0;
  let partial = false;

  try {
    profile = await fetchJson(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`);
  } catch {
    partial = true;
  }

  try {
    repos = await fetchAllRepos(username);
  } catch {
    partial = true;
  }

  try {
    [totalPRs, totalIssues, ossContribs] = await Promise.all([
      fetchSearchCount(`author:${username} type:pr`),
      fetchSearchCount(`author:${username} type:issue`),
      fetchSearchCount(`author:${username} type:pr is:merged -user:${username}`),
    ]);
  } catch {
    partial = true;
  }

  const totalStars = repos.reduce((acc, repo) => acc + Number(repo.stargazers_count ?? 0), 0);
  const totalForks = repos.reduce((acc, repo) => acc + Number(repo.forks_count ?? 0), 0);
  const totalContributionsYear = sumContributions(contributions);
  const fallbackLogin = profile?.login || username;

  return {
    name: profile?.name || fallbackLogin,
    login: fallbackLogin,
    totalStars,
    totalForks,
    totalPRs,
    totalIssues,
    ossContribs,
    contributionsYear: totalContributionsYear,
    partial
  };
}

function buildStatsRows(data) {
  return [
    { label: "OSS Contribs", value: formatNumber(data.ossContribs) },
    { label: "Total PRs", value: formatNumber(data.totalPRs) },
    { label: "Total Issues", value: formatNumber(data.totalIssues) },
    { label: "Total Stars", value: formatNumber(data.totalStars) },
    { label: "Total Forks", value: formatNumber(data.totalForks) },
    { label: "Contributions (1y)", value: formatNumber(data.contributionsYear) }
  ];
}

function buildStatsPrompt(themeName, githubId) {
  if (themeName === "window") {
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

function buildStatsCommand(themeName, githubId) {
  if (themeName === "window") {
    return `Get-GHProfile ${githubId}`;
  }

  if (themeName === "ubuntu") {
    return `gh user view ${githubId}`;
  }

  return `gh api users/${githubId}`;
}

export async function generateStatsSvg(themeName, githubId) {
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }

  const data = await fetchStatsData(githubId);
  const statsRows = buildStatsRows(data);

  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const promptY = 86;
  const statsCardX = 44;
  const statsCardY = 152;
  const statsCardH = 188;
  const fetchLineY = promptY + 22;
  const successLineY = fetchLineY + 20;
  const bottomPromptY = statsCardY + statsCardH + 28;
  const termBottomPadding = 24;

  const promptParts0 = buildStatsPrompt(themeName, githubId);
  const commandText0 = buildStatsCommand(themeName, githubId);
  const maxPromptCommandWidth = Math.max(
    ...["mac", "window", "ubuntu"].map((themeVariant) => {
      const promptParts = buildStatsPrompt(themeVariant, githubId);
      const commandText = buildStatsCommand(themeVariant, githubId);
      return promptPartsWidth(promptParts, 15) + 3 + textWidth(commandText, 15);
    })
  );
  const minWidthForPrompt = Math.ceil(44 + maxPromptCommandWidth + 60);
  const minWidthForCard = 620;
  const width = Math.max(minWidthForCard, minWidthForPrompt);

  const termW = width - 40;
  const statsCardW = width - 88;

  const termBodyTop = termY + headerH;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;

  const paddingX = statsCardX + 24;
  const rowStartY = statsCardY + 92;
  const rowHeight = 28;
  const leftColX = paddingX;
  const rightColX = statsCardX + Math.round((width - 88) * 0.52);

  const borderColor = "#30363d";
  const labelColor = "#8b949e";
  const valueColor = theme.text;
  const titleColor = "#58a6ff";
  const iconColor = theme.accentSuccess;
  const subtitle = data.partial
    ? `${escapeXml(data.name)} (${escapeXml(data.login)}) · limited API data`
    : `${escapeXml(data.name)} (${escapeXml(data.login)})`;
  const promptParts = promptParts0;
  const promptStartX = 44;
  const commandText = commandText0;
  const promptW = promptPartsWidth(promptParts, 15);
  const commandW = textWidth(commandText, 15);
  const commandX = promptStartX + promptW + 3;
  const commandWidth = commandW;
  const commandClipId = "stats-command-typing-clip";
  const fetchClipId = "stats-fetch-typing-clip";
  const fetchText = "Fetching data from GitHub API...";
  const fetchWidth = textWidth(fetchText, 13);
  const successText = `\u2714 Success! Generated ASCII art for '${githubId}'.`;

  const leftRows = statsRows.slice(0, 3);
  const rightRows = statsRows.slice(3);

  const controlsY = termY + 20;
  const controlsX = themeName === "mac"
    ? termX + 18
    : (themeName === "window" ? termX + termW - 74 : termX + termW - 62);

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub stats card for ${escapeXml(githubId)}">`);
  svg.push(`<title>${escapeXml(theme.title(githubId))}</title>`);
  svg.push(`<defs>`);
  svg.push(`<style>${createAnimationCss()}</style>`);
  svg.push(`<clipPath id="${commandClipId}"><rect x="${commandX}" y="${promptY - 16}" width="0" height="22"><animate attributeName="width" from="0" to="${commandWidth + 6}" dur="1.2s" begin="0s" fill="freeze" /></rect></clipPath>`);
  svg.push(`<clipPath id="${fetchClipId}"><rect x="${promptStartX}" y="${fetchLineY - 16}" width="0" height="20"><animate attributeName="width" from="0" to="${fetchWidth + 6}" dur="0.75s" begin="1.2s" fill="freeze" /></rect></clipPath>`);
  svg.push(`</defs>`);

  svg.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termBodyTop}" width="${termW - 2}" height="${termH - headerH - 1}" rx="0" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (themeName === "window" && POWERSHELL_ICON_DATA_URI) {
    svg.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  svg.push(theme.controlsSvg(controlsX, controlsY));
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(githubId))}</text>`);

  svg.push(addTextSpans(promptParts, promptStartX, promptY, 15));
  svg.push(`<text x="${commandX}" y="${promptY}" fill="${theme.text}" font-size="15" font-family="Consolas, Menlo, monospace" clip-path="url(#${commandClipId})">${escapeXml(commandText)}</text>`);
  svg.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" from="${commandX}" to="${commandX + commandWidth + 2}" dur="1.2s" begin="0s" fill="freeze" /></text>`);

  svg.push(`<g class="line-fetch">`);
  svg.push(`<text x="${promptStartX}" y="${fetchLineY}" fill="#8b949e" font-size="13" font-family="Consolas, Menlo, monospace" clip-path="url(#${fetchClipId})">${escapeXml(fetchText)}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-success">`);
  svg.push(`<text x="${promptStartX}" y="${successLineY}" font-size="13" font-family="Consolas, Menlo, monospace"><tspan fill="#98c379">\u2714 </tspan><tspan fill="${theme.text}">${escapeXml(`Success! Generated ASCII art for '${githubId}'.`)}</tspan></text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-stats">`);
  svg.push(`<rect x="${statsCardX}" y="${statsCardY}" width="${statsCardW}" height="${statsCardH}" rx="12" fill="${theme.bodyBg}" stroke="${borderColor}"/>`);
  svg.push(`<text x="${paddingX}" y="${statsCardY + 34}" font-size="25" font-family="Segoe UI, Arial, sans-serif" fill="${titleColor}" font-weight="700">GitHub Stats</text>`);
  svg.push(`<text x="${paddingX}" y="${statsCardY + 58}" font-size="15" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}">${subtitle}</text>`);
  svg.push(`<line x1="${paddingX}" y1="${statsCardY + 70}" x2="${statsCardX + statsCardW - 24}" y2="${statsCardY + 70}" stroke="${borderColor}"/>`);

  for (let i = 0; i < leftRows.length; i += 1) {
    const y = rowStartY + i * rowHeight;
    const row = leftRows[i];
    svg.push(`<circle cx="${leftColX}" cy="${y - 5}" r="4" fill="${iconColor}"/>`);
    svg.push(`<text x="${leftColX + 12}" y="${y}" font-size="14" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}">${escapeXml(row.label)}</text>`);
    svg.push(`<text x="${leftColX + 160}" y="${y}" font-size="15" font-family="Segoe UI, Arial, sans-serif" fill="${valueColor}" font-weight="700" text-anchor="end">${escapeXml(row.value)}</text>`);
  }

  for (let i = 0; i < rightRows.length; i += 1) {
    const y = rowStartY + i * rowHeight;
    const row = rightRows[i];
    svg.push(`<circle cx="${rightColX}" cy="${y - 5}" r="4" fill="${iconColor}"/>`);
    svg.push(`<text x="${rightColX + 12}" y="${y}" font-size="14" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}">${escapeXml(row.label)}</text>`);
    svg.push(`<text x="${rightColX + 190}" y="${y}" font-size="15" font-family="Segoe UI, Arial, sans-serif" fill="${valueColor}" font-weight="700" text-anchor="end">${escapeXml(row.value)}</text>`);
  }
  svg.push(`</g>`);

  svg.push(`<g class="line-bottom">`);
  svg.push(addTextSpans(promptParts, promptStartX, bottomPromptY, 15));
  svg.push(`<text class="cursor" x="${promptStartX + promptPartsWidth(promptParts, 15)}" y="${bottomPromptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█</text>`);
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}