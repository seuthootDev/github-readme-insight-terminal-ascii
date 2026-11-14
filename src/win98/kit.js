// Shared Windows 98 drawing kit: palette, bevels, window chrome and common controls.
// Every win98 card builds on these so the set reads as one theme.

export const C = {
  face: "#c0c0c0",
  light: "#dfdfdf",
  white: "#ffffff",
  shadow: "#808080",
  dark: "#000000",
  navy: "#000080",
  titleTo: "#1084d0",
  inactive: "#808080",
  inactiveTo: "#b5b5b5",
  desktop: "#008080",
  select: "#000080",
  selectText: "#ffffff",
  tooltip: "#ffffe1",
  text: "#000000",
  disabled: "#808080"
};

export const FONT = "Tahoma, 'MS Sans Serif', 'Segoe UI', Geneva, Verdana, sans-serif";
export const MONO = "'Courier New', Courier, monospace";

export function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Per-glyph Tahoma width estimate: narrow letters, capitals and W/M differ a lot, and a flat
// average either lets wide text spill out of its control or cuts short text too early.
const NARROW = new Set("iljI.,:;'!|`".split(""));
const SLIM = new Set("frt()[]{}- /\\\"".split(""));
const WIDE = new Set("mwMW@%".split(""));

function charWidth(ch) {
  if (NARROW.has(ch)) return 0.26;
  if (SLIM.has(ch)) return 0.36;
  if (WIDE.has(ch)) return 0.95;
  if (ch >= "A" && ch <= "Z") return 0.7;
  if (ch.charCodeAt(0) > 0x2e7f) return 1.0; // CJK and other full-width glyphs
  return 0.56;
}

export function textWidth(value, size = 12, bold = false) {
  let total = 0;
  for (const ch of String(value ?? "")) total += charWidth(ch);
  return total * size * (bold ? 1.08 : 1);
}

export function fit(value, maxWidth, size = 12, bold = false) {
  const chars = [...String(value ?? "")];
  if (textWidth(chars.join(""), size, bold) <= maxWidth) return chars.join("");
  const ellipsis = size;
  let out = "";
  let used = 0;
  for (const ch of chars) {
    const cw = charWidth(ch) * size * (bold ? 1.08 : 1);
    if (used + cw + ellipsis > maxWidth) break;
    out += ch;
    used += cw;
  }
  return `${out.trimEnd() || chars[0] || ""}…`;
}

export function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

export function text(x, y, value, { size = 12, weight, fill = C.text, anchor, family = FONT, cls, extra = "" } = {}) {
  return `<text x="${x}" y="${y}" font-size="${size}" font-family="${family}" fill="${fill}"${weight ? ` font-weight="${weight}"` : ""}${anchor ? ` text-anchor="${anchor}"` : ""}${cls ? ` class="${cls}"` : ""}${extra ? ` ${extra}` : ""}>${esc(value)}</text>`;
}

// Raised bevel (buttons, window frame, panels).
export function raised(x, y, w, h, { fill = C.face, thick = true } = {}) {
  const r = x + w, b = y + h;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
    + `<path d="M${x + 0.5} ${b - 0.5}V${y + 0.5}H${r - 0.5}" stroke="${thick ? C.light : C.white}" fill="none"/>`
    + `<path d="M${x + 0.5} ${b - 0.5}H${r - 0.5}V${y + 0.5}" stroke="${C.dark}" fill="none"/>`
    + (thick
      ? `<path d="M${x + 1.5} ${b - 1.5}V${y + 1.5}H${r - 1.5}" stroke="${C.white}" fill="none"/><path d="M${x + 1.5} ${b - 1.5}H${r - 1.5}V${y + 1.5}" stroke="${C.shadow}" fill="none"/>`
      : `<path d="M${x + 1.5} ${b - 1.5}H${r - 1.5}V${y + 1.5}" stroke="${C.shadow}" fill="none"/>`);
}

// Sunken bevel (text fields, list views, canvases).
export function sunken(x, y, w, h, { fill = C.white } = {}) {
  const r = x + w, b = y + h;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
    + `<path d="M${x + 0.5} ${b - 0.5}V${y + 0.5}H${r - 0.5}" stroke="${C.shadow}" fill="none"/>`
    + `<path d="M${x + 0.5} ${b - 0.5}H${r - 0.5}V${y + 0.5}" stroke="${C.white}" fill="none"/>`
    + `<path d="M${x + 1.5} ${b - 1.5}V${y + 1.5}H${r - 1.5}" stroke="${C.dark}" fill="none"/>`
    + `<path d="M${x + 1.5} ${b - 1.5}H${r - 1.5}V${y + 1.5}" stroke="${C.light}" fill="none"/>`;
}

