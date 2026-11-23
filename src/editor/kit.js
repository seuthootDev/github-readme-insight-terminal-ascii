// Shared drawing kit for theme=editor: every card is a code-editor window (activity bar, tabs,
// status bar) in a dark or light colour scheme, picked with ?scheme=dark|light.
import { esc, fit as fitText, formatNumber, textWidth } from "../win98/kit.js";

export { esc, formatNumber, textWidth };

export const UI = "'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, Ubuntu, 'Helvetica Neue', Arial, sans-serif";
export const MONO = "Consolas, 'SF Mono', Menlo, 'DejaVu Sans Mono', 'Liberation Mono', 'Courier New', monospace";
export const MONO_W = 0.6; // advance width of one monospace glyph, in em

const DARK = {
  name: "dark",
  bg: "#1f1f1f", side: "#181818", line: "#2b2b2b", fg: "#cccccc", dim: "#9d9d9d", faint: "#6e7681",
  accent: "#0078d4", link: "#4daafc", chip: "#2b2b2b", btnFg: "#ffffff", hover: "#2a2d2e", sel: "#04395e",
  input: "#313131", widget: "#202020", shadow: "rgba(0,0,0,0.36)",
  err: "#f14c4c", warn: "#cca700", ok: "#89d185", star: "#e8b641", debug: "#cc6633",
  kw: "#569cd6", ctl: "#c586c0", str: "#ce9178", cmt: "#6a9955", num: "#b5cea8", prop: "#9cdcfe", fn: "#dcdcaa", type: "#4ec9b0",
  lanes: ["#4ea1ff", "#c586c0", "#3fb950", "#e8b641"],
  heat: ["#2a2a2a", "#0d3a5f", "#0e70c0", "#4daafc"],
  addBg: "rgba(63,185,80,0.13)", delBg: "rgba(248,81,73,0.13)", pausedBg: "rgba(255,204,0,0.18)",
  states: { open: "#3fb950", draft: "#8b949e", merged: "#a371f7", closed: "#f85149" }
};

const LIGHT = {
  name: "light",
  bg: "#ffffff", side: "#f8f8f8", line: "#e5e5e5", fg: "#3b3b3b", dim: "#616161", faint: "#8b949e",
  accent: "#005fb8", link: "#005fb8", chip: "#eeeeee", btnFg: "#ffffff", hover: "#f2f2f2", sel: "#e4e6f1",
  input: "#ffffff", widget: "#f8f8f8", shadow: "rgba(0,0,0,0.16)",
  err: "#e51400", warn: "#bf8803", ok: "#388a34", star: "#bf8803", debug: "#cc6633",
  kw: "#0000ff", ctl: "#af00db", str: "#a31515", cmt: "#008000", num: "#098658", prop: "#001080", fn: "#795e26", type: "#267f99",
  lanes: ["#005fb8", "#a24bb3", "#1a7f37", "#bf8803"],
  heat: ["#ebedf0", "#b3d4f5", "#4a90d9", "#005fb8"],
  addBg: "rgba(26,127,55,0.12)", delBg: "rgba(207,34,46,0.10)", pausedBg: "rgba(255,204,0,0.32)",
  states: { open: "#1a7f37", draft: "#6e7781", merged: "#8250df", closed: "#cf222e" }
};

export function resolveScheme(input) {
  return String(input ?? "").trim().toLowerCase() === "light" ? "light" : "dark";
}

export function palette(scheme) {
  return resolveScheme(scheme) === "light" ? LIGHT : DARK;
}

export function fit(value, maxWidth, size = 13, bold = false) {
  return fitText(value, maxWidth, size, bold);
}

export function monoWidth(value, size = 13) {
  return [...String(value ?? "")].length * size * MONO_W;
}

