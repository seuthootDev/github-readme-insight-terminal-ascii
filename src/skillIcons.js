import { THEMES } from "./themes.js";
import { REDUCED_MOTION_CSS } from "./constants.js";
import { ICONS, ICON_GRID } from "./skillIconsData.js";

const FONT = "Consolas, Menlo, monospace";
const PIXEL = 5;                       // px per bitmap pixel -> 100px tiles
const TILE = ICON_GRID * PIXEL;
const GAP = 24;
const PAD = 32;
const HEADER_H = 36;
const LABEL_GAP = 18;
const ROW_H = TILE + LABEL_GAP + 22;
const MAX_ICONS = 60;
const DEFAULT_PER_LINE = 6;
const COMMAND = "skills --list";

// skillicons.dev-style short ids, plus common nicknames, -> simple-icons slug.
const ALIASES = {
  js: "javascript", ts: "typescript", py: "python", java: "openjdk", cpp: "cplusplus", "c++": "cplusplus",
  cs: "csharp", "c#": "csharp", golang: "go", rs: "rust", kt: "kotlin", rb: "ruby", sh: "gnubash", bash: "gnubash",
  html: "html5", css3: "css", sass: "sass", scss: "sass", md: "markdown", tex: "latex",
  node: "nodedotjs", nodejs: "nodedotjs", vue: "vuedotjs", vuejs: "vuedotjs", next: "nextdotjs", nextjs: "nextdotjs",
  nuxtjs: "nuxt", nest: "nestjs", threejs: "threedotjs", tailwind: "tailwindcss", rails: "rubyonrails",
  dotnet: "dotnet", net: "dotnet", spring: "spring", springboot: "springboot",
  k8s: "kubernetes", aws: "amazonwebservices", azure: "microsoftazure", gcp: "googlecloud",
  postgres: "postgresql", mongo: "mongodb", kafka: "apachekafka", es: "elasticsearch",
  gh: "github", gha: "githubactions", vscode: "visualstudiocode", idea: "intellijidea", nvim: "neovim",
  tf: "terraform", unreal: "unrealengine", godot: "godotengine", rpi: "raspberrypi", pytorch: "pytorch",
  win: "windows", mac: "apple", macos: "apple"
};

// simple-icons ships some logos in black; recolor for a recognizable brand tint.
const COLOR_OVERRIDES = { openjdk: "ED8B00" };
// Aliases that should keep the name the user typed rather than the logo's own title.
const ALIAS_TITLES = { java: "Java" };

// Same rules simple-icons uses to derive slugs from titles.
function toSlug(name) {
  return name
    .toLowerCase()
    .replaceAll("+", "plus")
    .replaceAll(".", "dot")
    .replaceAll("&", "and")
    .replaceAll("#", "sharp")
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
}

export function resolveSkillIcon(name) {
  const raw = String(name).trim().toLowerCase();
  if (!raw) return null;
  const candidates = [ALIASES[raw], raw, ALIASES[toSlug(raw)], toSlug(raw)].filter(Boolean);
  for (const slug of candidates) {
    if (ICONS[slug]) {
      const [title, hex, bitmap] = ICONS[slug];
      return { slug, title: ALIAS_TITLES[raw] ?? title, hex: COLOR_OVERRIDES[slug] ?? hex, bitmap };
    }
  }
  return null;
}

export function getSkillIconSlugs() {
  return Object.keys(ICONS);
}

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Horizontal runs of lit pixels, as one path in bitmap-pixel units.
function bitmapToPath(base64) {
  const bytes = Buffer.from(base64, "base64");
  const lit = (x, y) => {
    const i = y * ICON_GRID + x;
    return (bytes[i >> 3] >> (7 - (i & 7))) & 1;
  };
  const parts = [];
  for (let y = 0; y < ICON_GRID; y++) {
    let x = 0;
    while (x < ICON_GRID) {
      if (!lit(x, y)) { x++; continue; }
      const start = x;
      while (x < ICON_GRID && lit(x, y)) x++;
      parts.push(`M${start} ${y}h${x - start}v1h${start - x}z`);
    }
  }
  return parts.join("");
}

// Near-black brand colors (Rust, Next.js...) would vanish on a dark terminal.
function displayColor(hex, fallback) {
  const n = Number.parseInt(hex, 16);
  const lum = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.25 ? fallback : `#${hex}`;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function promptWidth(parts, fontSize) {
  return parts.reduce((acc, part) => acc + part.text.length * fontSize * 0.56, 0);
}

function promptText(parts, x, y, fontSize) {
  const spans = parts.map((part) => `<tspan fill="${part.fill}">${escapeXml(part.text)}</tspan>`).join("");
  // textLength pins the prompt to the width the layout assumes under fallback fonts.
  return `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${FONT}" xml:space="preserve" textLength="${promptWidth(parts, fontSize)}" lengthAdjust="spacingAndGlyphs">${spans}</text>`;
}

function parseIconList(input) {
  const list = Array.isArray(input) ? input : String(input ?? "").split(",");
  return list.map((s) => String(s).trim()).filter(Boolean);
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value ?? ""), 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
}

