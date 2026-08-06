import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Jimp } from "jimp";

import { THEMES } from "./themes.js";

const GITHUB_API_BASE = "https://api.github.com";
const ASCII_CHARS = " .:-=+*#%@";

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

function createAnimationCss(timeline) {
  const pct = (seconds) => ((seconds / timeline.cycleDuration) * 100).toFixed(4);

  return `
  .line-fetch { opacity: 0; animation: show-fetch ${timeline.cycleDuration}s linear forwards; }
  .line-success { opacity: 0; animation: show-success ${timeline.cycleDuration}s linear forwards; }
  .line-ascii { opacity: 0; animation: show-ascii ${timeline.cycleDuration}s linear forwards; }
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
  @keyframes show-ascii { 0%, ${pct(Math.max(0, timeline.asciiAt - 0.01))}% { opacity: 0; } ${pct(timeline.asciiAt)}%, 100% { opacity: 1; } }
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

function clampCols(input) {
  const parsed = Number.parseInt(String(input ?? ""), 10);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(140, Math.max(24, parsed));
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
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
    throw new Error(`GitHub API error ${response.status} for ${url}`);
  }
  return response.json();
}

export async function imageToAsciiGrid(imageSource, { cols = 100, color = false } = {}) {
  const image = await Jimp.read(imageSource);
  const width = cols;
  // Monospace glyphs are taller than wide; compress vertical samples.
  const height = Math.max(24, Math.round(cols * 0.58));
  image.resize({ w: width, h: height });

  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const cells = [];
    for (let x = 0; x < width; x += 1) {
      const rgba = image.getPixelColor(x, y);
      const r = (rgba >>> 24) & 255;
      const g = (rgba >>> 16) & 255;
      const b = (rgba >>> 8) & 255;
      const a = rgba & 255;
      const lum = a < 16 ? 0 : luminance(r, g, b);
      const idx = Math.min(
        ASCII_CHARS.length - 1,
        Math.max(0, Math.floor((lum / 255) * (ASCII_CHARS.length - 1)))
      );
      const ch = ASCII_CHARS[idx];
      cells.push({
        ch: ch === " " ? " " : ch,
        fill: color ? rgbToHex(r, g, b) : null
      });
    }
    rows.push(cells);
  }
  return rows;
}

async function fetchAsciiProfile(githubId) {
  const profile = await fetchJson(`${GITHUB_API_BASE}/users/${encodeURIComponent(githubId)}`);
  const avatarUrl = profile.avatar_url
    ? `${profile.avatar_url}${profile.avatar_url.includes("?") ? "&" : "?"}s=480`
    : null;
  if (!avatarUrl) {
    throw new Error(`No avatar found for user '${githubId}'`);
  }
  return {
    login: profile.login || githubId,
    name: profile.name || profile.login || githubId,
    bio: profile.bio || "",
    avatarUrl
  };
}

function buildAsciiPrompt(themeName, githubId) {
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

function buildAsciiCommand(themeName, githubId, color) {
  const modeFlag = color ? " --color" : "";
  if (themeName === "windows") {
    return `Get-GHAscii ${githubId}${modeFlag}`;
  }
  if (themeName === "ubuntu") {
    return `ascii-avatar ${githubId}${modeFlag}`;
  }
  return `github-cli ascii --user ${githubId}${modeFlag}`;
}

function renderAsciiBlock(rows, { x, y, fontSize, charW, lineH, monoFill }) {
  const parts = [];
  for (let row = 0; row < rows.length; row += 1) {
    const lineY = y + row * lineH;
    const cells = rows[row];
    // Group consecutive same-color runs for smaller SVG.
    let run = "";
    let runFill = null;
    let runX = x;

    const flush = () => {
      if (!run) return;
      parts.push(
        `<text x="${runX}" y="${lineY}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace" fill="${runFill}">${escapeXml(run)}</text>`
      );
      runX += run.length * charW;
      run = "";
    };

    for (const cell of cells) {
      const fill = cell.fill ?? monoFill;
      if (runFill === null) {
        runFill = fill;
        run = cell.ch;
        continue;
      }
      if (fill === runFill) {
        run += cell.ch;
      } else {
        flush();
        runFill = fill;
        run = cell.ch;
      }
    }
    flush();
  }
  return parts.join("\n");
}

export async function generateAsciiAvatarSvg(themeName, githubId, options = {}) {
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }

  const color = resolveColorMode(options.color ?? options.mode);
  const cols = clampCols(options.cols ?? options.size);
  const profile = await fetchAsciiProfile(githubId);
  const asciiRows = await imageToAsciiGrid(profile.avatarUrl, { cols, color });

  const fontSize = 15;
  const charW = fontSize * 0.6;
  const lineH = fontSize + 4;
  const asciiW = Math.ceil(cols * charW);
  const asciiH = Math.ceil(asciiRows.length * lineH);

  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const promptY = 86;
  const contentX = 44;
  const contentY = 152;
  const infoGap = 32;
  const infoW = 240;
  const contentH = Math.max(asciiH, 120);
  const fetchLineY = promptY + 22;
  const successLineY = fetchLineY + 20;
  const bottomPromptY = contentY + contentH + 28;
  const termBottomPadding = 24;

  const promptParts = buildAsciiPrompt(themeName, githubId);
  const commandText = buildAsciiCommand(themeName, githubId, color);
  const maxPromptCommandWidth = Math.max(
    ...["mac", "windows", "ubuntu"].map((themeVariant) => {
      const p = buildAsciiPrompt(themeVariant, githubId);
      const c = buildAsciiCommand(themeVariant, githubId, color);
      return promptPartsWidth(p, 15) + 3 + textWidth(c, 15);
    })
  );

  const minWidthForPrompt = Math.ceil(44 + maxPromptCommandWidth + 60);
  const minWidthForContent = Math.ceil(contentX + asciiW + infoGap + infoW + 44);
  const width = Math.max(680, minWidthForPrompt, minWidthForContent);
  const termW = width - 40;
  const termBodyTop = termY + headerH;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;
  // High-res ASCII portraits need a smaller default display scale.
  const outputScale = resolveOutputScale(options.scale ?? 0.28);
  const outputWidth = Math.round(width * outputScale);
  const outputHeight = Math.round(height * outputScale);

  const promptStartX = 44;
  const promptW = promptPartsWidth(promptParts, 15);
  const commandW = textWidth(commandText, 15);
  const commandX = promptStartX + promptW + 3;
  const commandClipId = "ascii-command-typing-clip";
  const fetchClipId = "ascii-fetch-typing-clip";
  const fetchText = "Fetching avatar from GitHub API...";
  const fetchWidth = textWidth(fetchText, 13);
  const modeLabel = color ? "color" : "mono";

  const timeline = {
    typingDuration: 1.2,
    fetchStart: 1.2,
    fetchDuration: 0.75,
    successAt: 1.95,
    asciiAt: 2.05,
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
  const infoCenterY = contentY + Math.floor(asciiH / 2);
  const monoFill = theme.text;

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}" role="img" aria-label="ASCII avatar for ${escapeXml(githubId)}">`);
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
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(githubId))}</text>`);

  svg.push(addTextSpans(promptParts, promptStartX, promptY, 15));
  svg.push(`<text x="${commandX}" y="${promptY}" fill="${theme.text}" font-size="15" font-family="Consolas, Menlo, monospace" clip-path="url(#${commandClipId})">${escapeXml(commandText)}</text>`);
  svg.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" values="${commandX};${commandX + commandW + 2};${commandX + commandW + 2}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></text>`);

  svg.push(`<g class="line-fetch">`);
  svg.push(`<text x="${promptStartX}" y="${fetchLineY}" fill="#8b949e" font-size="13" font-family="Consolas, Menlo, monospace" clip-path="url(#${fetchClipId})">${escapeXml(fetchText)}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-success">`);
  svg.push(`<text x="${promptStartX}" y="${successLineY}" font-size="13" font-family="Consolas, Menlo, monospace"><tspan fill="#98c379">\u2714 </tspan><tspan fill="${theme.text}">${escapeXml(`Success! Generated ${modeLabel} ASCII avatar for '${githubId}'.`)}</tspan></text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-ascii">`);
  svg.push(renderAsciiBlock(asciiRows, {
    x: contentX,
    y: contentY,
    fontSize,
    charW,
    lineH,
    monoFill
  }));

  svg.push(`<text x="${infoX}" y="${infoCenterY - 10}" font-size="22" font-family="Segoe UI, Arial, sans-serif" fill="#58a6ff" font-weight="700">${escapeXml(profile.name)}</text>`);
  svg.push(`<text x="${infoX}" y="${infoCenterY + 18}" font-size="16" font-family="Consolas, Menlo, monospace" fill="${theme.accentSuccess}">@${escapeXml(profile.login)}</text>`);
  svg.push(`<text x="${infoX}" y="${infoCenterY + 44}" font-size="13" font-family="Segoe UI, Arial, sans-serif" fill="#8b949e">${color ? "color ascii" : "mono ascii"} · ${cols} cols</text>`);
  if (profile.bio) {
    const bio = profile.bio.length > 48 ? `${profile.bio.slice(0, 45)}...` : profile.bio;
    svg.push(`<text x="${infoX}" y="${infoCenterY + 68}" font-size="13" font-family="Segoe UI, Arial, sans-serif" fill="#8b949e">${escapeXml(bio)}</text>`);
  }
  svg.push(`</g>`);

  svg.push(`<g class="line-bottom">`);
  svg.push(addTextSpans(promptParts, promptStartX, bottomPromptY, 15));
  svg.push(`<text class="cursor" x="${promptStartX + promptPartsWidth(promptParts, 15)}" y="${bottomPromptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█</text>`);
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}
