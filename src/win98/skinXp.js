// Windows XP (Luna) skin for the win98 card renderers: same windows and layouts, XP chrome.
// Blue rounded title bars, red close button, beige dialogs, rounded buttons, orange tab
// highlight, blue group-box captions and green segmented progress bars.
import { C, fit, text, textWidth } from "./kit.js";

const XP = {
  border: "#0831d9",
  btnEdge: "#003c74",
  boxEdge: "#7f9db9",
  tabEdge: "#919b9c",
  group: "#d0d0bf",
  groupText: "#0046d5",
  page: "#fcfcfe"
};
const TITLE_FONT = "'Trebuchet MS', Tahoma, sans-serif";

function gradientDefs(gradId = "w98title") {
  return `<linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0997ff"/><stop offset=".08" stop-color="#0053ee"/><stop offset=".4" stop-color="#0050ee"/><stop offset=".88" stop-color="#0066ff"/><stop offset=".93" stop-color="#005bff"/><stop offset="1" stop-color="#003dd7"/></linearGradient>`
    + `<linearGradient id="${gradId}-off" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a96df"/><stop offset="1" stop-color="#9db9eb"/></linearGradient>`
    + `<linearGradient id="xpbtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".85" stop-color="#ecebe6"/><stop offset="1" stop-color="#d6d0c5"/></linearGradient>`
    + `<linearGradient id="xpcap" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b9bf5"/><stop offset="1" stop-color="#2a5fdb"/></linearGradient>`
    + `<linearGradient id="xpclose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e5937f"/><stop offset=".5" stop-color="#d8562f"/><stop offset="1" stop-color="#c0442a"/></linearGradient>`
    + `<linearGradient id="xptab" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ecebe5"/></linearGradient>`
    + `<linearGradient id="xphdr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ebeadb"/></linearGradient>`
    + `<linearGradient id="xpseg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8e8a0"/><stop offset=".45" stop-color="#2ed12e"/><stop offset="1" stop-color="#18a818"/></linearGradient>`;
}

// XP panels are flat: a face fill with a soft 1px edge.
function raised(x, y, w, h, { fill = C.face } = {}) {
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="${fill}" stroke="#d6d2c2"/>`;
}

function sunken(x, y, w, h, { fill = C.white } = {}) {
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="${fill}" stroke="${fill === C.face ? "#d6d2c2" : XP.boxEdge}"/>`;
}

function button(x, y, w, h, label, { isDefault = false, disabled = false, size = 12, pressed = false } = {}) {
  let out = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="3" fill="${pressed ? "#e3e2da" : "url(#xpbtn)"}" stroke="${disabled ? "#c9c7ba" : XP.btnEdge}"/>`;
  if (isDefault && !disabled) out += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" rx="2" fill="none" stroke="#98b4f0" stroke-width="1.5"/>`;
  out += text(x + w / 2, y + h / 2 + size * 0.36, label, { size, anchor: "middle", fill: disabled ? "#aca899" : C.text });
  return out;
}

function capButton(x, y, s, kind) {
  const fill = kind === "close" ? "url(#xpclose)" : "url(#xpcap)";
  let g = "";
  if (kind === "close") g = `<path d="M${x + s * 0.3} ${y + s * 0.3}L${x + s * 0.7} ${y + s * 0.7}M${x + s * 0.7} ${y + s * 0.3}L${x + s * 0.3} ${y + s * 0.7}" stroke="#fff" stroke-width="2"/>`;
  if (kind === "min") g = `<rect x="${x + s * 0.28}" y="${y + s * 0.62}" width="${s * 0.36}" height="2.5" fill="#fff"/>`;
  if (kind === "max") g = `<rect x="${x + s * 0.28}" y="${y + s * 0.28}" width="${s * 0.44}" height="${s * 0.42}" fill="none" stroke="#fff" stroke-width="1.5"/><rect x="${x + s * 0.28}" y="${y + s * 0.28}" width="${s * 0.44}" height="2.5" fill="#fff"/>`;
  if (kind === "help") g = text(x + s / 2, y + s * 0.74, "?", { size: 12, weight: 700, anchor: "middle", fill: "#fff" });
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${s - 1}" height="${s - 1}" rx="3" fill="${fill}" stroke="#fff"/>${g}`;
}

function titleBar(x, y, w, title, { icon, controls = ["min", "max", "close"], active = true, gradId = "w98title", h = 18 } = {}) {
  // Drawn over the frame's top edge so the bar reads as XP's taller, rounded title.
  const top = y - 3, bh = h + 5;
  let out = `<path d="M${x - 3} ${top + bh}V${top + 7}q0 -7 7 -7H${x + w - 4}q7 0 7 7V${top + bh}Z" fill="url(#${active ? gradId : `${gradId}-off`})"/>`;
  let tx = x + 4;
  if (icon) { out += icon(x + 2, top + (bh - 16) / 2); tx = x + 22; }
  const s = 17;
  const space = controls.length * (s + 2) + 6;
  const label = fit(title, w - (tx - x) - space, 13, true);
  out += text(tx + 1, top + bh / 2 + 5.5, label, { size: 13, weight: 700, fill: "#0a1883", family: TITLE_FONT });
  out += text(tx, top + bh / 2 + 4.5, label, { size: 13, weight: 700, fill: "#fff", family: TITLE_FONT });
  let bx = x + w - s - 1;
  for (let i = controls.length - 1; i >= 0; i -= 1) {
    out += capButton(bx, top + (bh - s) / 2, s, controls[i]);
    bx -= s + 2;
  }
  return out;
}