export function generateSkillsSvg(themeName = "mac", githubId = "", options = {}) {
  const theme = THEMES[themeName] ?? THEMES.mac;
  const palette = theme.palette;
  const user = String(githubId || "").trim() || "dev";

  const requested = parseIconList(options.icons).slice(0, MAX_ICONS);
  if (requested.length === 0) {
    throw new Error("Query parameter 'i' is required, e.g. i=js,ts,react,docker");
  }
  const icons = [];
  const missing = [];
  const seen = new Set();
  for (const name of requested) {
    const icon = resolveSkillIcon(name);
    if (!icon) { missing.push(name); continue; }
    if (seen.has(icon.slug)) continue;
    seen.add(icon.slug);
    icons.push(icon);
  }

  const showLabels = options.labels !== false;
  const perLine = Math.min(clampInt(options.perline, 1, 12, DEFAULT_PER_LINE), Math.max(1, icons.length));
  const rows = Math.ceil(icons.length / perLine);
  const rowH = showLabels ? ROW_H : TILE + 22;

  const promptParts = theme.prompt(user);
  const commandX = PAD + promptWidth(promptParts, 14) + 3;
  const commandW = COMMAND.length * 14 * 0.6;
  const gridW = perLine * TILE + (perLine - 1) * GAP;
  const missingText = missing.length ? `skills: not found: ${missing.join(", ")}` : "";
  const width = Math.ceil(Math.max(
    PAD * 2 + gridW,
    commandX + commandW + PAD,
    PAD * 2 + missingText.length * 13 * 0.6
  ));

  const promptY = HEADER_H + 36;
  const gridTop = promptY + 26;
  const gridLeft = (width - gridW) / 2;
  let cursorY = gridTop + rows * rowH;
  const missingY = missing.length ? cursorY + 4 : 0;
  if (missing.length) cursorY += 26;
  const bottomPromptY = cursorY + 18;
  const height = bottomPromptY + 26;

  const scaleParsed = Number.parseFloat(String(options.scale ?? "1"));
  const scale = Number.isFinite(scaleParsed) ? Math.min(3, Math.max(0.05, scaleParsed)) : 1;

  const typeEnd = 0.6;
  const revealStart = typeEnd + 0.15;
  const step = 0.06;
  const revealEnd = revealStart + Math.max(0, icons.length - 1) * step + 0.3;

  const svg = [];
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * scale)}" height="${Math.round(height * scale)}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Skills: ${escapeXml(icons.map((i) => i.title).join(", "))}">`);
  svg.push(`<title>${escapeXml(theme.title(user))}</title>`);
  svg.push(`<style>
  .list-row { opacity: 0; animation: reveal 0.3s ease-out forwards; }
  .cursor { visibility: hidden; animation: show 0s ${revealEnd.toFixed(2)}s forwards, blink 1s steps(1, end) ${revealEnd.toFixed(2)}s infinite; }
  @keyframes reveal { to { opacity: 1; } }
  @keyframes show { to { visibility: visible; } }
  @keyframes blink { 50% { opacity: 0; } }
  ${REDUCED_MOTION_CSS}</style>`);
  svg.push(`<clipPath id="skills-cmd"><rect x="${commandX}" y="${promptY - 16}" width="0" height="22"><animate attributeName="width" from="0" to="${commandW + 6}" dur="${typeEnd}s" fill="freeze"/></rect></clipPath>`);

  svg.push(`<rect width="${width}" height="${height}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="1" y="${HEADER_H}" width="${width - 2}" height="${height - HEADER_H - 1}" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="1" y="1" width="${width - 2}" height="${HEADER_H}" rx="8" fill="${theme.headerBg}"/>`);
  const controlsX = themeName === "windows" ? width - 74 : (themeName === "ubuntu" ? width - 62 : 18);
  svg.push(theme.controlsSvg(controlsX, 20));
  svg.push(`<text x="${width / 2}" y="24" font-size="13" font-family="${FONT}" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(user))}</text>`);

  svg.push(promptText(promptParts, PAD, promptY, 14));
  svg.push(`<text x="${commandX}" y="${promptY}" font-size="14" font-family="${FONT}" fill="${theme.text}" clip-path="url(#skills-cmd)">${escapeXml(COMMAND)}</text>`);

  icons.forEach((icon, i) => {
    const x = gridLeft + (i % perLine) * (TILE + GAP);
    const y = gridTop + Math.floor(i / perLine) * rowH;
    const delay = (revealStart + i * step).toFixed(2);
    svg.push(`<g class="list-row" style="animation-delay:${delay}s">`);
    svg.push(`<path transform="translate(${x} ${y}) scale(${PIXEL})" shape-rendering="crispEdges" fill="${displayColor(icon.hex, palette.fg)}" d="${bitmapToPath(icon.bitmap)}"/>`);
    if (showLabels) {
      svg.push(`<text x="${x + TILE / 2}" y="${y + TILE + LABEL_GAP}" font-size="12" font-family="${FONT}" fill="${palette.mute}" text-anchor="middle">${escapeXml(truncate(icon.title.toLowerCase(), 14))}</text>`);
    }
    svg.push(`</g>`);
  });

  if (missing.length) {
    svg.push(`<text x="${PAD}" y="${missingY}" font-size="13" font-family="${FONT}" fill="${palette.red}">${escapeXml(missingText)}</text>`);
  }

  svg.push(promptText(promptParts, PAD, bottomPromptY, 14));
  svg.push(`<text class="cursor" x="${PAD + promptWidth(promptParts, 14)}" y="${bottomPromptY}" font-size="14" font-family="${FONT}" fill="${palette.fg}">█</text>`);
  svg.push(`</svg>`);
  return svg.join("\n");
}
