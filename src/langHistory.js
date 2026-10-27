import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { THEMES } from "./themes.js";
import { REDUCED_MOTION_CSS } from "./constants.js";

const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const DEFAULT_YEARS = 6;
const MIN_YEARS = 3;
const MAX_YEARS = 10;
const LEGEND_LANGUAGES = 4;
const BAR_BLOCKS = 40;
const OTHER = "Other";

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

// Lift very dark language colors (e.g. C's #555555) so they stay visible on the dark terminal body.
function readableColor(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ""));
  if (!match) return hex;
  const value = Number.parseInt(match[1], 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  const luminance = (0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]) / 255;
  if (luminance >= 0.5) return hex;
  const mix = Math.min(0.6, (0.5 - luminance) * 2);
  return `#${channels.map((c) => Math.round(c + (255 - c) * mix).toString(16).padStart(2, "0")).join("")}`;
}

function truncateFit(text, maxChars) {
  const t = String(text);
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
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

function resolveOutputScale(input) {
  const parsed = Number.parseFloat(String(input ?? "1"));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(0.05, parsed));
}

function resolveYearCount(input) {
  const parsed = Number.parseInt(String(input ?? ""), 10);
  if (Number.isNaN(parsed)) return DEFAULT_YEARS;
  return Math.min(MAX_YEARS, Math.max(MIN_YEARS, parsed));
}

// One GraphQL request with an aliased contributionsCollection per year (each is capped at one year).
function buildHistoryQuery(years) {
  const fields = years.map((year) => `
    y${year}: contributionsCollection(from: "${year}-01-01T00:00:00Z", to: "${year}-12-31T23:59:59Z") {
      commitContributionsByRepository(maxRepositories: 100) {
        contributions { totalCount }
        repository { isPrivate primaryLanguage { name color } }
      }
    }`).join("");
  return `query($login: String!) { user(login: $login) { login createdAt ${fields} } }`;
}

async function fetchLanguageHistory(githubId, yearCount) {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!githubToken) {
    throw new Error("The lang-history card uses the GitHub GraphQL API. Set GITHUB_TOKEN or GH_TOKEN.");
  }

  const currentYear = new Date().getUTCFullYear();
  const years = Array.from({ length: yearCount }, (_, i) => currentYear - yearCount + 1 + i);
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "User-Agent": "github-readme-insight-terminal-ascii"
    },
    body: JSON.stringify({ query: buildHistoryQuery(years), variables: { login: githubId } })
  });
  if (response.status === 401) {
    throw new Error("GitHub rejected the token (HTTP 401). Check GITHUB_TOKEN / GH_TOKEN.");
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub GraphQL API: HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (payload.errors?.some((error) => error.type === "NOT_FOUND") || (!payload.data?.user && !payload.errors)) {
    throw new Error("GitHub user not found.");
  }
  if (payload.errors?.length) {
    throw new Error(`GitHub GraphQL error: ${payload.errors[0].message}`);
  }

  const user = payload.data.user;
  const createdYear = new Date(user.createdAt).getUTCFullYear();
  const colors = {};
  const rows = years
    .filter((year) => year >= createdYear)
    .map((year) => {
      const byLanguage = {};
      // Private repos only show up for a self-hoster's own token; keep them out of a public card.
      for (const entry of user[`y${year}`]?.commitContributionsByRepository ?? []) {
        if (entry.repository?.isPrivate) continue;
        const language = entry.repository?.primaryLanguage?.name ?? OTHER;
        if (entry.repository?.primaryLanguage?.color) colors[language] = entry.repository.primaryLanguage.color;
        byLanguage[language] = (byLanguage[language] ?? 0) + Number(entry.contributions?.totalCount ?? 0);
      }
      const total = Object.values(byLanguage).reduce((acc, count) => acc + count, 0);
      return { year, byLanguage, total };
    });

  // Drop leading empty years so a newer account doesn't start with blank rows.
  const firstActive = rows.findIndex((row) => row.total > 0);
  return { rows: firstActive === -1 ? [] : rows.slice(firstActive), colors };
}

// Pick the languages for the legend across all years so colors stay stable row to row.
function pickLegendLanguages(rows) {
  const totals = {};
  for (const row of rows) {
    for (const [language, count] of Object.entries(row.byLanguage)) {
      if (language === OTHER) continue;
      totals[language] = (totals[language] ?? 0) + count;
    }
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, LEGEND_LANGUAGES).map(([language]) => language);
}