export function fitMono(value, maxWidth, size = 13) {
  const chars = [...String(value ?? "")];
  const max = Math.max(1, Math.floor(maxWidth / (size * MONO_W)));
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max - 1).join("")}…`;
}

export function text(x, y, value, { size = 13, fill, weight, anchor, family = UI, italic = false, extra = "" } = {}) {
  return `<text x="${r(x)}" y="${r(y)}" font-size="${size}" font-family="${family}" fill="${fill}"${weight ? ` font-weight="${weight}"` : ""}${italic ? ' font-style="italic"' : ""}${anchor ? ` text-anchor="${anchor}"` : ""}${extra ? ` ${extra}` : ""}>${esc(value)}</text>`;
}

export function rect(x, y, w, h, fill, extra = "") {
  return `<rect x="${r(x)}" y="${r(y)}" width="${r(Math.max(0, w))}" height="${r(Math.max(0, h))}" fill="${fill}"${extra ? ` ${extra}` : ""}/>`;
}

export function hline(x, y, w, stroke) {
  return `<path d="M${r(x)} ${r(y) + 0.5}H${r(x + w)}" stroke="${stroke}"/>`;
}

export function vline(x, y, h, stroke) {
  return `<path d="M${r(x) + 0.5} ${r(y)}V${r(y + h)}" stroke="${stroke}"/>`;
}

function r(n) {
  return Math.round(Number(n) * 100) / 100;
}

// One line of syntax-coloured tokens: [[text, colourKeyOrHex], ...], drawn as tspans so the
// viewer's monospace font spaces them naturally. Cut with an ellipsis past maxWidth.
export function codeTokens(p, x, y, tokens, { size = 13, maxWidth = Infinity } = {}) {
  const maxCols = Number.isFinite(maxWidth) ? Math.floor(maxWidth / (size * MONO_W)) : Infinity;
  let col = 0;
  let spans = "";
  for (const [raw, color] of tokens) {
    if (col >= maxCols) break;
    let value = String(raw ?? "");
    if (col + value.length > maxCols) value = `${value.slice(0, Math.max(0, maxCols - col - 1))}…`;
    col += value.length;
    if (value) spans += `<tspan fill="${p[color] ?? color ?? p.fg}">${esc(value)}</tspan>`;
  }
  return spans ? `<text x="${r(x)}" y="${r(y)}" font-size="${size}" font-family="${MONO}" xml:space="preserve">${spans}</text>` : "";
}

// Editor text area with a line-number gutter. lines: [{ tokens, bg?: "add"|"del"|"paused"|hex, mark?: "breakpoint"|"paused" }]
export function codeBlock(p, x, y, w, lines, { size = 13, lineH = 20, start = 1, gutter = 48, activeLine = null } = {}) {
  let out = "";
  lines.forEach((line, i) => {
    const top = y + i * lineH;
    const base = top + lineH * 0.7;
    const bg = line.bg ? ({ add: p.addBg, del: p.delBg, paused: p.pausedBg }[line.bg] ?? line.bg) : null;
    if (bg) out += rect(x, top, w, lineH, bg);
    const n = start + i;
    out += text(x + gutter - 16, base, String(n), { size: size - 1, fill: n === activeLine ? p.fg : p.faint, anchor: "end", family: MONO });
    if (line.mark === "breakpoint" || line.mark === "paused") {
      out += `<circle cx="${r(x + 9)}" cy="${r(top + lineH / 2)}" r="4.5" fill="${p.err}"/>`;
    }
    if (line.mark === "paused") {
      const cy = top + lineH / 2;
      out += `<path d="M${r(x + 3)} ${r(cy - 4)}h6l4 4l-4 4h-6z" fill="#ffcc00" stroke="${p.bg}" stroke-width="0.8"/>`;
    }
    if (line.tokens) out += codeTokens(p, x + gutter, base, line.tokens, { size, maxWidth: w - gutter - 8 });
    if (line.inline) {
      const used = line.tokens ? line.tokens.reduce((n, [t]) => n + String(t).length, 0) : 0;
      const ix = x + gutter + used * size * MONO_W + 14;
      const iw = monoWidth(line.inline, size - 1) + 10;
      if (ix + iw < x + w - 4) {
        out += rect(ix, top + 3, iw, lineH - 6, p.chip, 'rx="3"');
        out += text(ix + 5, base, line.inline, { size: size - 1, fill: p.dim, family: MONO, italic: true });
      }
    }
  });
  return out;
}

// ---- Icons (original line drawings in a 24-unit box, stroked in the current colour).
const ICON_PATHS = {
  explorer: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z M14 3v4h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="M15 15l5 5"/>',
  scm: '<circle cx="7" cy="5.5" r="2"/><circle cx="7" cy="18.5" r="2"/><circle cx="17" cy="9" r="2"/><path d="M7 7.5v9M17 11c0 3-4 3-8.5 6"/>',
  debug: '<path d="M8 5l11 7-11 7z"/>',
  extensions: '<rect x="4" y="10" width="6" height="6"/><rect x="10" y="10" width="6" height="6"/><rect x="4" y="16" width="6" height="4"/><rect x="10" y="16" width="6" height="4"/><rect x="13" y="3" width="6" height="6" transform="rotate(15 16 6)"/>',
  pr: '<circle cx="7" cy="6" r="2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/><path d="M7 8v8M17 16V9a2 2 0 0 0-2-2h-4M13 5l-2 2 2 2"/>',
  account: '<circle cx="12" cy="9" r="4"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>'
};

export function icon(name, x, y, size, color, strokeWidth = 1.5) {
  const s = size / 24;
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s)})" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] ?? ""}</g>`;
}