function windowFrame(x, y, w, h, title, opts = {}) {
  const titleH = opts.titleH ?? 18;
  let svg = `<path d="M${x} ${y + h}V${y + 8}q0 -8 8 -8H${x + w - 8}q8 0 8 8V${y + h}Z" fill="${opts.active === false ? "#7a96df" : XP.border}"/>`;
  svg += `<rect x="${x + 4}" y="${y + 3 + titleH + 2}" width="${w - 8}" height="${h - titleH - 9}" fill="${C.face}"/>`;
  svg += titleBar(x + 3, y + 3, w - 6, title, { ...opts, h: titleH });
  return { svg, client: { x: x + 4, y: y + 3 + titleH + 2, w: w - 8, h: h - titleH - 9 } };
}

function tabs(x, y, labels, active = 0, { size = 12 } = {}) {
  let out = "";
  let tx = x;
  const h = 20;
  const pieces = labels.map((label, i) => {
    const w = Math.round(textWidth(label, size) + 18);
    const p = { x: tx, w, label, on: i === active };
    tx += w;
    return p;
  });
  for (const p of [...pieces.filter((t) => !t.on), ...pieces.filter((t) => t.on)]) {
    const top = p.on ? y : y + 2;
    const bottom = y + h + (p.on ? 1 : 0);
    out += `<path d="M${p.x + 0.5} ${bottom}V${top + 2.5}q0 -2 2 -2H${p.x + p.w - 2.5}q2 0 2 2V${bottom}" fill="${p.on ? XP.page : "url(#xptab)"}" stroke="${XP.tabEdge}"/>`;
    if (p.on) out += `<path d="M${p.x + 1.5} ${top + 1.5}H${p.x + p.w - 1.5}" stroke="#ffc83c" stroke-width="2"/><path d="M${p.x + 1} ${top + 3}H${p.x + p.w - 1}" stroke="#e68b2c"/>`;
    out += text(p.x + p.w / 2, top + 14, p.label, { size, anchor: "middle" });
  }
  return { svg: out, bodyY: y + h, activeX: pieces[active]?.x ?? x, activeW: pieces[active]?.w ?? 0 };
}

function tabPage(x, y, w, h, activeX, activeW) {
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" fill="${C.face}" stroke="${XP.tabEdge}"/>`
    + `<path d="M${activeX + 1} ${y + 0.5}H${activeX + activeW - 1}" stroke="${XP.page}" stroke-width="2"/>`;
}

function groupBox(x, y, w, h, label, { size = 12, bg = C.face } = {}) {
  let out = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="3" fill="none" stroke="${XP.group}"/>`;
  if (label) {
    out += `<rect x="${x + 7}" y="${y - 6}" width="${textWidth(label, size) + 6}" height="12" fill="${bg}"/>`;
    out += text(x + 10, y + 4, label, { size, fill: XP.groupText });
  }
  return out;
}

function progressBlocks(x, y, w, h, ratio, { animate = true, delay = 0, step = 0.04 } = {}) {
  let out = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="3" fill="#fff" stroke="#686868"/>`;
  const blockW = Math.max(6, Math.round((h - 6) * 0.6));
  const gap = 2;
  const max = Math.floor((w - 6 + gap) / (blockW + gap));
  const count = Math.max(0, Math.min(max, Math.round(max * Math.max(0, Math.min(1, ratio)))));
  for (let i = 0; i < count; i += 1) {
    const style = animate ? ` class="w98-in" style="animation-delay:${(delay + i * step).toFixed(2)}s"` : "";
    out += `<rect${style} x="${x + 3 + i * (blockW + gap)}" y="${y + 3}" width="${blockW}" height="${h - 6}" rx="1" fill="url(#xpseg)"/>`;
  }
  return out;
}

function statusBar(x, y, w, parts, { h = 20, size = 11 } = {}) {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.face}"/><path d="M${x} ${y + 0.5}H${x + w}" stroke="#d6d2c2"/>`;
  let cx = x;
  parts.forEach((part, i) => {
    const pw = i === parts.length - 1 ? x + w - cx : part.w;
    if (i > 0) out += `<path d="M${cx - 0.5} ${y + 3}V${y + h - 3}" stroke="#d6d2c2"/>`;
    out += text(cx + 6, y + h / 2 + 4, fit(part.text, pw - 12, size), { size });
    cx += pw + 2;
  });
  return out;
}

function columnHeaders(x, y, columns, { h = 18, size = 11 } = {}) {
  let out = "";
  let cx = x;
  for (const col of columns) {
    out += `<rect x="${cx}" y="${y}" width="${col.w}" height="${h}" fill="url(#xphdr)"/><path d="M${cx} ${y + h - 1.5}H${cx + col.w}" stroke="#d6d2c2" stroke-width="2"/><path d="M${cx + col.w - 0.5} ${y + 3}V${y + h - 4}" stroke="#c7c5b2"/>`;
    const tx = col.align === "end" ? cx + col.w - 6 : cx + 6;
    out += text(tx, y + h / 2 + 4, fit(col.label, col.w - 12, size), { size, anchor: col.align === "end" ? "end" : undefined });
    cx += col.w;
  }
  return out;
}

export const XP_SKIN = {
  name: "winxp",
  colors: {
    face: "#ece9d8",
    light: "#f1efe2",
    shadow: "#aca899",
    desktop: "#3a6ea5",
    select: "#316ac5",
    disabled: "#aca899"
  },
  gradientDefs,
  raised,
  sunken,
  button,
  titleBar,
  windowFrame,
  tabs,
  tabPage,
  groupBox,
  progressBlocks,
  statusBar,
  columnHeaders
};
