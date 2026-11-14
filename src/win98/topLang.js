// Windows 98 "Drive Properties" (General tab) for the top-languages card: the language shares are
// the drive's used/free space, drawn as the classic 3D pie.
import { C, ICONS, button, etchedH, fit, formatNumber, sunken, svgDocument, tabPage, tabs, text, windowFrame } from "./kit.js";

const WIDTH = 770;
const MIN_HEIGHT = 376;
const ROW_H = 20;
const OTHER_COLOR = C.white;

// Win98 painted the pie's side wall in a darker shade of each slice colour.
function darken(color, factor = 0.55) {
  const value = String(color ?? "").trim();
  let match = /^#([0-9a-f]{3})$/i.exec(value);
  const hex = match ? match[1].split("").map((ch) => ch + ch).join("") : /^#([0-9a-f]{6})$/i.exec(value)?.[1];
  if (hex) {
    const n = Number.parseInt(hex, 16);
    return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c * factor).toString(16).padStart(2, "0")).join("")}`;
  }
  match = /^hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i.exec(value);
  if (match) return `hsl(${match[1]}, ${match[2]}%, ${(Number(match[3]) * factor).toFixed(1)}%)`;
  return C.shadow;
}

function humanSize(bytes) {
  const units = ["bytes", "KB", "MB", "GB", "TB"];
  let v = Number(bytes ?? 0);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return i === 0 ? `${formatNumber(Math.round(v))} bytes` : `${v.toFixed(2)} ${units[i]}`;
}

// 3D pie: elliptical top face + extruded rim on the front half. Angles in radians, 0 = 3 o'clock,
// increasing clockwise on screen (SVG y points down).
function pie3d(cx, cy, rx, ry, depth, slices) {
  const pt = (t, dy = 0) => `${(cx + rx * Math.cos(t)).toFixed(2)} ${(cy + ry * Math.sin(t) + dy).toFixed(2)}`;
  let rims = "";
  let tops = "";
  // Base silhouette so seams between rim pieces never show the dialog face.
  rims += `<path d="M${pt(0)}V${cy + depth}A${rx} ${ry} 0 0 1 ${pt(Math.PI, depth)}V${cy}Z" fill="${C.dark}"/>`;
  for (const s of slices) {
    const a = Math.max(s.a0, 0), b = Math.min(s.a1, Math.PI);
    if (b > a + 1e-4) {
      rims += `<path d="M${pt(a)}A${rx} ${ry} 0 0 1 ${pt(b)}L${pt(b, depth)}A${rx} ${ry} 0 0 0 ${pt(a, depth)}Z" fill="${darken(s.color)}" stroke="${C.dark}" stroke-width="1" stroke-linejoin="bevel"/>`;
    }
    const span = s.a1 - s.a0;
    if (span >= Math.PI * 2 - 1e-4) {
      tops += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${s.color}" stroke="${C.dark}"/>`;
    } else if (span > 1e-4) {
      tops += `<path d="M${cx} ${cy}L${pt(s.a0)}A${rx} ${ry} 0 ${span > Math.PI ? 1 : 0} 1 ${pt(s.a1)}Z" fill="${s.color}" stroke="${C.dark}" stroke-width="1" stroke-linejoin="bevel"/>`;
    }
  }
  return rims + tops;
}

function swatch(x, y, color, size = 12) {
  return `<rect x="${x + 0.5}" y="${y + 0.5}" width="${size - 1}" height="${size - 1}" fill="${color}" stroke="${C.dark}"/>`;
}