// File-type badge used in tabs and trees: a coloured letter pair (no product artwork).
const FILE_BADGES = {
  js: ["JS", "#cbcb41"], ts: ["TS", "#3178c6"], md: ["M↓", "#519aba"], json: ["{}", "#cbcb41"],
  txt: ["≡", "#9d9d9d"], ipynb: ["◫", "#f57c00"], heat: ["▦", "#3fb950"], svg: ["◇", "#f1a22b"],
  git: ["⎇", "#f14c4c"], ext: ["▣", "#4daafc"], gh: ["◉", "#9d9d9d"]
};

export function fileBadge(kind, x, y, p) {
  const [label, color] = FILE_BADGES[kind] ?? FILE_BADGES.txt;
  const fill = p.name === "light" && kind === "js" ? "#b8a400" : p.name === "light" && kind === "json" ? "#b8a400" : color;
  return text(x, y, label, { size: label.length > 1 ? 10 : 12, weight: 700, fill, family: UI });
}

// ---- Window chrome.
const TITLE_H = 30;
const STATUS_H = 22;
const ACT_W = 44;
export const TAB_H = 35;

const ACTIVITY = ["explorer", "search", "scm", "debug", "extensions"];

function activityBar(p, x, y, h, active, extra = []) {
  let out = rect(x, y, ACT_W, h, p.side) + vline(x + ACT_W - 1, y, h, p.line);
  [...ACTIVITY, ...extra].forEach((name, i) => {
    const iy = y + 6 + i * 44;
    const on = name === active;
    if (on) out += rect(x, iy + 8, 2, 28, p.accent);
    out += icon(name, x + 11, iy + 11, 22, on ? p.fg : p.faint);
  });
  // Account and settings sit at the bottom when the bar is tall enough to keep them clear.
  const used = y + 6 + (ACTIVITY.length + extra.length) * 44;
  if (y + h - 84 >= used) out += icon("account", x + 11, y + h - 80, 22, p.faint);
  if (y + h - 42 >= used) out += icon("settings", x + 11, y + h - 38, 22, p.faint);
  return out;
}

