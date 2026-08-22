import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { fetchContributions } from "./githubContributions.js";
import { THEMES } from "./themes.js";

const GITHUB_API_BASE = "https://api.github.com";
const FLAME_COLOR = "#f0883e";

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
    spans.push(`<tspan fill="${part.fill}">${escapeXml(part.text)}</tspan>`);
  }
  return `<text x="${startX}" y="${y}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace">${spans.join("")}</text>`;
}

function createAnimationCss(timeline) {
  const pct = (seconds) => ((seconds / timeline.cycleDuration) * 100).toFixed(4);

  return `
  .line-fetch { opacity: 0; animation: show-fetch ${timeline.cycleDuration}s linear forwards; }
  .line-success { opacity: 0; animation: show-success ${timeline.cycleDuration}s linear forwards; }
  .line-streak { opacity: 0; animation: show-streak ${timeline.cycleDuration}s linear forwards; }
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
  @keyframes show-streak { 0%, ${pct(Math.max(0, timeline.streakAt - 0.01))}% { opacity: 0; } ${pct(timeline.streakAt)}%, 100% { opacity: 1; } }
  @keyframes show-bottom { 0%, ${pct(Math.max(0, timeline.bottomAt - 0.01))}% { opacity: 0; } ${pct(timeline.bottomAt)}%, 100% { opacity: 1; } }
  @keyframes cursor-window { 0%, ${pct(Math.max(0, timeline.bottomAt - 0.01))}% { visibility: hidden; } ${pct(timeline.bottomAt)}%, 100% { visibility: visible; } }
  @keyframes typing-cursor-window { 0%, ${pct(timeline.typingDuration)}% { opacity: 1; } ${pct(Math.min(timeline.cycleDuration, timeline.typingDuration + 0.01))}%, 100% { opacity: 0; } }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  `;
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

function formatShortDate(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function formatRange(range) {
  if (!range) return "No active streak";
  if (range.start === range.end) return formatShortDate(range.start);
  return `${formatShortDate(range.start)} - ${formatShortDate(range.end)}`;
}

function computeStreaks(contributions) {
  const dates = Object.keys(contributions).sort();
  if (dates.length === 0) {
    return {
      totalContributions: 0,
      currentStreak: 0,
      longestStreak: 0,
      currentRange: null,
      longestRange: null,
      totalRange: null
    };
  }

  let totalContributions = 0;
  let longestStreak = 0;
  let longestStart = null;
  let longestEnd = null;
  let runStart = null;
  let runLength = 0;

  for (const dateStr of dates) {
    const count = contributions[dateStr];
    totalContributions += count;
    if (count > 0) {
      if (runLength === 0) runStart = dateStr;
      runLength += 1;
      if (runLength > longestStreak) {
        longestStreak = runLength;
        longestStart = runStart;
        longestEnd = dateStr;
      }
    } else {
      runLength = 0;
      runStart = null;
    }
  }

  let currentStreak = 0;
  let currentStart = null;
  let currentEnd = null;
  const lastIndex = dates.length - 1;

  for (let i = lastIndex; i >= 0; i -= 1) {
    const dateStr = dates[i];
    const count = contributions[dateStr];

    if (i === lastIndex && count === 0) {
      continue;
    }

    if (count > 0) {
      if (currentStreak === 0) currentEnd = dateStr;
      currentStreak += 1;
      currentStart = dateStr;
    } else {
      break;
    }
  }

  return {
    totalContributions,
    currentStreak,
    longestStreak,
    currentRange: currentStreak > 0 ? { start: currentStart, end: currentEnd } : null,
    longestRange: longestStreak > 0 ? { start: longestStart, end: longestEnd } : null,
    totalRange: { start: dates[0], end: dates[lastIndex] }
  };
}

function buildStreakPrompt(themeName, githubId) {
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

function buildStreakCommand(themeName, githubId) {
  if (themeName === "windows") {
    return `Get-GHStreak ${githubId}`;
  }

  if (themeName === "ubuntu") {
    return `gh streak view ${githubId}`;
  }

  return `gh streak ${githubId}`;
}

function flamePath(cx, cy, scale = 1) {
  const p = [
    [0, -15], [4.5, -8], [7, -1], [5, 5], [0, 8],
    [-5, 5], [-7, -1], [-4.5, -8]
  ].map(([dx, dy]) => `${cx + dx * scale},${cy + dy * scale}`);
  return `M${p[0]} C${p[1]} ${p[2]} ${p[3]} C${p[4]} ${p[5]} ${p[6]} C${p[7]} ${p[0]} ${p[0]} Z`;
}

export async function generateStreakSvg(themeName, githubId, options = {}) {
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }

  const contributions = await fetchContributions(githubId);
  const streakData = computeStreaks(contributions);

  let profile = null;
  let partial = false;
  try {
    profile = await fetchJson(`${GITHUB_API_BASE}/users/${encodeURIComponent(githubId)}`);
  } catch {
    partial = true;
  }

  const login = profile?.login || githubId;
  const name = profile?.name || login;

  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const promptY = 86;
  const statsCardX = 44;
  const statsCardY = 152;
  const statsCardH = 219;
  const fetchLineY = promptY + 22;
  const successLineY = fetchLineY + 20;
  const bottomPromptY = statsCardY + statsCardH + 28;
  const termBottomPadding = 24;

  const promptParts0 = buildStreakPrompt(themeName, githubId);
  const commandText0 = buildStreakCommand(themeName, githubId);
  const maxPromptCommandWidth = Math.max(
    ...["mac", "windows", "ubuntu"].map((themeVariant) => {
      const promptParts = buildStreakPrompt(themeVariant, githubId);
      const commandText = buildStreakCommand(themeVariant, githubId);
      return promptPartsWidth(promptParts, 15) + 3 + textWidth(commandText, 15);
    })
  );
  const minWidthForPrompt = Math.ceil(44 + maxPromptCommandWidth + 60);
  const minWidthForCard = 560;
  const width = Math.max(minWidthForCard, minWidthForPrompt);

  const termW = width - 40;
  const statsCardW = width - 88;

  const termBodyTop = termY + headerH;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;
  const outputScale = resolveOutputScale(options.scale);
  const outputWidth = Math.round(width * outputScale);
  const outputHeight = Math.round(height * outputScale);

  const paddingX = statsCardX + 24;
  const borderColor = "#30363d";
  const labelColor = "#8b949e";
  const valueColor = theme.text;
  const titleColor = "#58a6ff";
  const subtitle = partial
    ? `${escapeXml(name)} (${escapeXml(login)}) · limited API data`
    : `${escapeXml(name)} (${escapeXml(login)})`;

  const promptParts = promptParts0;
  const promptStartX = 44;
  const commandText = commandText0;
  const promptW = promptPartsWidth(promptParts, 15);
  const commandW = textWidth(commandText, 15);
  const commandX = promptStartX + promptW + 3;
  const commandWidth = commandW;
  const commandClipId = "streak-command-typing-clip";
  const fetchClipId = "streak-fetch-typing-clip";
  const fetchText = "Calculating streak from GitHub API...";
  const fetchWidth = textWidth(fetchText, 13);

  const timeline = {
    typingDuration: 1.2,
    fetchStart: 1.2,
    fetchDuration: 0.75,
    successAt: 1.95,
    streakAt: 2.05,
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

  const dividerY = statsCardY + 62;
  const flameCenterY = statsCardY + 92;
  const ringCenterY = statsCardY + 128;
  const ringRadius = 33;
  const numberY = ringCenterY + 7;
  const labelY = ringCenterY + ringRadius + 22;
  const rangeY = labelY + 17;

  const colW = statsCardW / 3;
  const col0X = statsCardX + colW * 0.5;
  const col1X = statsCardX + colW * 1.5;
  const col2X = statsCardX + colW * 2.5;
  const sepX0 = statsCardX + colW;
  const sepX1 = statsCardX + colW * 2;

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub streak card for ${escapeXml(githubId)}">`);
  svg.push(`<title>${escapeXml(theme.title(githubId))}</title>`);
  svg.push(`<defs>`);
  svg.push(`<style>${createAnimationCss(timeline)}</style>`);
  svg.push(`<clipPath id="${commandClipId}"><rect x="${commandX}" y="${promptY - 16}" width="0" height="22"><animate attributeName="width" values="0;${commandWidth + 6};${commandWidth + 6}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></rect></clipPath>`);
  svg.push(`<clipPath id="${fetchClipId}"><rect x="${promptStartX}" y="${fetchLineY - 16}" width="0" height="20"><animate attributeName="width" values="0;0;${fetchWidth + 6};${fetchWidth + 6}" keyTimes="0;${timeline.fetchStartRatio};${timeline.fetchEndRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></rect></clipPath>`);
  svg.push(`</defs>`);

  svg.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termBodyTop}" width="${termW - 2}" height="${termH - headerH - 1}" rx="0" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (themeName === "windows" && POWERSHELL_ICON_DATA_URI) {
    svg.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  svg.push(theme.controlsSvg(controlsX, controlsY));
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(githubId))}</text>`);

  svg.push(addTextSpans(promptParts, promptStartX, promptY, 15));
  svg.push(`<text x="${commandX}" y="${promptY}" fill="${theme.text}" font-size="15" font-family="Consolas, Menlo, monospace" clip-path="url(#${commandClipId})">${escapeXml(commandText)}</text>`);
  svg.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" values="${commandX};${commandX + commandWidth + 2};${commandX + commandWidth + 2}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></text>`);

  svg.push(`<g class="line-fetch">`);
  svg.push(`<text x="${promptStartX}" y="${fetchLineY}" fill="#8b949e" font-size="13" font-family="Consolas, Menlo, monospace" clip-path="url(#${fetchClipId})">${escapeXml(fetchText)}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-success">`);
  svg.push(`<text x="${promptStartX}" y="${successLineY}" font-size="13" font-family="Consolas, Menlo, monospace"><tspan fill="#98c379">\u2714 </tspan><tspan fill="${theme.text}">${escapeXml(`Success! Generated GitHub streak for '${githubId}'.`)}</tspan></text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-streak">`);
  svg.push(`<rect x="${statsCardX}" y="${statsCardY}" width="${statsCardW}" height="${statsCardH}" rx="12" fill="${theme.bodyBg}" stroke="${borderColor}"/>`);
  svg.push(`<text x="${paddingX}" y="${statsCardY + 28}" font-size="21" font-family="Segoe UI, Arial, sans-serif" fill="${titleColor}" font-weight="700">GitHub Streak</text>`);
  svg.push(`<text x="${paddingX}" y="${statsCardY + 49}" font-size="13" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}">${subtitle}</text>`);
  svg.push(`<line x1="${paddingX}" y1="${dividerY}" x2="${statsCardX + statsCardW - 24}" y2="${dividerY}" stroke="${borderColor}"/>`);

  svg.push(`<line x1="${sepX0}" y1="${dividerY + 14}" x2="${sepX0}" y2="${statsCardY + statsCardH - 14}" stroke="${borderColor}" stroke-dasharray="3,4"/>`);
  svg.push(`<line x1="${sepX1}" y1="${dividerY + 14}" x2="${sepX1}" y2="${statsCardY + statsCardH - 14}" stroke="${borderColor}" stroke-dasharray="3,4"/>`);

  svg.push(`<text x="${col0X}" y="${numberY}" font-size="25" font-family="Segoe UI, Arial, sans-serif" fill="${valueColor}" font-weight="700" text-anchor="middle">${formatNumber(streakData.totalContributions)}</text>`);
  svg.push(`<text x="${col0X}" y="${labelY}" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}" text-anchor="middle">Total Contributions</text>`);
  svg.push(`<text x="${col0X}" y="${rangeY}" font-size="10" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}" text-anchor="middle">${escapeXml(formatRange(streakData.totalRange))}</text>`);

  svg.push(`<path d="${flamePath(col1X, flameCenterY, 1.05)}" fill="${FLAME_COLOR}"/>`);
  svg.push(`<circle cx="${col1X}" cy="${ringCenterY}" r="${ringRadius}" fill="none" stroke="${FLAME_COLOR}" stroke-width="2.5"/>`);
  svg.push(`<text x="${col1X}" y="${numberY}" font-size="25" font-family="Segoe UI, Arial, sans-serif" fill="${FLAME_COLOR}" font-weight="700" text-anchor="middle">${formatNumber(streakData.currentStreak)}</text>`);
  svg.push(`<text x="${col1X}" y="${labelY}" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}" text-anchor="middle">Current Streak</text>`);
  svg.push(`<text x="${col1X}" y="${rangeY}" font-size="10" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}" text-anchor="middle">${escapeXml(formatRange(streakData.currentRange))}</text>`);

  svg.push(`<text x="${col2X}" y="${numberY}" font-size="25" font-family="Segoe UI, Arial, sans-serif" fill="${valueColor}" font-weight="700" text-anchor="middle">${formatNumber(streakData.longestStreak)}</text>`);
  svg.push(`<text x="${col2X}" y="${labelY}" font-size="12" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}" text-anchor="middle">Longest Streak</text>`);
  svg.push(`<text x="${col2X}" y="${rangeY}" font-size="10" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}" text-anchor="middle">${escapeXml(formatRange(streakData.longestRange))}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-bottom">`);
  svg.push(addTextSpans(promptParts, promptStartX, bottomPromptY, 15));
  svg.push(`<text class="cursor" x="${promptStartX + promptPartsWidth(promptParts, 15)}" y="${bottomPromptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█</text>`);
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}