// Single-pixel etched line (separators, group boxes).
export function etchedH(x, y, w) {
  return `<path d="M${x} ${y + 0.5}H${x + w}" stroke="${C.shadow}"/><path d="M${x} ${y + 1.5}H${x + w}" stroke="${C.white}"/>`;
}

export function etchedV(x, y, h) {
  return `<path d="M${x + 0.5} ${y}V${y + h}" stroke="${C.shadow}"/><path d="M${x + 1.5} ${y}V${y + h}" stroke="${C.white}"/>`;
}

export function button(x, y, w, h, label, { isDefault = false, disabled = false, size = 12, pressed = false } = {}) {
  let out = "";
  if (isDefault) {
    out += `<rect x="${x - 0.5}" y="${y - 0.5}" width="${w + 1}" height="${h + 1}" fill="none" stroke="${C.dark}"/>`;
  }
  out += pressed ? sunken(x, y, w, h, { fill: C.face }) : raised(x, y, w, h);
  const ty = y + h / 2 + size * 0.36;
  if (disabled) {
    out += text(x + w / 2 + 1, ty + 1, label, { size, anchor: "middle", fill: C.white });
    out += text(x + w / 2, ty, label, { size, anchor: "middle", fill: C.disabled });
  } else {
    out += text(x + w / 2, ty, label, { size, anchor: "middle" });
  }
  if (isDefault) {
    out += `<rect x="${x + 4.5}" y="${y + 4.5}" width="${w - 9}" height="${h - 9}" fill="none" stroke="${C.dark}" stroke-dasharray="1 1"/>`;
  }
  return out;
}

const GLYPHS = {
  min: (x, y) => `<rect x="${x + 4}" y="${y + 9}" width="6" height="2" fill="${C.dark}"/>`,
  max: (x, y) => `<rect x="${x + 3.5}" y="${y + 2.5}" width="8" height="7" fill="none" stroke="${C.dark}"/><rect x="${x + 3}" y="${y + 2}" width="9" height="2" fill="${C.dark}"/>`,
  close: (x, y) => `<path d="M${x + 4} ${y + 3}l6 6M${x + 10} ${y + 3}l-6 6" stroke="${C.dark}" stroke-width="1.6"/>`,
  help: (x, y) => text(x + 8, y + 10.5, "?", { size: 11, weight: 700, anchor: "middle" })
};

// Title bar with gradient, icon, caption and caption buttons. Returns svg.
export function titleBar(x, y, w, title, { icon, controls = ["min", "max", "close"], active = true, gradId = "w98title", h = 18 } = {}) {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${active ? `url(#${gradId})` : `url(#${gradId}-off)`}"/>`;
  let tx = x + 4;
  if (icon) {
    out += icon(x + 2, y + (h - 16) / 2);
    tx = x + 21;
  }
  const btnW = 16, btnH = 14;
  const btnSpace = controls.length * (btnW + 2) + (controls.includes("max") && controls.includes("close") ? 2 : 0);
  out += text(tx, y + h / 2 + 4.5, fit(title, w - (tx - x) - btnSpace - 6, 12, true), { size: 12, weight: 700, fill: C.white });
  let bx = x + w - 2 - btnW;
  for (let i = controls.length - 1; i >= 0; i -= 1) {
    const by = y + (h - btnH) / 2;
    out += raised(bx, by, btnW, btnH, { thick: true });
    out += GLYPHS[controls[i]](bx + 1, by);
    bx -= btnW + (controls[i] === "close" ? 2 : 0);
  }
  return out;
}

export function gradientDefs(gradId = "w98title") {
  return `<linearGradient id="${gradId}" x1="0" x2="1"><stop offset="0" stop-color="${C.navy}"/><stop offset="1" stop-color="${C.titleTo}"/></linearGradient>`
    + `<linearGradient id="${gradId}-off" x1="0" x2="1"><stop offset="0" stop-color="${C.inactive}"/><stop offset="1" stop-color="${C.inactiveTo}"/></linearGradient>`;
}