function rowSegments(row, legend) {
  const segments = legend.map((language) => [language, row.byLanguage[language] ?? 0]);
  const known = segments.reduce((acc, [, count]) => acc + count, 0);
  segments.push([OTHER, row.total - known]);
  return segments.filter(([, count]) => count > 0);
}

function share(row, language) {
  return row.total > 0 ? ((row.byLanguage[language] ?? 0) / row.total) * 100 : 0;
}

function biggestMover(rows, legend) {
  if (rows.length < 2) return null;
  const first = rows[0];
  const last = rows[rows.length - 1];
  let best = null;
  for (const language of legend) {
    const delta = share(last, language) - share(first, language);
    if (!best || Math.abs(delta) > Math.abs(best.delta)) best = { language, delta };
  }
  return best && Math.round(best.delta) !== 0 ? { ...best, since: first.year } : null;
}

function buildHistoryPrompt(themeName, githubId) {
  const palette = (THEMES[themeName] ?? THEMES.mac).palette;
  if (themeName === "windows") {
    return [
      { text: "PS ", fill: palette.purple },
      { text: `C:\\Users\\${githubId}`, fill: palette.yellow },
      { text: "> ", fill: palette.fg }
    ];
  }

  if (themeName === "ubuntu") {
    return [
      { text: `${githubId}@ubuntu`, fill: palette.green },
      { text: ":~", fill: palette.fg },
      { text: "$ ", fill: palette.fg }
    ];
  }

  return [
    { text: `${githubId}@MacBook`, fill: palette.green },
    { text: " ~ ", fill: palette.blue },
    { text: "% ", fill: palette.fg }
  ];
}

function buildHistoryCommand(themeName, githubId, yearCount) {
  if (themeName === "windows") return `Get-GHLanguageHistory ${githubId} -Years ${yearCount}`;
  if (themeName === "ubuntu") return `./github-cli --lang-history=${githubId} --years=${yearCount}`;
  return `github-cli lang-history --user ${githubId} --years ${yearCount}`;
}

function createAnimationCss(timeline, rowCount) {
  const pct = (seconds) => ((seconds / timeline.cycleDuration) * 100).toFixed(4);
  const rowRules = [];
  for (let i = 0; i < rowCount; i += 1) {
    rowRules.push(`.row-${i} { animation-delay: ${(timeline.cardAt + timeline.rowStagger * (i + 1)).toFixed(2)}s; }`);
  }

  return `
  .line-fetch { opacity: 0; animation: show-fetch ${timeline.cycleDuration}s linear forwards; }
  .line-success { opacity: 0; animation: show-success ${timeline.cycleDuration}s linear forwards; }
  .line-card { opacity: 0; animation: show-card ${timeline.cycleDuration}s linear forwards; }
  .line-bottom { opacity: 0; animation: show-bottom ${timeline.cycleDuration}s linear forwards; }
  .list-row { opacity: 0; animation: row-in 0.12s linear forwards; }
  ${rowRules.join("\n  ")}
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
  @keyframes show-card { 0%, ${pct(Math.max(0, timeline.cardAt - 0.01))}% { opacity: 0; } ${pct(timeline.cardAt)}%, 100% { opacity: 1; } }
  @keyframes show-bottom { 0%, ${pct(Math.max(0, timeline.bottomAt - 0.01))}% { opacity: 0; } ${pct(timeline.bottomAt)}%, 100% { opacity: 1; } }
  @keyframes row-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cursor-window { 0%, ${pct(Math.max(0, timeline.bottomAt - 0.01))}% { visibility: hidden; } ${pct(timeline.bottomAt)}%, 100% { visibility: visible; } }
  @keyframes typing-cursor-window { 0%, ${pct(timeline.typingDuration)}% { opacity: 1; } ${pct(Math.min(timeline.cycleDuration, timeline.typingDuration + 0.01))}%, 100% { opacity: 0; } }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  `;
}

