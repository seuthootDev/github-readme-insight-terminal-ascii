// Shared drawing kit for theme=editor: every card is a code-editor window (activity bar, tabs,
// status bar) in a dark or light colour scheme, picked with ?scheme=dark|light. ?ide=intellij swaps
// the window chrome, fonts and colours for an IntelliJ-style IDE; most card contents stay the same.
import { esc, fit as fitText, formatNumber, textWidth } from "../win98/kit.js";

export { esc, formatNumber, textWidth };

const VS_UI = "'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, Ubuntu, 'Helvetica Neue', Arial, sans-serif";
const VS_MONO = "Consolas, 'SF Mono', Menlo, 'DejaVu Sans Mono', 'Liberation Mono', 'Courier New', monospace";
const IJ_UI = "Inter, 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, Ubuntu, Arial, sans-serif";
const IJ_MONO = "'JetBrains Mono', Consolas, 'SF Mono', Menlo, 'DejaVu Sans Mono', 'Courier New', monospace";
// Live bindings: palette() switches them to the IDE being drawn. Rendering a card is synchronous,
// so one card's fonts never leak into another's.
export let UI = VS_UI;
export let MONO = VS_MONO;
export const MONO_W = 0.6; // advance width of one monospace glyph, in em

const DARK = {
  name: "dark", ide: "vscode",
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
  name: "light", ide: "vscode",
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

// IntelliJ (New UI) Dark and Light, with the same keys as the VS Code palettes plus `sep` for
// control borders.
const IJ_DARK = {
  name: "dark", ide: "intellij",
  bg: "#1e1f22", side: "#2b2d30", line: "#1e1f22", sep: "#393b40", fg: "#dfe1e5", dim: "#9da0a8", faint: "#6f737a",
  accent: "#3574f0", link: "#548af7", chip: "#393b40", btnFg: "#ffffff", hover: "#393b40", sel: "#2e436e",
  input: "#1e1f22", widget: "#2b2d30", shadow: "rgba(0,0,0,0.4)",
  err: "#db5c5c", warn: "#e5a84b", ok: "#57965c", star: "#e5a84b", debug: "#57965c",
  kw: "#cf8e6d", ctl: "#cf8e6d", str: "#6aab73", cmt: "#7a7e85", num: "#2aacb8", prop: "#c77dbb", fn: "#56a8f5", type: "#16baac",
  lanes: ["#548af7", "#c77dbb", "#57965c", "#e5a84b"],
  heat: ["#393b40", "#25406f", "#3574f0", "#8fb3fb"],
  addBg: "rgba(87,150,92,0.16)", delBg: "rgba(219,92,92,0.14)", pausedBg: "#2d4a77",
  states: { open: "#57965c", draft: "#868a91", merged: "#a571e6", closed: "#db5c5c" }
};

const IJ_LIGHT = {
  name: "light", ide: "intellij",
  bg: "#ffffff", side: "#f7f8fa", line: "#ebecf0", sep: "#dfe1e5", fg: "#1e1f22", dim: "#6c707e", faint: "#a8adbd",
  accent: "#3574f0", link: "#3574f0", chip: "#ebecf0", btnFg: "#ffffff", hover: "#dfe1e5", sel: "#d5e1ff",
  input: "#ffffff", widget: "#ffffff", shadow: "rgba(0,0,0,0.16)",
  err: "#e55765", warn: "#c27d04", ok: "#208a3c", star: "#e08855", debug: "#208a3c",
  kw: "#0033b3", ctl: "#0033b3", str: "#067d17", cmt: "#8c8c8c", num: "#1750eb", prop: "#871094", fn: "#00627a", type: "#008080",
  lanes: ["#3574f0", "#a24bb3", "#208a3c", "#c27d04"],
  heat: ["#ebecf0", "#c2d6fc", "#6d9af7", "#2152c9"],
  addBg: "rgba(32,138,60,0.12)", delBg: "rgba(229,87,101,0.12)", pausedBg: "#d5e1ff",
  states: { open: "#208a3c", draft: "#6c707e", merged: "#8250df", closed: "#e55765" }
};

export function resolveIde(input) {
  return String(input ?? "").trim().toLowerCase() === "intellij" ? "intellij" : "vscode";
}

export function resolveScheme(input) {
  return String(input ?? "").trim().toLowerCase() === "light" ? "light" : "dark";
}

export function palette(scheme, ide) {
  const light = resolveScheme(scheme) === "light";
  if (resolveIde(ide) === "intellij") {
    UI = IJ_UI;
    MONO = IJ_MONO;
    return light ? IJ_LIGHT : IJ_DARK;
  }
  UI = VS_UI;
  MONO = VS_MONO;
  return light ? LIGHT : DARK;
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
  git: ["⎇", "#f14c4c"], img: ["▨", "#a074c4"], ext: ["▣", "#4daafc"], gh: ["◉", "#9d9d9d"]
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
  if (p.ide === "intellij") return ideaTabs(p, x, y, w, tabs);
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
export function editorWindow(p, opts) {
  if (p.ide === "intellij") return ideaWindow(p, opts);
  const { x = 20, y = 20, w, h, title, active = "explorer", side = 0, sideTitle = "", tabs = [], panel = 0, panelTabs = [], status = {}, extraActivity = [] } = opts;
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

// ---- IntelliJ-style chrome: same geometry as the VS Code window (so every card lays out the
// same), drawn as the New UI: main toolbar with project and branch widgets, a tool window stripe,
// underlined editor tabs, titled tool windows and a breadcrumb status bar.
const IJ_ICONS = {
  project: '<path d="M2 4.5h4.2l1.4 1.4H14v7H2z"/>',
  commit: '<circle cx="8" cy="8" r="2.4"/><path d="M1.5 8h4.1M10.4 8h4.1"/>',
  pr: '<circle cx="4.5" cy="3.8" r="1.6"/><circle cx="4.5" cy="12.2" r="1.6"/><circle cx="11.5" cy="12.2" r="1.6"/><path d="M4.5 5.4v5.2M11.5 10.6V6.3a1.5 1.5 0 0 0-1.5-1.5H7.6M9 3.4L7.6 4.8 9 6.2"/>',
  structure: '<path d="M3 3h4v3H3zM9 10h4v3H9zM5 6v5.5h4"/>',
  plugins: '<path d="M3 6h3V4.5a1.5 1.5 0 0 1 3 0V6h3v3h-1.5a1.5 1.5 0 0 0 0 3H12v2H3z"/>',
  terminal: '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M4.5 6.5l2 1.5-2 1.5M8 10h3"/>',
  problems: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5v3.5M8 10.8v.2"/>',
  git: '<circle cx="5" cy="4" r="1.6"/><circle cx="5" cy="12" r="1.6"/><circle cx="11" cy="7" r="1.6"/><path d="M5 5.6v4.8M11 8.6c0 2-3 2-5 3"/>',
  debug: '<path d="M5.5 5.5h5v5a2.5 2.5 0 0 1-5 0z"/><path d="M6 5.5a2 2 0 0 1 4 0M8 8v4M2.5 7.5h3M10.5 7.5h3M3 12l2.5-1.2M13 12l-2.5-1.2"/>',
  run: '<path d="M4.5 3l8 5-8 5z"/>',
  search: '<circle cx="7" cy="7" r="4.3"/><path d="M10.2 10.2L14 14"/>',
  settings: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"/>',
  menu: '<path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/>',
  pause: '<path d="M5.5 3.5v9M10.5 3.5v9"/>',
  stop: '<rect x="4" y="4" width="8" height="8" rx="1"/>',
  stepOver: '<path d="M2.5 9a5.5 5.5 0 0 1 10.3-2.6M13 3.5v3h-3"/><circle cx="8" cy="12.5" r="1.4"/>',
  stepInto: '<path d="M8 2v7M5 6l3 3 3-3"/><circle cx="8" cy="12.8" r="1.4"/>',
  stepOut: '<path d="M8 9V2M5 5l3-3 3 3"/><circle cx="8" cy="12.8" r="1.4"/>'
};

export function ideaIcon(name, x, y, color, { size = 16, fill = "none" } = {}) {
  const s = size / 16;
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s)})" fill="${fill}" stroke="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">${IJ_ICONS[name] ?? ""}</g>`;
}