// A full window (frame + title bar). Returns { svg, client: {x, y, w, h} } where client is the area
// under the title bar inside the frame.
export function windowFrame(x, y, w, h, title, opts = {}) {
  const titleH = opts.titleH ?? 18;
  let svg = raised(x, y, w, h);
  svg += titleBar(x + 3, y + 3, w - 6, title, { ...opts, h: titleH });
  return { svg, client: { x: x + 4, y: y + 3 + titleH + 2, w: w - 8, h: h - titleH - 9 } };
}

// Menu bar: underline the first letter like the real thing.
export function menuBar(x, y, items, { size = 12 } = {}) {
  let out = "";
  let cx = x + 6;
  for (const item of items) {
    out += text(cx, y + 13, item, { size });
    const first = textWidth(item[0], size);
    out += `<path d="M${cx} ${y + 15.5}H${cx + first}" stroke="${C.text}"/>`;
    cx += textWidth(item, size) + 14;
  }
  return out;
}

// Tab strip. Returns { svg, bodyY } where bodyY is the top of the tab page border.
export function tabs(x, y, labels, active = 0, { size = 12 } = {}) {
  let out = "";
  let tx = x;
  const h = 20;
  const pieces = [];
  for (let i = 0; i < labels.length; i += 1) {
    const w = Math.round(textWidth(labels[i], size) + 18);
    pieces.push({ x: tx, w, label: labels[i], on: i === active });
    tx += w;
  }
  // Draw inactive tabs first, active tab last so it overlaps its neighbours.
  for (const p of [...pieces.filter((t) => !t.on), ...pieces.filter((t) => t.on)]) {
    const top = p.on ? y : y + 2;
    const left = p.on ? p.x - 2 : p.x;
    const right = p.on ? p.x + p.w + 2 : p.x + p.w;
    const bottom = y + h + (p.on ? 1 : 0);
    out += `<path d="M${left} ${bottom}V${top + 2}L${left + 2} ${top}H${right - 2}L${right} ${top + 2}V${bottom}Z" fill="${C.face}"/>`;
    out += `<path d="M${left + 0.5} ${bottom}V${top + 2.5}L${left + 2.5} ${top + 0.5}H${right - 2.5}" stroke="${C.white}" fill="none"/>`;
    out += `<path d="M${right - 1.5} ${top + 1.5}L${right - 0.5} ${top + 2.5}V${bottom}" stroke="${C.dark}" fill="none"/>`;
    out += `<path d="M${right - 1.5} ${top + 2.5}V${bottom}" stroke="${C.shadow}" fill="none"/>`;
    out += text(p.x + p.w / 2, top + 14, p.label, { size, anchor: "middle" });
  }
  return { svg: out, bodyY: y + h, activeX: pieces[active]?.x ?? x, activeW: pieces[active]?.w ?? 0 };
}

// Raised page under a tab strip, with the gap under the active tab.
export function tabPage(x, y, w, h, activeX, activeW) {
  const r = x + w, b = y + h;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.face}"/>`
    + `<path d="M${x + 0.5} ${b}V${y + 0.5}H${activeX - 2}M${activeX + activeW + 2} ${y + 0.5}H${r - 1}" stroke="${C.white}" fill="none"/>`
    + `<path d="M${x} ${b - 0.5}H${r - 0.5}V${y + 1}" stroke="${C.dark}" fill="none"/>`
    + `<path d="M${x + 1} ${b - 1.5}H${r - 1.5}V${y + 2}" stroke="${C.shadow}" fill="none"/>`;
}

export function groupBox(x, y, w, h, label, { size = 12, bg = C.face } = {}) {
  const r = x + w, b = y + h;
  let out = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="none" stroke="${C.shadow}"/>`;
  out += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${w - 1}" height="${h - 1}" fill="none" stroke="${C.white}"/>`;
  if (label) {
    const lw = textWidth(label, size) + 6;
    out += `<rect x="${x + 7}" y="${y - 6}" width="${lw}" height="${12}" fill="${bg}"/>`;
    out += text(x + 10, y + 4, label, { size });
  }
  void r; void b;
  return out;
}

