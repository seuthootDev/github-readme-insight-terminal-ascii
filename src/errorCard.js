import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function wrapText(text, maxCharsPerLine) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildErrorPrompt(themeName, githubId) {
  const user = githubId || "user";
  if (themeName === "windows") {
    return [
      { text: "PS ", fill: "#c678dd" },
      { text: `C:\\Users\\${user}`, fill: "#e5c07b" },
      { text: "> ", fill: "#c5c8c6" }
    ];
  }

  if (themeName === "ubuntu") {
    return [
      { text: `${user}@ubuntu`, fill: "#98c379" },
      { text: ":~", fill: "#c5c8c6" },
      { text: "$ ", fill: "#c5c8c6" }
    ];
  }

  return [
    { text: `${user}@MacBook`, fill: "#98c379" },
    { text: " ~ ", fill: "#61afef" },
    { text: "% ", fill: "#c5c8c6" }
  ];
}

function buildErrorCommand(type, githubId) {
  const parts = ["gh", type || "svg"];
  if (githubId) parts.push(githubId);
  return parts.join(" ");
}

export function generateErrorSvg(themeName, options = {}) {
  const theme = THEMES[themeName] ?? THEMES.mac;
  const safeThemeName = THEMES[themeName] ? themeName : "mac";
  const user = String(options.user ?? "").trim();
  const type = String(options.type ?? "svg").trim();
  const message = String(options.message ?? "Something went wrong.").trim();

  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const promptY = 86;
  const errorLabelY = promptY + 32;
  const lineHeight = 20;

  const promptParts = buildErrorPrompt(safeThemeName, user);
  const commandText = buildErrorCommand(type, user);
  const promptStartX = 44;
  const promptW = promptPartsWidth(promptParts, 15);
  const commandW = textWidth(commandText, 15);
  const commandX = promptStartX + promptW + 3;

  const minWidthForPrompt = Math.ceil(promptStartX + promptW + commandW + 60);
  const minWidthForCard = 560;
  const width = Math.max(minWidthForCard, minWidthForPrompt);
  const termW = width - 40;

  const maxCharsPerLine = Math.floor((termW - 48) / (13 * 0.62));
  const messageLines = wrapText(message, maxCharsPerLine);

  const errorLinesStartY = errorLabelY + lineHeight;
  const bottomPromptY = errorLinesStartY + (messageLines.length - 1) * lineHeight + 30;
  const termBottomPadding = 24;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;

  const controlsY = termY + 20;
  const controlsX = safeThemeName === "mac"
    ? termX + 18
    : (safeThemeName === "windows" ? termX + termW - 74 : termX + termW - 62);

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Error generating ${escapeXml(type)} card">`);
  svg.push(`<title>${escapeXml(theme.title(user || "error"))}</title>`);

  svg.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + headerH}" width="${termW - 2}" height="${termH - headerH - 1}" rx="0" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (safeThemeName === "windows" && POWERSHELL_ICON_DATA_URI) {
    svg.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  svg.push(theme.controlsSvg(controlsX, controlsY));
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(user || "error"))}</text>`);

  svg.push(addTextSpans(promptParts, promptStartX, promptY, 15));
  svg.push(`<text x="${commandX}" y="${promptY}" fill="${theme.text}" font-size="15" font-family="Consolas, Menlo, monospace">${escapeXml(commandText)}</text>`);

  svg.push(`<text x="${promptStartX}" y="${errorLabelY}" font-size="14" font-family="Consolas, Menlo, monospace"><tspan fill="#f85149">\u2717 </tspan><tspan fill="${theme.text}">Error</tspan></text>`);
  for (let i = 0; i < messageLines.length; i += 1) {
    const y = errorLinesStartY + i * lineHeight;
    svg.push(`<text x="${promptStartX}" y="${y}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#8b949e">${escapeXml(messageLines[i])}</text>`);
  }

  svg.push(addTextSpans(promptParts, promptStartX, bottomPromptY, 15));
  svg.push(`<text x="${promptStartX + promptW}" y="${bottomPromptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█</text>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}
