// Editor theme, skills card: the Extensions view, one installed "extension" per skill icon.
import { editorWindow, fadeIn, fit, palette, rect, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const TILE_W = 120;
const GAP = 8;
const ICON = 48;
const ICON_PX = ICON / 20;

function luminance(hex) {
  const n = Number.parseInt(hex, 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

// Brand bitmap; colours that would vanish on the tile get a thin outline of offset copies.
function iconSvg(icon, x, y, p) {
  const fill = `#${icon.hex}`;
  const lum = luminance(icon.hex);
  const outline = p.name === "light" ? (lum > 0.75 ? "#8b949e" : null) : (lum < 0.18 ? "#9d9d9d" : null);
  let out = "";
  if (outline) {
    const o = 1 / ICON_PX;
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o]]) {
      out += `<path transform="translate(${x} ${y}) scale(${ICON_PX}) translate(${dx} ${dy})" shape-rendering="crispEdges" fill="${outline}" d="${icon.path}"/>`;
    }
  }
  return `${out}<path transform="translate(${x} ${y}) scale(${ICON_PX})" shape-rendering="crispEdges" fill="${fill}" d="${icon.path}"/>`;
}

export function renderEditorSkills(data, { githubId, scale, scheme, perline = 6, labels = true } = {}) {
  const p = palette(scheme);
  const icons = Array.isArray(data.icons) ? data.icons : [];
  const missing = Array.isArray(data.missing) ? data.missing : [];
  const perLine = Math.max(1, Math.min(perline, Math.max(1, icons.length)));
  const rows = Math.max(1, Math.ceil(icons.length / perLine));
  const tileH = labels ? 112 : 76;

  const gridW = perLine * TILE_W + (perLine - 1) * GAP;
  const contentW = Math.max(gridW, 420);
  const WIDTH = 20 + 44 + 24 + contentW + 24 + 20;
  const headerH = 64;
  const editorH = headerH + rows * (tileH + GAP) + 16;
  const HEIGHT = 20 + 30 + 35 + editorH + 22 + 20;
  const user = String(githubId || "").trim() || "dev";

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `Extensions — ${user}`,
    active: "extensions",
    tabs: [{ label: "Extensions: Installed", badge: "ext", active: true }],
    status: {
      left: [{ text: "⎇ main" }, missing.length ? { text: `⚠ not found: ${fit(missing.join(", "), Math.max(80, WIDTH - 420), 12)}`, color: p.warn } : { text: "⊗ 0  ⚠ 0" }],
      right: [{ text: `${icons.length} installed` }]
    }
  });
  const e = win.regions.editor;
  let body = win.svg;

  // Search box + section label.
  const x0 = e.x + 24;
  body += rect(x0, e.y + 12, contentW, 26, p.input, `rx="2" stroke="${p.line}"`);
  body += text(x0 + 8, e.y + 29.5, "@installed", { size: 13, fill: p.fg });
  body += text(x0 + contentW - 10, e.y + 29.5, "⫶ ↻ ⋯", { size: 13, fill: p.dim, anchor: "end" });
  body += text(x0, e.y + 56, "INSTALLED", { size: 11, weight: 700, fill: p.fg, extra: 'letter-spacing="0.4"' });
  const bw = textWidth(String(icons.length), 11) + 12;
  body += rect(x0 + 72, e.y + 45, bw, 15, p.accent, 'rx="7.5"');
  body += text(x0 + 72 + bw / 2, e.y + 56, String(icons.length), { size: 11, fill: "#ffffff", anchor: "middle" });

  icons.forEach((icon, i) => {
    const col = i % perLine, row = Math.floor(i / perLine);
    const tx = x0 + col * (TILE_W + GAP);
    const ty = e.y + headerH + row * (tileH + GAP);
    let tile = rect(tx, ty, TILE_W, tileH, p.side, `rx="4" stroke="${p.line}"`);
    tile += iconSvg(icon, tx + (TILE_W - ICON) / 2, ty + 12, p);
    if (labels) {
      tile += text(tx + TILE_W / 2, ty + 80, fit(icon.title, TILE_W - 14, 13), { size: 13, weight: 600, fill: p.fg, anchor: "middle" });
      tile += text(tx + TILE_W / 2, ty + 98, "✓ Installed", { size: 11, fill: p.dim, anchor: "middle" });
    }
    body += fadeIn(tile, 0.05 + i * 0.04);
  });
  if (icons.length === 0) {
    body += text(x0, e.y + headerH + 24, "No matching skills.", { size: 13, fill: p.dim });
  }
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `Skills — ${user}`,
    label: `Skills: ${icons.map((icon) => icon.title).join(", ")}`,
    body
  });
}