// Classic block progress bar. ratio 0..1. animate=true makes blocks appear one by one.
export function progressBlocks(x, y, w, h, ratio, { animate = true, delay = 0, step = 0.04, color = C.navy } = {}) {
  let out = sunken(x, y, w, h);
  const blockW = Math.max(6, Math.round((h - 6) * 0.75));
  const gap = 2;
  const inner = w - 6;
  const max = Math.floor((inner + gap) / (blockW + gap));
  const count = Math.max(0, Math.min(max, Math.round(max * Math.max(0, Math.min(1, ratio)))));
  for (let i = 0; i < count; i += 1) {
    const style = animate ? ` class="w98-in" style="animation-delay:${(delay + i * step).toFixed(2)}s"` : "";
    out += `<rect${style} x="${x + 3 + i * (blockW + gap)}" y="${y + 3}" width="${blockW}" height="${h - 6}" fill="${color}"/>`;
  }
  return out;
}

export function statusBar(x, y, w, parts, { h = 20, size = 11 } = {}) {
  // parts: [{ text, w }] — last part takes the rest.
  let out = "";
  let cx = x;
  parts.forEach((part, i) => {
    const pw = i === parts.length - 1 ? x + w - cx : part.w;
    out += sunken(cx, y, pw, h, { fill: C.face });
    out += text(cx + 5, y + h / 2 + 4, fit(part.text, pw - 10, size), { size });
    cx += pw + 2;
  });
  return out;
}

// List view column header row.
export function columnHeaders(x, y, columns, { h = 18, size = 11 } = {}) {
  // columns: [{ label, w, align }]
  let out = "";
  let cx = x;
  for (const col of columns) {
    out += raised(cx, y, col.w, h, { thick: false });
    const tx = col.align === "end" ? cx + col.w - 6 : cx + 6;
    out += text(tx, y + h / 2 + 4, fit(col.label, col.w - 12, size), { size, anchor: col.align === "end" ? "end" : undefined });
    cx += col.w;
  }
  return out;
}

// ---- 16x16 / 32x32 pixel icons (original drawings, no trademarked artwork) ----
function pix(map, x, y, pal, px = 1) {
  let out = "";
  map.forEach((row, r) => {
    let c = 0;
    while (c < row.length) {
      const ch = row[c];
      let run = 1;
      while (c + run < row.length && row[c + run] === ch) run += 1;
      if (pal[ch]) out += `<rect x="${x + c * px}" y="${y + r * px}" width="${run * px}" height="${px}" fill="${pal[ch]}"/>`;
      c += run;
    }
  });
  return out;
}