export function tabStrip(p, x, y, w, tabs) {
  let out = rect(x, y, w, TAB_H, p.side) + hline(x, y + TAB_H - 1, w, p.line);
  let tx = x;
  for (const tab of tabs) {
    const label = fit(tab.label, tab.maxW ?? 260, 13);
    const tw = Math.round(textWidth(label, 13) + (tab.badge ? 44 : 28) + 20);
    if (tab.active) {
      out += rect(tx, y, tw, TAB_H, p.bg);
      out += rect(tx, y, tw, 1, p.accent);
    }
    out += vline(tx + tw - 1, y, TAB_H - (tab.active ? 0 : 1), p.line);
    let lx = tx + 12;
    if (tab.badge) {
      out += fileBadge(tab.badge, lx, y + 22, p);
      lx += 22;
    }
    out += text(lx, y + 22, label, { size: 13, fill: tab.active ? p.fg : p.dim, italic: Boolean(tab.preview) });
    out += text(tx + tw - 18, y + 22, tab.dirty ? "●" : "×", { size: tab.dirty ? 10 : 14, fill: tab.active ? p.dim : "transparent" });
    tx += tw;
  }
  return out;
}

// Status bar items: { text, color?, bg?, w? } on the left, `right` items packed from the right edge.
function statusBar(p, x, y, w, { left = [], right = [], bg, fg } = {}) {
  const barBg = bg ?? p.side;
  const barFg = fg ?? p.dim;
  let out = rect(x, y, w, STATUS_H, barBg) + (bg ? "" : hline(x, y, w, p.line));
  out += rect(x, y, 34, STATUS_H, bg ? "rgba(0,0,0,0.18)" : p.accent);
  out += text(x + 17, y + 15.5, "⇄", { size: 12, fill: "#ffffff", anchor: "middle" });
  let lx = x + 34;
  for (const item of left) {
    const tw = textWidth(item.text, 12) + 18;
    out += text(lx + 9, y + 15.5, item.text, { size: 12, fill: item.color ?? barFg });
    lx += tw;
  }
  let rx = x + w - 8;
  for (const item of [...right].reverse()) {
    const tw = textWidth(item.text, 12) + 18;
    out += text(rx - 9, y + 15.5, item.text, { size: 12, fill: item.color ?? barFg, anchor: "end" });
    rx -= tw;
  }
  return out;
}

// Draws the whole window frame and returns the regions the card fills.
//   side: width of the sidebar (0 = none); panel: height of the bottom panel (0 = none)
export function editorWindow(p, { x = 20, y = 20, w, h, title, active = "explorer", side = 0, sideTitle = "", tabs = [], panel = 0, panelTabs = [], status = {}, extraActivity = [] }) {
  let svg = "";
  svg += `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="8" fill="${p.bg}" stroke="${p.line}"/>`;
  svg += `<clipPath id="ed-win"><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="7.5"/></clipPath>`;
  let inner = "";

  // Title bar: three neutral window dots and the centred title.
  inner += rect(x, y, w, TITLE_H, p.side) + hline(x, y + TITLE_H - 1, w, p.line);
  [0, 18, 36].forEach((dx) => { inner += `<circle cx="${x + 18 + dx}" cy="${y + 15}" r="5.5" fill="${p.line}"/>`; });
  inner += text(x + w / 2, y + 19.5, fit(title, w - 220, 12), { size: 12, fill: p.dim, anchor: "middle" });

  const mainY = y + TITLE_H;
  const mainH = h - TITLE_H - STATUS_H;
  inner += activityBar(p, x, mainY, mainH, active, extraActivity);

  let ex = x + ACT_W;
  const regions = {};
  if (side > 0) {
    inner += rect(ex, mainY, side, mainH, p.side) + vline(ex + side - 1, mainY, mainH, p.line);
    inner += text(ex + 20, mainY + 22, sideTitle, { size: 11, fill: p.dim, extra: 'letter-spacing="0.6"' });
    inner += text(ex + side - 22, mainY + 22, "···", { size: 13, fill: p.dim, anchor: "middle" });
    regions.side = { x: ex, y: mainY + TAB_H, w: side - 1, h: mainH - TAB_H };
    ex += side;
  }
  const ew = x + w - ex;
  const tabsH = tabs.length ? TAB_H : 0;
  if (tabs.length) inner += tabStrip(p, ex, mainY, ew, tabs);
  const editorH = mainH - tabsH - panel;
  regions.editor = { x: ex, y: mainY + tabsH, w: ew, h: editorH };

  if (panel > 0) {
    const py = mainY + mainH - panel;
    inner += hline(ex, py, ew, p.line);
    let tx = ex + 20;
    panelTabs.forEach((label, i) => {
      const on = i === panelTabs.length - 1 || label.startsWith("*");
      const clean = label.replace(/^\*/, "");
      inner += text(tx, py + 23, clean, { size: 11, fill: on ? p.fg : p.dim, extra: 'letter-spacing="0.5"' });
      const tw = textWidth(clean, 11) + clean.length * 0.5;
      if (on) inner += rect(tx, py + 31, tw, 1, p.accent);
      tx += tw + 22;
    });
    regions.panel = { x: ex, y: py + 36, w: ew, h: panel - 36 };
  }

  inner += statusBar(p, x, y + h - STATUS_H, w, status);
  svg += `<g clip-path="url(#ed-win)">${inner}`;
  // Callers append their content inside the clip and close it with windowEnd().
  return { svg, regions };
}

