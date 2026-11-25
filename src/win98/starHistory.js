// Windows 98 / XP star history card: a Task Manager style "Performance" tab. The meter on the
// left is the star count, the green-on-black graph on the right is the history.
import { ICONS, fit, formatNumber, groupBox, menuBar, statusBar, svgDocument, tabPage, tabs, text, windowFrame } from "./kit.js";
import { niceTop, sampleSeries } from "../starHistory.js";

const WIDTH = 700;
const HEIGHT = 470;
const GRID = 12;

function usDate(t) {
  if (t === null || t === undefined) return "—";
  const d = new Date(t);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

export function renderWin98StarHistory(card, { scale } = {}) {
  const { history, fullName, name } = card;
  const x = 20, y = 20, w = WIDTH - 40, h = HEIGHT - 40;
  const win = windowFrame(x, y, w, h, "Star Monitor", { icon: ICONS.computer, controls: ["min", "max", "close"] });
  const c = win.client;
  let body = win.svg;
  body += menuBar(c.x, c.y, ["File", "Options", "View", "Help"]);

  const strip = tabs(c.x + 6, c.y + 26, ["Repositories", "Stargazers", "Performance"], 2);
  const px = c.x + 6, py = strip.bodyY, pw = c.w - 12, ph = c.h - (py - c.y) - 30;
  body += tabPage(px, py, pw, ph, strip.activeX, strip.activeW) + strip.svg;

  // Meter: two columns of LED segments filled to the star count on a rounded scale.
  const top = niceTop(Math.max(1, history.total));
  const gy = py + 16, gh = 170, lw = 110;
  body += groupBox(px + 12, gy, lw, gh, "Stars");
  const mx = px + 24, my = gy + 18, mw = lw - 24, mh = gh - 30;
  body += `<rect x="${mx}" y="${my}" width="${mw}" height="${mh}" fill="#000000"/>`;
  const segments = 26;
  const segH = (mh - 30) / segments;
  const lit = Math.round((history.total / top) * segments);
  const colW = (mw - 36) / 2 - 1;
  for (let i = 0; i < segments; i += 1) {
    const sy = (my + mh - 24 - (i + 1) * segH).toFixed(1);
    const fill = i < lit ? "#00ff00" : "#004000";
    body += `<rect x="${mx + 18}" y="${sy}" width="${colW}" height="${(segH - 1.5).toFixed(1)}" fill="${fill}"/>`;
    body += `<rect x="${mx + mw / 2 + 1}" y="${sy}" width="${colW}" height="${(segH - 1.5).toFixed(1)}" fill="${fill}"/>`;
  }
  body += text(mx + mw / 2, my + mh - 8, fit(`${formatNumber(history.total)} ★`, mw - 6, 12), { size: 12, fill: "#00ff00", anchor: "middle" });

  // History graph on the classic green grid.
  const hx = px + 12 + lw + 12, hw = px + pw - 12 - hx;
  body += groupBox(hx, gy, hw, gh, "Star History");
  const cx = hx + 12, cy = gy + 18, cw = hw - 24, ch = gh - 30;
  body += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" fill="#000000"/>`;
  let grid = "";
  for (let gx = cx + GRID; gx < cx + cw; gx += GRID) grid += `M${gx + 0.5} ${cy}V${cy + ch}`;
  for (let gyy = cy + GRID; gyy < cy + ch; gyy += GRID) grid += `M${cx} ${gyy + 0.5}H${cx + cw}`;
  body += `<path d="${grid}" stroke="#008040"/>`;
  const series = sampleSeries(history, Math.floor((cw - 8) / 4));
  if (series.length) {
    const pts = series.map((pt, i) => `${(cx + 4 + (i * (cw - 8)) / (series.length - 1)).toFixed(1)},${(cy + ch - 6 - (pt.total / top) * (ch - 14)).toFixed(1)}`);
    body += `<polyline class="w98-fade" style="animation-delay:0.2s" points="${pts.join(" ")}" fill="none" stroke="#00ff00" stroke-width="1.5"/>`;
  } else {
    body += text(cx + cw / 2, cy + ch / 2 + 4, "No stargazers yet", { size: 11, fill: "#00ff00", anchor: "middle" });
  }

  // Totals and Timeline boxes, like Task Manager's Totals / Physical Memory.
  const approx = history.approx ? "~" : "";
  const by = gy + gh + 16, bh = ph - (by - py) - 12, bw = (pw - 36) / 2;
  const boxes = [
    ["Totals", px + 12, [
      ["Total", formatNumber(history.total)],
      ["Last 30 days", `${approx}+${formatNumber(history.last30)}`],
      ["Average per week", `+${history.avgPerWeek.toFixed(1)}`]
    ]],
    ["Timeline", px + 24 + bw, [
      ["Created", usDate(card.createdAt ? Date.parse(card.createdAt) : null)],
      ["First star", usDate(history.first)],
      ["Weeks tracked", formatNumber(history.weeks)]
    ]]
  ];
  for (const [label, bx, rows] of boxes) {
    body += groupBox(bx, by, bw, bh, label);
    rows.forEach(([k, v], i) => {
      body += `<g class="w98-in" style="animation-delay:${(0.1 + i * 0.05).toFixed(2)}s">`;
      body += text(bx + 12, by + 22 + i * 18, k, { size: 11 });
      body += text(bx + bw - 12, by + 22 + i * 18, v, { size: 11, anchor: "end" });
      body += "</g>";
    });
  }

  body += statusBar(c.x, c.y + c.h - 22, c.w, [
    { text: fit(`Repository: ${name}`, 290, 11), w: 300 },
    { text: `Stars: ${formatNumber(history.total)}`, w: 110 },
    { text: `Rate: +${history.avgPerWeek.toFixed(1)}/week` }
  ]);

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title: "Star Monitor",
    label: `Star history of ${fullName}`,
    body
  });
}