const COMPUTER = [
  "................",
  ".KKKKKKKKKKKKK..",
  ".KWWWWWWWWWWWGK.",
  ".KWBBBBBBBBBWGK.",
  ".KWBTTTTTTTBWGK.",
  ".KWBTTTTTTTBWGK.",
  ".KWBTTTTTTTBWGK.",
  ".KWBTTTTTTTBWGK.",
  ".KWBBBBBBBBBWGK.",
  ".KWWWWWWWWWWWGK.",
  ".KGGGGGGGGGGGGK.",
  "..KKKKKKKKKKKK..",
  "....KWWWWWWK....",
  "..KKWWWWWWWWKK..",
  "..KGGGGGGGGGGK..",
  "..KKKKKKKKKKKK.."
];
const FOLDER = [
  "................",
  "................",
  "..KKKKK.........",
  ".KYYYYYK........",
  ".KYWWWWYKKKKKKK.",
  ".KYWYYYYYYYYYYK.",
  ".KYYYYYYYYYYYYK.",
  ".KYYYYYYYYYYYYK.",
  ".KYYYYYYYYYYYYK.",
  ".KYYYYYYYYYYYYK.",
  ".KYYYYYYYYYYYYK.",
  ".KYYYYYYYYYYYYK.",
  ".KDDDDDDDDDDDDK.",
  ".KKKKKKKKKKKKKK.",
  "................",
  "................"
];
const DOCUMENT = [
  "..KKKKKKKKK.....",
  "..KWWWWWWWKK....",
  "..KWWWWWWWKWK...",
  "..KWGGGGWWKKKK..",
  "..KWWWWWWWWWWK..",
  "..KWGGGGGGGWWK..",
  "..KWWWWWWWWWWK..",
  "..KWGGGGGGGWWK..",
  "..KWWWWWWWWWWK..",
  "..KWGGGGGGGWWK..",
  "..KWWWWWWWWWWK..",
  "..KWGGGGGWWWWK..",
  "..KWWWWWWWWWWK..",
  "..KWWWWWWWWWWK..",
  "..KKKKKKKKKKKK..",
  "................"
];
const ENVELOPE = [
  "................",
  "................",
  "................",
  ".KKKKKKKKKKKKKK.",
  ".KWKWWWWWWWWKWK.",
  ".KWWKWWWWWWKWWK.",
  ".KWWWKWWWWKWWWK.",
  ".KWWWWKWWKWWWWK.",
  ".KWWWKWKKWKWWWK.",
  ".KWWKWWWWWWKWWK.",
  ".KWKWWWWWWWWKWK.",
  ".KKWWWWWWWWWWKK.",
  ".KKKKKKKKKKKKKK.",
  "................",
  "................",
  "................"
];
const ERROR = [
  ".....KKKKKK.....",
  "...KKRRRRRRKK...",
  "..KRRRRRRRRRRK..",
  ".KRRRRRRRRRRRRK.",
  ".KRRWWRRRRWWRRK.",
  "KRRRWWWRRWWWRRRK",
  "KRRRRWWWWWWRRRRK",
  "KRRRRRWWWWRRRRRK",
  "KRRRRRWWWWRRRRRK",
  "KRRRRWWWWWWRRRRK",
  "KRRRWWWRRWWWRRRK",
  ".KRRWWRRRRWWRRK.",
  ".KRRRRRRRRRRRRK.",
  "..KRRRRRRRRRRK..",
  "...KKRRRRRRKK...",
  ".....KKKKKK....."
];
const DRIVE = [
  "................",
  "................",
  "................",
  "................",
  "..KKKKKKKKKKKK..",
  ".KWWWWWWWWWWWWK.",
  ".KWLLLLLLLLLLGK.",
  ".KWLLLLLLLLLLGK.",
  ".KWLLLLLLLLNNGK.",
  ".KWLLLLLLLLLLGK.",
  ".KGGGGGGGGGGGGK.",
  "..KKKKKKKKKKKK..",
  "................",
  "................",
  "................",
  "................"
];
const CLOCK = [
  ".....KKKKKK.....",
  "...KKWWWWWWKK...",
  "..KWWWWKWWWWWK..",
  ".KWWWWWKWWWWWWK.",
  ".KWWWWWKWWWWWWK.",
  "KWWWWWWKWWWWWWWK",
  "KWWWWWWKWWWWWWWK",
  "KWKWWWWKKKKKWKWK",
  "KWWWWWWWWWWWWWWK",
  "KWWWWWWWWWWWWWWK",
  ".KWWWWWWWWWWWWK.",
  ".KWWWWWWWWWWWWK.",
  "..KWWWWWWWWWWK..",
  "...KKWWKWWWKK...",
  ".....KKKKKK.....",
  "................"
];
const PALETTE = { K: C.dark, W: C.white, G: C.shadow, L: C.face, B: C.dark, T: C.desktop, Y: "#ffff00", D: "#808000", R: "#ff0000", N: "#00ff00" };

export const ICONS = {
  computer: (x, y, px = 1) => pix(COMPUTER, x, y, PALETTE, px),
  folder: (x, y, px = 1) => pix(FOLDER, x, y, PALETTE, px),
  document: (x, y, px = 1) => pix(DOCUMENT, x, y, PALETTE, px),
  envelope: (x, y, px = 1) => pix(ENVELOPE, x, y, PALETTE, px),
  error: (x, y, px = 1) => pix(ERROR, x, y, PALETTE, px),
  drive: (x, y, px = 1) => pix(DRIVE, x, y, PALETTE, px),
  clock: (x, y, px = 1) => pix(CLOCK, x, y, PALETTE, px)
};

export const ANIM_CSS = `
  .w98-in { opacity: 0; animation: w98-in 0.01s linear forwards; }
  .w98-fade { opacity: 0; animation: w98-in 0.3s linear forwards; }
  @keyframes w98-in { to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .w98-in, .w98-fade { animation: none !important; opacity: 1 !important; }
  }`;

export function resolveScale(input) {
  const parsed = Number.parseFloat(String(input ?? "1"));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(0.05, parsed));
}

// Wraps a card body into the final SVG document (same outer contract as the terminal cards).
export function svgDocument({ width, height, scale, title, label, body, defs = "", css = "" }) {
  const s = resolveScale(scale);
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * s * 100) / 100}" height="${Math.round(height * s * 100) / 100}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(label)}">`,
    `<title>${esc(title)}</title>`,
    `<defs>${gradientDefs()}${defs}<style>${ANIM_CSS}${css}</style></defs>`,
    body,
    "</svg>"
  ].join("\n");
}
