// Editor theme, star history card: stars.csv open on the left, its chart preview on the right.
import { MONO, codeBlock, editorWindow, fadeIn, formatNumber, hline, palette, svgDocument, text, vline, windowEnd } from "./kit.js";
import { compactCount, isoDay, niceTop, sampleSeries, seriesTicks } from "../starHistory.js";

const WIDTH = 900;
const HEIGHT = 470;
const CODE_W = 300;

export function renderEditorStarHistory(card, { scale, scheme, ide } = {}) {
  const p = palette(scheme, ide);
  const { history, fullName, name } = card;
  const series = sampleSeries(history, 60);

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `stars.csv — ${name}`,
    active: "explorer",
    tabs: [{ label: "stars.csv", badge: "csv", active: true }, { label: "Preview stars.csv", badge: "csv" }],
    status: {
      left: [{ text: "⎇ main" }, { text: "⊗ 0  ⚠ 0" }],
      right: [{ text: `★ ${formatNumber(history.total)}` }, { text: `Ln ${series.length + 1}, Col 1` }, { text: "CSV" }]
    }
  });
  let body = win.svg;
  const e = win.regions.editor;

  // The CSV: a header and the sampled series. When it is longer than the pane, the middle is
  // folded like an editor region so the latest rows always stay in view.
  const lineH = 20;
  const maxRows = Math.floor((e.h - 12) / lineH);
  const lines = [{ tokens: [["date", "prop"], [",", "dim"], ["stars", "prop"]] }];
  for (const pt of series) lines.push({ tokens: [[isoDay(pt.t), "str"], [",", "dim"], [String(pt.total), "num"]] });
  const csvTop = e.y + 6;
  if (lines.length <= maxRows) {
    body += codeBlock(p, e.x, csvTop, CODE_W, lines, { size: 13, lineH });
  } else {
    const head = 4; // header + the first rows
    const tail = maxRows - head - 1; // one row for the fold marker
    const hidden = lines.length - head - tail;
    body += codeBlock(p, e.x, csvTop, CODE_W, lines.slice(0, head), { size: 13, lineH });
    const fy = csvTop + head * lineH;
    const label = `⋯ ${hidden} rows`;
    body += `<rect x="${e.x + 48}" y="${fy + 3}" width="${(label.length * 13 * 0.6 + 12).toFixed(1)}" height="${lineH - 6}" rx="3" fill="${p.chip}"/>`;
    body += text(e.x + 54, fy + lineH * 0.7, label, { size: 12, fill: p.dim, family: MONO });
    body += codeBlock(p, e.x, fy + lineH, CODE_W, lines.slice(-tail), { size: 13, lineH, start: lines.length - tail + 1, activeLine: lines.length });
  }

  // Chart preview pane.
  const vx = e.x + CODE_W, vw = e.x + e.w - vx;
  body += vline(vx, e.y, e.h, p.line);
  body += text(vx + 20, e.y + 26, "Star history", { size: 15, weight: 600, fill: p.fg });
  const approx = history.approx ? "~" : "";
  body += text(vx + vw - 20, e.y + 26, `${formatNumber(history.total)} total · ${approx}+${formatNumber(history.last30)} last 30d`, { size: 12, fill: p.dim, anchor: "end" });

  const top = niceTop(Math.max(1, history.total));
  const gx = vx + 56, gy = e.y + 48, gw = vw - 76, gh = e.h - 96;
  for (let k = 0; k <= 5; k += 1) {
    const v = (top * k) / 5;
    const yy = gy + gh - (k / 5) * gh;
    body += hline(gx, yy, gw, p.line);
    body += text(gx - 8, yy + 4, compactCount(v), { size: 11, fill: p.faint, anchor: "end", family: MONO });
  }
  if (series.length) {
    const pts = series.map((pt, i) => [gx + (i * gw) / (series.length - 1), gy + gh - (pt.total / top) * gh]);
    const line = pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
    const [lx, ly] = pts[pts.length - 1];
    body += fadeIn(
      `<polygon points="${gx},${gy + gh} ${line} ${(gx + gw).toFixed(1)},${gy + gh}" fill="${p.star}" fill-opacity="0.15"/>`
      + `<polyline points="${line}" fill="none" stroke="${p.star}" stroke-width="2"/>`
      + `<circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="4" fill="${p.star}"/>`,
      0.15
    );
    const step = gw / (series.length - 1);
    for (const tick of seriesTicks(series, Math.ceil(40 / step))) {
      body += text(gx + tick.i * step, gy + gh + 18, tick.label, { size: 11, fill: p.faint, anchor: "middle" });
    }
  } else {
    body += text(gx + gw / 2, gy + gh / 2, "No stargazers yet.", { size: 13, fill: p.dim, anchor: "middle" });
  }
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `${fullName} — stars.csv`,
    label: `Star history of ${fullName}`,
    body
  });
}
