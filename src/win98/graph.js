// Windows 98 "Disk Defragmenter" (details view) for the contribution graph card.
import { DAY_LABELS, NUM_WEEKS, addDays, levelFromCount, toIsoDate } from "../constants.js";
import { C, button, esc, fit, formatNumber, progressBlocks, statusBar, sunken, svgDocument, text, textWidth, windowFrame } from "./kit.js";

const WIDTH = 944;
const CELL = 14;
const GAP = 2;
const STEP = CELL + GAP;
// Defrag-style ramp: free space (white) then three blues.
const LEVEL_FILL = [C.white, "#8080ff", "#0000ff", C.navy];
const LEVEL_STROKE = ["#b0b0b0", "#4040c0", "#000080", "#000040"];

// Small defrag icon: a drive with a coloured block strip.
function defragIcon(x, y) {
  const rect = (rx, ry, w, h, fill) => `<rect x="${x + rx}" y="${y + ry}" width="${w}" height="${h}" fill="${fill}"/>`;
  return rect(1, 3, 14, 10, C.dark)
    + rect(2, 4, 12, 8, C.face)
    + rect(3, 5, 2, 2, C.navy) + rect(6, 5, 2, 2, "#0000ff") + rect(9, 5, 2, 2, C.white) + rect(12, 5, 1, 2, "#8080ff")
    + rect(3, 8, 2, 2, "#0000ff") + rect(6, 8, 2, 2, C.white) + rect(9, 8, 2, 2, C.navy) + rect(12, 8, 1, 2, C.white)
    + rect(2, 13, 12, 1, C.shadow);
}

function monthLabels(firstSunday) {
  const labels = [];
  const endDate = addDays(firstSunday, NUM_WEEKS * 7 - 1);
  let current = new Date(firstSunday.getFullYear(), firstSunday.getMonth(), 1);
  while (current < firstSunday) current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  let lastRight = -Infinity;
  while (current <= endDate) {
    const week = Math.max(0, Math.min(NUM_WEEKS - 1, Math.floor((current - firstSunday) / (7 * 864e5))));
    const label = current.toLocaleString("en-US", { month: "short" });
    if (week * STEP >= lastRight + 4) {
      labels.push({ label, week });
      lastRight = week * STEP + textWidth(label, 11);
    }
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  return labels;
}

export function renderWin98Graph({ contributions, total, firstSunday, today }, { githubId, scale } = {}) {
  const x = 20, y = 20, w = WIDTH - 40;
  const mapPad = 8, dayColW = 30, monthRowH = 16;
  const gridW = NUM_WEEKS * STEP - GAP, gridH = 7 * STEP - GAP;
  const mapW = mapPad * 2 + dayColW + gridW, mapH = mapPad + monthRowH + gridH + mapPad;

  // Vertical layout of the client area.
  const titleH = 18;
  const clientTop = y + 3 + titleH + 2;
  const mapY = clientTop + 8;
  const infoY = mapY + mapH + 10;
  const progY = infoY + 24;
  const btnY = progY + 32;
  const statusY = btnY + 23 + 12;
  const h = statusY + 20 + 4 - y;
  const HEIGHT = y + h + 20;

  const win = windowFrame(x, y, w, h, `Defragmenting Contributions - ${githubId}`, { icon: defragIcon, controls: ["min", "max", "close"], titleH });
  const { client } = win;
  let body = win.svg;

  // Cluster map.
  const mapX = client.x + Math.round((client.w - mapW) / 2);
  body += sunken(mapX, mapY, mapW, mapH);
  const gridX = mapX + mapPad + dayColW;
  const gridY = mapY + mapPad + monthRowH;
  for (const { label, week } of monthLabels(firstSunday)) {
    body += text(gridX + week * STEP, gridY - 5, label, { size: 11 });
  }
  [1, 3, 5].forEach((row) => {
    body += text(mapX + mapPad, gridY + row * STEP + CELL - 3, DAY_LABELS[row], { size: 11, fill: C.shadow });
  });

  let activeDays = 0, elapsedDays = 0;
  let best = null;
  for (let col = 0; col < NUM_WEEKS; col += 1) {
    let cells = "";
    for (let row = 0; row < 7; row += 1) {
      const date = addDays(firstSunday, col * 7 + row);
      if (date > today) continue;
      const iso = toIsoDate(date);
      const count = contributions[iso] ?? 0;
      const level = levelFromCount(count);
      elapsedDays += 1;
      if (count > 0) activeDays += 1;
      if (count > 0 && (!best || count > best.count)) best = { iso, count };
      const cx = gridX + col * STEP, cy = gridY + row * STEP;
      const tip = count > 0 ? `${iso} — ${count} contribution${count === 1 ? "" : "s"}` : `${iso} — No contributions`;
      cells += `<rect x="${cx + 0.5}" y="${cy + 0.5}" width="${CELL - 1}" height="${CELL - 1}" fill="${LEVEL_FILL[level]}" stroke="${LEVEL_STROKE[level]}"><title>${esc(tip)}</title></rect>`;
    }
    if (cells) body += `<g class="w98-in" style="animation-delay:${(0.1 + col * 0.03).toFixed(2)}s">${cells}</g>`;
  }

  // Info line: total + date range.
  const left = mapX, right = mapX + mapW;
  const contribText = `${formatNumber(total)} contribution${total === 1 ? "" : "s"} in the last year`;
  body += text(left, infoY + 13, fit(contribText, mapW / 2 - 10), { weight: 700 });
  body += text(right, infoY + 13, `${toIsoDate(firstSunday)} – ${toIsoDate(today)}`, { anchor: "end" });

  // Progress: share of days with at least one contribution.
  const ratio = elapsedDays > 0 ? activeDays / elapsedDays : 0;
  const pct = Math.round(ratio * 100);
  const labelW = 150;
  body += progressBlocks(left, progY, mapW - labelW, 20, ratio, { delay: 0.2, step: 0.02 });
  body += text(right, progY + 15, `${pct}% of days active`, { anchor: "end" });

  // Legend (Less → More) on the left, dialog buttons on the right.
  body += text(left, btnY + 16, "Less");
  let lx = left + 34;
  LEVEL_FILL.forEach((fill, level) => {
    body += `<rect x="${lx + 0.5}" y="${btnY + 5.5}" width="${CELL - 1}" height="${CELL - 1}" fill="${fill}" stroke="${LEVEL_STROKE[level]}"/>`;
    lx += STEP + 2;
  });
  body += text(lx + 4, btnY + 16, "More");
  const bw = 88, bh = 23, bgap = 6;
  const labels = ["Stop", "Pause", "Legend", "Hide Details"];
  labels.forEach((label, i) => {
    const bx = right - (labels.length - i) * bw - (labels.length - 1 - i) * bgap;
    body += button(bx, btnY, bw, bh, label, { isDefault: i === 0 });
  });

  // Status bar.
  const bestText = best ? `Busiest day: ${best.iso} (${formatNumber(best.count)})` : "Busiest day: none";
  body += statusBar(client.x, statusY, client.w, [
    { text: "Defragmentation complete.", w: 240 },
    { text: `Active days: ${formatNumber(activeDays)} of ${formatNumber(elapsedDays)}`, w: 220 },
    { text: bestText }
  ]);

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title: `Defragmenting Contributions - ${githubId}`,
    label: `GitHub contribution graph for ${githubId}`,
    body
  });
}