export async function generateLangHistorySvg(themeName, githubId, options = {}) {
  const palette = (THEMES[themeName] ?? THEMES.mac).palette;
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }

  const yearCount = resolveYearCount(options.years);
  const { rows, colors } = await fetchLanguageHistory(githubId, yearCount);
  const legend = pickLegendLanguages(rows);
  const colorOf = (language) => (language === OTHER ? palette.border : readableColor(colors[language] ?? palette.mute));
  const mover = biggestMover(rows, legend);

  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const promptY = 86;
  const cardX = 44;
  const cardY = 152;
  const rowH = 26;
  const headerRowY = cardY + 30;
  const rowsTop = headerRowY + 34;
  const visibleRows = Math.max(1, rows.length);
  const footerY = rowsTop + (visibleRows - 1) * rowH + 40;
  const cardH = footerY - cardY + 24;
  const fetchLineY = promptY + 22;
  const successLineY = fetchLineY + 20;
  const bottomPromptY = cardY + cardH + 28;
  const termBottomPadding = 24;

  const commandText = buildHistoryCommand(themeName, githubId, yearCount);
  const maxPromptCommandWidth = Math.max(
    ...["mac", "windows", "ubuntu"].map((themeVariant) => promptPartsWidth(buildHistoryPrompt(themeVariant, githubId), 15) + 3 + textWidth(buildHistoryCommand(themeVariant, githubId, yearCount), 15))
  );
  const width = Math.max(940, Math.ceil(44 + maxPromptCommandWidth + 60));
  const termW = width - 40;
  const cardW = width - 88;
  const termBodyTop = termY + headerH;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;
  const outputScale = resolveOutputScale(options.scale);
  const outputWidth = Math.round(width * outputScale);
  const outputHeight = Math.round(height * outputScale);

  const borderColor = palette.border;
  const labelColor = palette.mute;
  const yearX = cardX + 24;
  const barX = yearX + 52;
  const blockW = 7;
  const blockGap = 2;
  const topX = barX + BAR_BLOCKS * (blockW + blockGap) + 22;
  const topColW = 150;
  const contentRight = cardX + cardW - 28;

  const promptParts = buildHistoryPrompt(themeName, githubId);
  const promptStartX = 44;
  const commandX = promptStartX + promptPartsWidth(promptParts, 15) + 3;
  const commandWidth = textWidth(commandText, 15);
  const commandClipId = "langhistory-command-typing-clip";
  const fetchClipId = "langhistory-fetch-typing-clip";
  const fetchText = "Aggregating commit contributions by year...";
  const fetchWidth = textWidth(fetchText, 13);
  const successText = rows.length > 0
    ? `Success! ${rows.length} years of language history for '${githubId}'.`
    : `Success! No public commit history found for '${githubId}'.`;

  const timeline = {
    typingDuration: 1.2,
    fetchStart: 1.2,
    fetchDuration: 0.75,
    successAt: 1.95,
    cardAt: 2.05,
    rowStagger: 0.1,
    blinkDuration: 0.8
  };
  timeline.bottomAt = timeline.cardAt + timeline.rowStagger * (visibleRows + 1) + 0.15;
  timeline.cycleDuration = timeline.bottomAt;
  timeline.typingRatio = (timeline.typingDuration / timeline.cycleDuration).toFixed(6);
  timeline.fetchStartRatio = (timeline.fetchStart / timeline.cycleDuration).toFixed(6);
  timeline.fetchEndRatio = ((timeline.fetchStart + timeline.fetchDuration) / timeline.cycleDuration).toFixed(6);

  const controlsY = termY + 20;
  const controlsX = themeName === "mac"
    ? termX + 18
    : (themeName === "windows" ? termX + termW - 74 : termX + termW - 62);

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Language history card for ${escapeXml(githubId)}">`);
  svg.push(`<title>${escapeXml(theme.title(githubId))}</title>`);
  svg.push(`<defs>`);
  svg.push(`<style>${createAnimationCss(timeline, rows.length)}${REDUCED_MOTION_CSS}</style>`);
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
  svg.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="${palette.fg}" font-size="15" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" values="${commandX};${commandX + commandWidth + 2};${commandX + commandWidth + 2}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></text>`);

  svg.push(`<g class="line-fetch">`);
  svg.push(`<text x="${promptStartX}" y="${fetchLineY}" fill="${palette.mute}" font-size="13" font-family="Consolas, Menlo, monospace" clip-path="url(#${fetchClipId})">${escapeXml(fetchText)}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-success">`);
  svg.push(`<text x="${promptStartX}" y="${successLineY}" font-size="13" font-family="Consolas, Menlo, monospace"><tspan fill="${palette.green}">\u2714 </tspan><tspan fill="${theme.text}">${escapeXml(successText)}</tspan></text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-card">`);
  svg.push(`<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="12" fill="${theme.bodyBg}" stroke="${borderColor}"/>`);
  svg.push(`<text y="${headerRowY}" font-size="12" font-family="Consolas, Menlo, monospace" fill="${labelColor}"><tspan x="${yearX}">YEAR</tspan><tspan x="${barX}">SHARE OF COMMITS BY LANGUAGE</tspan><tspan x="${topX}">TOP 2</tspan></text>`);
  svg.push(`<text x="${contentRight}" y="${headerRowY}" font-size="12" font-family="Consolas, Menlo, monospace" fill="${labelColor}" text-anchor="end">COMMITS</text>`);
  svg.push(`<line x1="${yearX - 4}" y1="${headerRowY + 10}" x2="${contentRight + 4}" y2="${headerRowY + 10}" stroke="${borderColor}" stroke-dasharray="2,4"/>`);

  if (rows.length === 0) {
    svg.push(`<text x="${yearX}" y="${rowsTop}" font-size="13" font-family="Consolas, Menlo, monospace" fill="${labelColor}">No public commits in the last ${yearCount} years</text>`);
  }
  rows.forEach((row, i) => {
    const y = rowsTop + i * rowH;
    svg.push(`<g class="list-row row-${i}">`);
    svg.push(`<text x="${yearX}" y="${y}" font-size="14" font-family="Consolas, Menlo, monospace" fill="${palette.yellow}">${row.year}</text>`);
    if (row.total === 0) {
      for (let b = 0; b < BAR_BLOCKS; b += 1) {
        svg.push(`<rect x="${barX + b * (blockW + blockGap)}" y="${y - 10}" width="${blockW}" height="11" rx="1" fill="${palette.graph[0]}"/>`);
      }
    } else {
      let filled = 0;
      let running = 0;
      for (const [language, count] of rowSegments(row, legend)) {
        running += count;
        const end = Math.round((running / row.total) * BAR_BLOCKS);
        for (; filled < end; filled += 1) {
          svg.push(`<rect x="${barX + filled * (blockW + blockGap)}" y="${y - 10}" width="${blockW}" height="11" rx="1" fill="${colorOf(language)}"/>`);
        }
      }
    }
    const topLanguages = Object.entries(row.byLanguage)
      .filter(([language, count]) => language !== OTHER && count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);
    const topSpans = topLanguages.map(([language], j) => {
      const x = topX + j * topColW;
      return `<tspan x="${x}" fill="${colorOf(language)}">●</tspan><tspan fill="${theme.text}"> ${escapeXml(truncateFit(language, 12))}</tspan><tspan fill="${labelColor}"> ${Math.round(share(row, language))}%</tspan>`;
    }).join("");
    svg.push(`<text y="${y}" font-size="13" font-family="Consolas, Menlo, monospace">${topSpans || `<tspan x="${topX}" fill="${labelColor}">—</tspan>`}</text>`);
    svg.push(`<text x="${contentRight}" y="${y}" font-size="13" font-family="Consolas, Menlo, monospace" fill="${theme.text}" text-anchor="end">${formatNumber(row.total)}</text>`);
    svg.push(`</g>`);
  });

  svg.push(`<line x1="${yearX - 4}" y1="${footerY - 18}" x2="${contentRight + 4}" y2="${footerY - 18}" stroke="${borderColor}" stroke-dasharray="2,4"/>`);
  let legendX = yearX;
  const legendSpans = [...legend, OTHER].map((language) => {
    const label = truncateFit(language, 14);
    const span = `<tspan x="${legendX}" fill="${colorOf(language)}">■</tspan><tspan fill="${labelColor}"> ${escapeXml(label)}</tspan>`;
    legendX += (label.length + 5) * 12 * 0.62;
    return span;
  }).join("");
  svg.push(`<text y="${footerY}" font-size="12" font-family="Consolas, Menlo, monospace">${legendSpans}</text>`);
  if (mover) {
    const up = mover.delta > 0;
    svg.push(`<text x="${contentRight}" y="${footerY}" font-size="12" font-family="Consolas, Menlo, monospace" text-anchor="end"><tspan fill="${labelColor}">${escapeXml(truncateFit(mover.language, 14))} </tspan><tspan fill="${up ? palette.green : palette.red}">${up ? "▲" : "▼"} ${Math.abs(Math.round(mover.delta))}%p</tspan><tspan fill="${labelColor}"> since ${mover.since}</tspan></text>`);
  }
  svg.push(`</g>`);

  svg.push(`<g class="line-bottom">`);
  svg.push(addTextSpans(promptParts, promptStartX, bottomPromptY, 15));
  svg.push(`<text class="cursor" x="${promptStartX + promptPartsWidth(promptParts, 15)}" y="${bottomPromptY}" fill="${palette.fg}" font-size="15" font-family="Consolas, Menlo, monospace">█</text>`);
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}
