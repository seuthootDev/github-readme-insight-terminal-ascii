// Editor theme, contribution graph: the heatmap open as a file, one editor line per weekday.
import { DAY_LABELS, NUM_WEEKS, addDays, levelFromCount, toIsoDate } from "../constants.js";
import { MONO, codeTokens, editorWindow, esc, fadeIn, formatNumber, palette, rect, shortDate, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const WIDTH = 944;
const CELL = 11;
const STEP = 14;
const LINE_H = 20;

function monthLabels(firstSunday) {
  const labels = [];
  const endDate = addDays(firstSunday, NUM_WEEKS * 7 - 1);
  let current = new Date(firstSunday.getFullYear(), firstSunday.getMonth(), 1);
  while (current < firstSunday) current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  let lastRight = -Infinity;
  while (current <= endDate) {
    const week = Math.max(0, Math.min(NUM_WEEKS - 1, Math.floor((current - firstSunday) / (7 * 864e5))));
    const label = current.toLocaleString("en-US", { month: "short" });
    if (week * STEP >= lastRight + 6) {
      labels.push({ label, week });
      lastRight = week * STEP + textWidth(label, 12);
    }
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }
  return labels;
}

export function renderEditorGraph({ contributions, total, firstSunday, today }, { githubId, scale, scheme } = {}) {
  const p = palette(scheme);
  // Lines: 1 = month comment, 2-8 = weekdays, 9 = blank, 10 = summary comment.
  const lineCount = 10;
  const editorH = 12 + lineCount * LINE_H + 14;
  const HEIGHT = 20 + 30 + 35 + 22 + editorH + 22 + 20;
  const file = "contributions.heat";

  let activeDays = 0, elapsedDays = 0, best = null;
  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `${file} — ${githubId}`,
    active: "explorer",
    tabs: [{ label: file, badge: "heat", active: true }, { label: "README.md", badge: "md" }],
    status: {
      left: [{ text: "⎇ main" }, { text: "⊗ 0  ⚠ 0" }],
      right: [{ text: `${formatNumber(total)} contributions` }, { text: "Ln 8, Col 53" }, { text: "Heatmap" }]
    }
  });
  const e = win.regions.editor;
  let body = win.svg;

  // Breadcrumbs.
  body += text(e.x + 20, e.y + 15, `${githubId}  ›  ${file}`, { size: 12, fill: p.dim });
  const top = e.y + 22 + 10;
  const gutter = 52;
  const dayX = e.x + gutter + 4;
  const gridX = dayX + 40;

  // Line numbers (line 8 holds the cursor).
  for (let i = 0; i < lineCount; i += 1) {
    const n = i + 1;
    body += text(e.x + gutter - 16, top + i * LINE_H + 14, String(n), { size: 12, fill: n === 8 ? p.fg : p.faint, anchor: "end", family: MONO });
  }
  body += rect(e.x + gutter, top + 7 * LINE_H, e.w - gutter, LINE_H, p.hover);

  // Line 1: the month ruler, written as a comment.
  body += codeTokens(p, dayX, top + 14, [["//", "cmt"]], { size: 13 });
  for (const { label, week } of monthLabels(firstSunday)) {
    body += text(gridX + week * STEP, top + 14, label, { size: 12, fill: p.cmt, family: MONO });
  }

  // Lines 2-8: one weekday per line.
  for (let row = 0; row < 7; row += 1) {
    const ly = top + (row + 1) * LINE_H;
    body += codeTokens(p, dayX, ly + 14, [[DAY_LABELS[row], "prop"]], { size: 13 });
  }
  for (let col = 0; col < NUM_WEEKS; col += 1) {
    let cells = "";
    for (let row = 0; row < 7; row += 1) {
      const date = addDays(firstSunday, col * 7 + row);
      if (date > today) continue;
      const iso = toIsoDate(date);
      const count = contributions[iso] ?? 0;
      elapsedDays += 1;
      if (count > 0) activeDays += 1;
      if (count > 0 && (!best || count > best.count)) best = { iso, count };
      const cx = gridX + col * STEP;
      const cy = top + (row + 1) * LINE_H + (LINE_H - CELL) / 2;
      const tip = count > 0 ? `${iso}: ${count} contribution${count === 1 ? "" : "s"}` : `${iso}: no contributions`;
      cells += `<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" rx="2" fill="${p.heat[levelFromCount(count)]}"><title>${esc(tip)}</title></rect>`;
    }
    if (cells) body += fadeIn(cells, 0.04 + col * 0.012);
  }

  // Cursor after the last cell of line 8.
  body += rect(gridX + (NUM_WEEKS - 1) * STEP + CELL + 3, top + 7 * LINE_H + 3, 2, LINE_H - 6, p.fg);

  // Line 10: summary comment + legend on the right.
  const ly = top + 9 * LINE_H + 14;
  const pct = elapsedDays > 0 ? Math.round((activeDays / elapsedDays) * 100) : 0;
  const summary = `// ${formatNumber(total)} contributions · ${pct}% of days active${best ? ` · busiest ${shortDate(best.iso)} (${formatNumber(best.count)})` : ""}`;
  body += codeTokens(p, dayX, ly, [[summary, "cmt"]], { size: 13, maxWidth: e.x + e.w - dayX - 180 });
  let lx = e.x + e.w - 24 - (4 * STEP) - textWidth("More", 12);
  body += text(lx - 8, ly, "Less", { size: 12, fill: p.dim, anchor: "end" });
  p.heat.forEach((fill) => {
    body += rect(lx, ly - 10, CELL, CELL, fill, 'rx="2"');
    lx += STEP;
  });
  body += text(lx + 4, ly, "More", { size: 12, fill: p.dim });
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `${file} — ${githubId}`,
    label: `GitHub contribution graph for ${githubId}`,
    body
  });
}