export const windowEnd = "</g>";

// Sidebar section header ("⌄ VARIABLES").
export function sectionHeader(p, x, y, w, label, { open = true, badge } = {}) {
  let out = hline(x, y, w, p.line);
  out += text(x + 8, y + 16, open ? "⌄" : "›", { size: 12, fill: p.fg });
  out += text(x + 22, y + 16, label, { size: 11, weight: 700, fill: p.fg, extra: 'letter-spacing="0.4"' });
  if (badge != null) {
    const bw = textWidth(String(badge), 11) + 12;
    out += rect(x + w - bw - 10, y + 5, bw, 15, p.accent, 'rx="7.5"');
    out += text(x + w - 10 - bw / 2, y + 16, String(badge), { size: 11, fill: "#ffffff", anchor: "middle" });
  }
  return out;
}

export function button(p, x, y, label, { ghost = false, size = 12, h = 22, w } = {}) {
  const bw = w ?? Math.round(textWidth(label, size) + 20);
  return {
    svg: rect(x, y, bw, h, ghost ? p.chip : p.accent, 'rx="2"') + text(x + bw / 2, y + h / 2 + size * 0.36, label, { size, fill: ghost ? p.fg : p.btnFg, anchor: "middle" }),
    w: bw
  };
}

export function pill(p, x, y, label, { bg, fg = "#ffffff", size = 11, h = 16, family = UI } = {}) {
  const w = (family === MONO ? monoWidth(label, size) : textWidth(label, size)) + 12;
  return {
    svg: rect(x, y, w, h, bg ?? p.chip, `rx="${h / 2}"`) + text(x + w / 2, y + h / 2 + size * 0.36, label, { size, fill: fg, anchor: "middle", family }),
    w
  };
}

export const ANIM_CSS = `
  .ed-in { opacity: 0; animation: ed-in 0.35s ease-out forwards; }
  @keyframes ed-in { to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .ed-in { animation: none !important; opacity: 1 !important; } }`;

export function fadeIn(svg, delay = 0) {
  return `<g class="ed-in" style="animation-delay:${delay.toFixed(2)}s">${svg}</g>`;
}

export function resolveScale(input) {
  const parsed = Number.parseFloat(String(input ?? "1"));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(0.05, parsed));
}

export function svgDocument({ width, height, scale, title, label, body, defs = "", css = "" }) {
  const s = resolveScale(scale);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${r(width * s)}" height="${r(height * s)}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">`,
    `<title>${esc(title)}</title>`,
    `<defs>${defs}<style>${ANIM_CSS}${css}</style></defs>`,
    body,
    "</svg>"
  ].join("\n");
}

// Short UTC dates so a card renders the same wherever the server runs.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function relativeTime(iso, now = Date.now()) {
  if (!iso) return "";
  const sec = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo`;
  return `${Math.floor(mo / 12)}y`;
}

export function compact(value) {
  const n = Number(value ?? 0);
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1e4) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return formatNumber(n);
}
