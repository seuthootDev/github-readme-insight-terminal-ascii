import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DAY_LABELS,
  GRAPH_COLORS,
  NUM_WEEKS,
  addDays,
  getGraphRange,
  levelFromCount,
  toIsoDate
} from "./constants.js";
import { fetchContributions, sumContributions } from "./githubContributions.js";
import { THEMES } from "./themes.js";

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
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(date) {
  return toIsoDate(date);
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

function monthLabels(firstSunday, gridStartX, colStep) {
  const labels = [];
  const endDate = addDays(firstSunday, NUM_WEEKS * 7 - 1);
  let current = new Date(firstSunday.getFullYear(), firstSunday.getMonth(), 1);

  while (current < firstSunday) {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  let lastRight = -Infinity;
  while (current <= endDate) {
    const weekIndex = Math.floor((current - firstSunday) / (1000 * 60 * 60 * 24 * 7));
    const safeWeekIndex = Math.max(0, Math.min(NUM_WEEKS - 1, weekIndex));
    const text = current.toLocaleString("en-US", { month: "short" });
    const x = gridStartX + safeWeekIndex * colStep;
    const width = textWidth(text, 14);
    if (x >= lastRight + 6) {
      labels.push({ text, x });
      lastRight = x + width;
    }
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return labels;
}

function buildGridData(firstSunday, today, contributions) {
  const grid = [];
  for (let row = 0; row < 7; row += 1) {
    const rowCells = [];
    for (let col = 0; col < NUM_WEEKS; col += 1) {
      const date = addDays(firstSunday, col * 7 + row);
      const iso = toIsoDate(date);
      const count = date > today ? 0 : (contributions[iso] ?? 0);
      const level = levelFromCount(count);
      rowCells.push({ date, iso, count, level });
    }
    grid.push(rowCells);
  }
  return grid;
}

function createAnimationCss(timeline) {
  const pct = (seconds) => ((seconds / timeline.cycleDuration) * 100).toFixed(4);

  return `
  .line-fetch { opacity: 0; animation: show-fetch ${timeline.cycleDuration}s linear forwards; }
  .line-success { opacity: 0; animation: show-success ${timeline.cycleDuration}s linear forwards; }
  .line-graph { opacity: 0; animation: show-graph ${timeline.cycleDuration}s linear forwards; }
  .line-bottom { opacity: 0; animation: show-bottom ${timeline.cycleDuration}s linear forwards; }
  .graph-cell-hitbox { cursor: help; }
  .cursor {
    opacity: 1;
    visibility: hidden;
    animation: cursor-window ${timeline.cycleDuration}s steps(1, end) forwards, blink ${timeline.blinkDuration}s steps(1,end) infinite;
  }
  .typing-cursor {
    opacity: 1;
    animation: typing-cursor-window ${timeline.cycleDuration}s steps(1, end) forwards;
  }
  @keyframes show-fetch { 0%, ${pct(Math.max(0, timeline.fetchAt - 0.01))}% { opacity: 0; } ${pct(timeline.fetchAt)}%, 100% { opacity: 1; } }
  @keyframes show-success { 0%, ${pct(Math.max(0, timeline.successAt - 0.01))}% { opacity: 0; } ${pct(timeline.successAt)}%, 100% { opacity: 1; } }
  @keyframes show-graph { 0%, ${pct(Math.max(0, timeline.graphAt - 0.01))}% { opacity: 0; } ${pct(timeline.graphAt)}%, 100% { opacity: 1; } }
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

export async function generateGraphSvg(themeName, githubId, options = {}) {
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }

  const contributions = await fetchContributions(githubId);
  const total = sumContributions(contributions);
  const { firstSunday, today } = getGraphRange();
  const grid = buildGridData(firstSunday, today, contributions);

  const width = 1180;
  const termX = 20;
  const termY = 20;
  const headerH = 40;

  const bottomPromptY = 410;
  const termBottomPadding = 24;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;
  const termW = width - 40;
  const outputScale = resolveOutputScale(options.scale);
  const outputWidth = Math.round(width * outputScale);
  const outputHeight = Math.round(height * outputScale);

  const monthY = 170;
  const rowStartY = 198;
  const cellSize = 13;
  const cellGap = 7;
  const colStep = cellSize + cellGap;
  const rowStep = cellSize + 11;
  const dayLabelX = 62;
  const gridStartX = 96;

  const promptParts = theme.prompt(githubId);
  const promptStartX = 44;
  const promptY = 86;
  const promptWidth = promptPartsWidth(promptParts, 16);
  const promptToCommandGap = 3;
  const promptCursorGap = 0;
  const commandX = promptStartX + promptWidth + promptToCommandGap;
  const commandText = theme.command(githubId);
  const commandWidth = textWidth(commandText, 16);
  const commandClipId = "command-typing-clip";
  const monthLabelItems = monthLabels(firstSunday, gridStartX, colStep);
  const timeline = {
    typingDuration: 1.2,
    fetchAt: 1.25,
    successAt: 1.8,
    graphAt: 2.3,
    bottomAt: 2.9,
    blinkDuration: 0.8,
    cycleDuration: 2.9
  };
  timeline.typingRatio = (timeline.typingDuration / timeline.cycleDuration).toFixed(6);

  const controlsY = termY + 20;
  const controlsX = themeName === "mac"
    ? termX + 18
    : (themeName === "windows" ? termX + termW - 74 : termX + termW - 62);

  const svgParts = [];
  svgParts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub contribution graph for ${escapeXml(githubId)}">`);
  svgParts.push(`<title>${escapeXml(theme.title(githubId))}</title>`);
  svgParts.push(`<defs>`);
  svgParts.push(`<style>${createAnimationCss(timeline)}</style>`);
  svgParts.push(
    `<clipPath id="${commandClipId}"><rect x="${commandX}" y="${promptY - 16}" width="0" height="22"><animate attributeName="width" values="0;${commandWidth + 6};${commandWidth + 6}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></rect></clipPath>`
  );
  svgParts.push(`</defs>`);

  svgParts.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svgParts.push(`<rect x="${termX + 1}" y="${termY + headerH}" width="${termW - 2}" height="${termH - headerH - 1}" rx="0" fill="${theme.bodyBg}"/>`);
  svgParts.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (themeName === "windows" && POWERSHELL_ICON_DATA_URI) {
    svgParts.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  svgParts.push(theme.controlsSvg(controlsX, controlsY));

  svgParts.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(githubId))}</text>`);

  svgParts.push(`<g>`);
  svgParts.push(addTextSpans(promptParts, promptStartX, promptY));
  svgParts.push(`<text x="${commandX}" y="${promptY}" fill="${theme.text}" font-size="16" font-family="Consolas, Menlo, monospace" clip-path="url(#${commandClipId})">${escapeXml(commandText)}</text>`);
  svgParts.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="#c5c8c6" font-size="16" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" values="${commandX};${commandX + commandWidth + 2};${commandX + commandWidth + 2}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></text>`);
  svgParts.push(`</g>`);

  const dateRange = `${formatDate(firstSunday)} ~ ${formatDate(today)}`;
  const dateRangeX = termX + termW - 24;
  svgParts.push(`<text class="line-fetch" x="44" y="113" fill="#8b949e" font-size="16" font-family="Consolas, Menlo, monospace">Fetching data from GitHub API...</text>`);
  svgParts.push(`<text class="line-success" x="44" y="136" fill="${theme.accentSuccess}" font-size="16" font-family="Consolas, Menlo, monospace">✔ Success! Generated contribution graph for '${escapeXml(githubId)}'.</text>`);
  svgParts.push(`<text class="line-success" x="${dateRangeX}" y="136" fill="#8b949e" font-size="14" font-family="Consolas, Menlo, monospace" text-anchor="end">${dateRange}</text>`);

  svgParts.push(`<g class="line-graph">`);
  for (const monthItem of monthLabelItems) {
    svgParts.push(`<text x="${monthItem.x}" y="${monthY}" fill="#ffffff" font-size="14" font-family="Consolas, Menlo, monospace">${escapeXml(monthItem.text)}</text>`);
  }

  for (let row = 0; row < DAY_LABELS.length; row += 1) {
    const y = rowStartY + row * rowStep;
    svgParts.push(`<text x="${dayLabelX}" y="${y}" fill="#ffffff" font-size="14" font-family="Consolas, Menlo, monospace">${DAY_LABELS[row]}</text>`);

    for (let col = 0; col < NUM_WEEKS; col += 1) {
      const cell = grid[row][col];
      const x = gridStartX + col * colStep;
      const fill = GRAPH_COLORS[cell.level];
      const tooltip = cell.count > 0
        ? `${cell.iso} (${DAY_LABELS[row]}) — ${cell.count} contribution${cell.count === 1 ? "" : "s"}`
        : `${cell.iso} (${DAY_LABELS[row]}) — No contributions`;

      svgParts.push(`<g><title>${escapeXml(tooltip)}</title><rect x="${x}" y="${y - 11}" width="${cellSize}" height="${cellSize}" fill="${fill}" rx="2" /><rect class="graph-cell-hitbox" x="${x - 1}" y="${y - 12}" width="${cellSize + 2}" height="${cellSize + 2}" fill="transparent" rx="3" /></g>`);
    }
  }

  const contribText = `${total} contribution${total === 1 ? "" : "s"} in the last year`;
  const footerY = 388;
  const legendY = footerY - 12;
  svgParts.push(`<text x="44" y="${footerY}" fill="#8b949e" font-size="14" font-family="Consolas, Menlo, monospace">${contribText}</text>`);
  svgParts.push(`<text x="930" y="${footerY}" fill="#8b949e" font-size="14" font-family="Consolas, Menlo, monospace">Less</text>`);

  let legendX = 970;
  for (const color of GRAPH_COLORS) {
    svgParts.push(`<rect x="${legendX}" y="${legendY}" width="12" height="12" fill="${color}" rx="2" />`);
    legendX += 18;
  }
  svgParts.push(`<text x="${legendX + 2}" y="${footerY}" fill="#8b949e" font-size="14" font-family="Consolas, Menlo, monospace">More</text>`);
  svgParts.push(`</g>`);

  svgParts.push(`<g class="line-bottom">`);
  svgParts.push(addTextSpans(promptParts, promptStartX, bottomPromptY));
  svgParts.push(`<text class="cursor" x="${promptStartX + promptWidth + promptCursorGap}" y="${bottomPromptY}" fill="#c5c8c6" font-size="16" font-family="Consolas, Menlo, monospace">█</text>`);
  svgParts.push(`</g>`);

  svgParts.push(`</svg>`);
  return svgParts.join("\n");
}