export function renderWin98TopLang(data, { githubId, scale } = {}) {
  const user = data.login || githubId;
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const unit = data.sizeUnit ?? 1;
  const top = data.top ?? rows.length;

  // Everything outside the top N becomes "Other", like the free space of a drive.
  const shownPct = rows.reduce((acc, r) => acc + Number(r.pct ?? 0), 0);
  const otherPct = rows.length > 0 ? Math.max(0, 100 - shownPct) : 0;
  const totalBytes = rows.length > 0 && Number(rows[0].pct) > 0 ? (Number(rows[0].size) * unit) / (Number(rows[0].pct) / 100) : 0;
  const list = rows.map((r) => ({ label: r.language, color: r.color, pct: Number(r.pct ?? 0), bytes: Number(r.size ?? 0) * unit }));
  if (otherPct >= 0.05) list.push({ label: "Other", color: OTHER_COLOR, pct: otherPct, bytes: Math.max(0, totalBytes - list.reduce((a, r) => a + r.bytes, 0)) });

  // Left column height decides the page height (top 12 + Other needs more room than the default).
  const leftContentH = 104 + Math.max(list.length, 2) * ROW_H;
  const pageH = Math.max(242, leftContentH + 8);
  const HEIGHT = Math.max(MIN_HEIGHT, 69 + pageH + 10 + 23 + 12 + 20);

  const label = `Languages (@${user})`;
  const title = `${label} Properties`;
  const x = 20, y = 20, w = WIDTH - 40, h = HEIGHT - 40;
  const win = windowFrame(x, y, w, h, title, { icon: ICONS.drive, controls: ["help", "close"] });
  const { client } = win;
  let body = win.svg;

  const strip = tabs(client.x + 6, client.y + 6, ["General", "Tools", "Sharing"], 0);
  const pageX = client.x + 6, pageY = strip.bodyY, pageW = client.w - 12;
  body += tabPage(pageX, pageY, pageW, pageH, strip.activeX, strip.activeW);
  body += strip.svg;

  // ---- Left column: label field, language list, capacity ----
  const lx = pageX + 16;
  const lw = 390;
  body += ICONS.drive(lx, pageY + 10, 2);
  const fieldX = lx + 48, fieldW = lw - 48;
  body += sunken(fieldX, pageY + 16, fieldW, 21);
  body += text(fieldX + 5, pageY + 31, fit(label, fieldW - 10));

  let cy = pageY + 52;
  body += etchedH(lx, cy, lw);
  cy += 12;

  const nameX = lx + 20;
  const bytesRight = lx + lw - 70;
  const pctRight = lx + lw;
  if (list.length === 0) {
    const [emptyText, hintText] = data.emptyLines ?? ["No language data found", ""];
    body += text(lx, cy + 13, fit(emptyText, lw));
    if (hintText) body += text(lx, cy + 13 + ROW_H, fit(hintText, lw, 11), { size: 11, fill: C.shadow });
  }
  list.forEach((row, i) => {
    const ry = cy + i * ROW_H;
    body += `<g class="w98-in" style="animation-delay:${(0.05 + i * 0.05).toFixed(2)}s">`;
    body += swatch(lx, ry + 3, row.color);
    body += text(nameX, ry + 13, fit(`${row.label}:`, bytesRight - 120 - nameX, 11), { size: 11 });
    body += text(bytesRight, ry + 13, fit(humanSize(row.bytes), 112, 11), { size: 11, anchor: "end" });
    body += text(pctRight, ry + 13, `${row.pct.toFixed(2)}%`, { size: 11, anchor: "end" });
    body += "</g>";
  });
  cy += Math.max(list.length, 2) * ROW_H + 6;
  body += etchedH(lx, cy, lw);
  cy += 12;
  body += text(nameX, cy + 13, "Capacity:", { size: 11 });
  body += text(bytesRight, cy + 13, fit(humanSize(totalBytes), 112, 11), { size: 11, anchor: "end" });
  body += text(pctRight, cy + 13, fit(`Top ${top}`, 64, 11), { size: 11, anchor: "end" });

  // ---- Right column: type info + 3D pie ----
  const rx0 = lx + lw + 24;
  const rw = pageX + pageW - 16 - rx0;
  body += text(rx0, pageY + 26, "Type:", { size: 11 });
  body += text(rx0 + 76, pageY + 26, fit("Language usage", rw - 76, 11), { size: 11 });
  body += text(rx0, pageY + 44, "File system:", { size: 11 });
  body += text(rx0 + 76, pageY + 44, fit("GitHub", rw - 76, 11), { size: 11 });

  const pieRx = Math.min(110, rw / 2 - 6);
  const pieRy = Math.round(pieRx * 0.45);
  const depth = 16;
  const pieCx = rx0 + rw / 2;
  const captionY = pageY + pageH - 22;
  const pieCy = Math.round(pageY + 60 + (captionY - 22 - (pageY + 60)) / 2 - depth / 2);
  const slices = [];
  let angle = 0;
  const pieRows = list.length > 0 ? list : [{ color: OTHER_COLOR, pct: 100 }];
  const pctSum = pieRows.reduce((a, r) => a + r.pct, 0) || 1;
  for (const row of pieRows) {
    const span = (row.pct / pctSum) * Math.PI * 2;
    slices.push({ a0: angle, a1: angle + span, color: row.color });
    angle += span;
  }
  if (slices.length) slices[slices.length - 1].a1 = Math.PI * 2;
  body += `<g class="w98-fade">${pie3d(pieCx, pieCy, pieRx, pieRy, depth, slices)}</g>`;
  const cleanW = 92;
  const captionW = rw - cleanW - 10;
  body += text(rx0 + captionW / 2, captionY, fit(`@${user}`, captionW, 12), { anchor: "middle" });
  body += button(rx0 + rw - cleanW, captionY - 16, cleanW, 23, "Details...");

  // Dialog buttons.
  const by = pageY + pageH + 10;
  const bw = 75, bh = 23;
  const right = pageX + pageW;
  body += button(right - bw * 3 - 12, by, bw, bh, "OK", { isDefault: true });
  body += button(right - bw * 2 - 6, by, bw, bh, "Cancel");
  body += button(right - bw, by, bw, bh, "Apply", { disabled: true });

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title,
    label: `Top languages card for ${user}`,
    body
  });
}