// VS Code activity names -> the IntelliJ tool window that plays the same part.
const IJ_ACTIVE = { explorer: "project", scm: "git", debug: "debug", pr: "pr", extensions: "plugins", git: "git", terminal: "terminal" };
const IJ_TOP = ["project", "commit", "pr", "structure"];
const IJ_BOTTOM = ["debug", "terminal", "problems", "git"];
const IJ_SIDE_TITLES = { "SOURCE CONTROL": "Commit", "RUN AND DEBUG": "Debug", GITHUB: "Pull Requests", PROFILE: "Project" };

function titleCase(label) {
  return String(label ?? "").toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function ideaTabs(p, x, y, w, tabs) {
  let out = rect(x, y, w, TAB_H, p.side) + hline(x, y + TAB_H - 1, w, p.line);
  let tx = x;
  for (const tab of tabs) {
    const label = fit(tab.label, tab.maxW ?? 260, 13);
    const tw = Math.round(textWidth(label, 13) + (tab.badge ? 40 : 24) + (tab.active ? 18 : 6));
    if (tab.active) {
      out += rect(tx, y, tw, TAB_H, p.bg);
      out += rect(tx + 2, y + TAB_H - 2, tw - 4, 2, p.accent, 'rx="1"');
    }
    let lx = tx + 12;
    if (tab.badge) {
      out += fileBadge(tab.badge, lx, y + 22, p);
      lx += 20;
    }
    out += text(lx, y + 22, label, { size: 13, fill: tab.active ? p.fg : p.dim, italic: Boolean(tab.preview) });
    if (tab.active) out += text(tx + tw - 16, y + 22, "×", { size: 13, fill: p.dim });
    tx += tw;
  }
  return out;
}

// Main toolbar: menu, project widget, branch widget; run configuration, run/debug, search, settings.
export function ideaToolbar(p, x, y, w, { run = "Current File", running = false } = {}) {
  let out = rect(x, y, w, TITLE_H, p.side) + hline(x, y + TITLE_H - 1, w, p.line);
  out += ideaIcon("menu", x + 12, y + 7, p.dim);
  out += rect(x + 40, y + 6, 18, 18, "#4a73d9", 'rx="4"');
  out += text(x + 49, y + 18.5, "GC", { size: 9, weight: 700, fill: "#ffffff", anchor: "middle" });
  out += text(x + 64, y + 19.5, "github-cli", { size: 13, weight: 600, fill: p.fg });
  const projW = textWidth("github-cli", 13, true);
  out += text(x + 64 + projW + 6, y + 19, "⌄", { size: 11, fill: p.dim });
  const bx = x + 64 + projW + 30;
  out += ideaIcon("git", bx, y + 7, p.dim, { size: 15 });
  out += text(bx + 20, y + 19.5, "main", { size: 13, fill: p.fg });
  out += text(bx + 20 + textWidth("main", 13) + 6, y + 19, "⌄", { size: 11, fill: p.dim });
  let rx = x + w - 30;
  out += ideaIcon("settings", rx, y + 7, p.dim);
  rx -= 28;
  out += ideaIcon("search", rx, y + 7, p.dim);
  if (running) {
    rx -= 28;
    out += ideaIcon("stop", rx, y + 7, p.err, { fill: p.err });
  }
  rx -= 28;
  out += ideaIcon("debug", rx, y + 7, p.ok);
  rx -= 26;
  out += ideaIcon("run", rx, y + 7, p.ok, { fill: p.ok });
  rx -= 10;
  out += text(rx, y + 19, "⌄", { size: 11, fill: p.dim, anchor: "end" });
  out += text(rx - 14, y + 19.5, fit(run, 140, 13), { size: 13, fill: p.fg, anchor: "end" });
  return out;
}

export function ideaStripe(p, x, y, h, active) {
  let out = rect(x, y, ACT_W, h, p.side) + vline(x + ACT_W - 1, y, h, p.line);
  const on = IJ_ACTIVE[active] ?? active;
  const stripeIcon = (name, iy) => (name === on ? rect(x + 7, iy - 7, 30, 30, p.sel, 'rx="6"') : "") + ideaIcon(name, x + 14, iy, name === on ? p.fg : p.dim);
  IJ_TOP.forEach((name, i) => { out += stripeIcon(name, y + 14 + i * 36); });
  const bottomTop = y + h - IJ_BOTTOM.length * 36;
  if (bottomTop > y + 14 + IJ_TOP.length * 36) {
    IJ_BOTTOM.forEach((name, i) => { out += stripeIcon(name, bottomTop + 4 + i * 36); });
  }
  return out;
}

// Bottom tool window header: "Name:" then its tabs, the active one underlined.
export function ideaToolHeader(p, x, y, w, name, tabs = [], activeIdx = 0) {
  let out = rect(x, y, w, 36, p.side) + hline(x, y, w, p.line);
  out += text(x + 14, y + 22, `${name}:`, { size: 13, weight: 600, fill: p.fg });
  let tx = x + 14 + textWidth(`${name}:`, 13, true) + 12;
  tabs.forEach((label, i) => {
    out += text(tx, y + 22, label, { size: 13, fill: i === activeIdx ? p.fg : p.dim });
    if (i === activeIdx) out += rect(tx, y + 33, textWidth(label, 13), 2, p.accent, 'rx="1"');
    tx += textWidth(label, 13) + 18;
  });
  return out;
}

export function ideaStatus(p, x, y, w, crumbs, right = []) {
  let out = rect(x, y, w, STATUS_H, p.side) + hline(x, y, w, p.line);
  let cx = x + 12;
  crumbs.forEach((c, i) => {
    const last = i === crumbs.length - 1;
    const label = fit(c, 220, 12);
    out += text(cx, y + 15.5, label, { size: 12, fill: last ? p.fg : p.dim });
    cx += textWidth(label, 12) + 6;
    if (!last) { out += text(cx, y + 15.5, "›", { size: 12, fill: p.dim }); cx += 12; }
  });
  let rx = x + w - 10;
  for (const raw of [...right].reverse()) {
    // IntelliJ writes the caret position as "line:column".
    const item = { ...raw, text: String(raw.text).replace(/^Ln (\d+), Col (\d+)$/, "$1:$2") };
    const tw = textWidth(item.text, 12) + 16;
    out += text(rx - 8, y + 15.5, item.text, { size: 12, fill: item.color && item.color !== "#ffffff" ? item.color : p.dim, anchor: "end" });
    rx -= tw;
  }
  return out;
}

// Same arguments and regions as editorWindow, so a card renders in either IDE unchanged.
function ideaWindow(p, { x = 20, y = 20, w, h, active = "explorer", side = 0, sideTitle = "", tabs = [], panel = 0, panelTabs = [], status = {}, run = "Current File" }) {
  let svg = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="10" fill="${p.side}" stroke="${p.sep}"/>`;
  svg += `<clipPath id="ed-win"><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="9.5"/></clipPath>`;
  let inner = ideaToolbar(p, x, y, w, { run });
  const mainY = y + TITLE_H;
  const mainH = h - TITLE_H - STATUS_H;
  inner += ideaStripe(p, x, mainY, mainH, active);

  let ex = x + ACT_W;
  const regions = {};
  if (side > 0) {
    inner += rect(ex, mainY, side, mainH, p.side) + vline(ex + side - 1, mainY, mainH, p.line);
    inner += text(ex + 14, mainY + 22, IJ_SIDE_TITLES[sideTitle] ?? titleCase(sideTitle), { size: 13, weight: 600, fill: p.fg });
    inner += text(ex + side - 18, mainY + 22, "⋮", { size: 14, fill: p.dim, anchor: "middle" });
    regions.side = { x: ex, y: mainY + TAB_H, w: side - 1, h: mainH - TAB_H };
    ex += side;
  }
  const ew = x + w - ex;
  const tabsH = tabs.length ? TAB_H : 0;
  inner += rect(ex, mainY, ew, mainH, p.bg);
  if (tabs.length) inner += ideaTabs(p, ex, mainY, ew, tabs);
  regions.editor = { x: ex, y: mainY + tabsH, w: ew, h: mainH - tabsH - panel };

  if (panel > 0) {
    const py = mainY + mainH - panel;
    const starred = panelTabs.findIndex((l) => l.startsWith("*"));
    const activeLabel = (panelTabs[starred >= 0 ? starred : panelTabs.length - 1] ?? "").replace(/^\*/, "");
    const name = titleCase(activeLabel);
    const sub = name === "Terminal" ? "Local" : name === "Contributions" ? "Heatmap" : name === "Debug Console" ? "Console" : "Output";
    inner += rect(ex, py, ew, panel, p.side);
    inner += ideaToolHeader(p, ex, py, ew, name, [sub], 0);
    regions.panel = { x: ex, y: py + 36, w: ew, h: panel - 36 };
  }

  const file = tabs.find((t) => t.active)?.label ?? IJ_SIDE_TITLES[sideTitle] ?? titleCase(sideTitle);
  inner += ideaStatus(p, x, y + h - STATUS_H, w, ["github-cli", file].filter(Boolean), status.right ?? []);
  svg += `<g clip-path="url(#ed-win)">${inner}`;
  return { svg, regions };
}

// IntelliJ outer frame for cards that lay out their own tool windows (git log, debugger, error).
export function ideaFrame(p, { x = 20, y = 20, w, h, active = "project", run = "Current File", running = false, crumbs = ["github-cli"], statusRight = [] }) {
  let svg = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="10" fill="${p.side}" stroke="${p.sep}"/>`;
  svg += `<clipPath id="ed-win"><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="9.5"/></clipPath>`;
  let inner = ideaToolbar(p, x, y, w, { run, running });
  const mainY = y + TITLE_H;
  const mainH = h - TITLE_H - STATUS_H;
  inner += ideaStripe(p, x, mainY, mainH, active);
  inner += ideaStatus(p, x, y + h - STATUS_H, w, crumbs, statusRight);
  svg += `<g clip-path="url(#ed-win)">${inner}`;
  return { svg, content: { x: x + ACT_W, y: mainY, w: w - ACT_W, h: mainH } };
}

export { ideaTabs };


// Sidebar section header ("⌄ VARIABLES").
export function sectionHeader(p, x, y, w, label, { open = true, badge } = {}) {
  const ij = p.ide === "intellij";
  let out = hline(x, y, w, p.line);
  out += text(x + 8, y + 16, open ? "⌄" : "›", { size: 12, fill: p.fg });
  out += ij
    ? text(x + 22, y + 16, titleCase(label), { size: 13, weight: 600, fill: p.fg })
    : text(x + 22, y + 16, label, { size: 11, weight: 700, fill: p.fg, extra: 'letter-spacing="0.4"' });
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
