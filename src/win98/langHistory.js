// Windows 98 "System Monitor" window for the language history card.
import { C, button, esc, etchedH, etchedV, fit, formatNumber, menuBar, raised, statusBar, sunken, svgDocument, text, textWidth, windowFrame } from "./kit.js";

const WIDTH = 940;
const OTHER = "Other";
const OTHER_FILL = C.shadow;

// Small monitor icon with a green trace.
function monitorIcon(x, y) {
  const r = (rx, ry, w, h, fill) => `<rect x="${x + rx}" y="${y + ry}" width="${w}" height="${h}" fill="${fill}"/>`;
  return r(1, 2, 14, 11, C.dark) + r(2, 3, 12, 9, C.dark)
    + `<path d="M${x + 2.5} ${y + 9.5}h3l2 -4l2 5l2 -3h2.5" stroke="#00ff00" fill="none"/>`
    + r(5, 13, 6, 1, C.shadow) + r(3, 14, 10, 1, C.dark);
}

function toolButton(x, y, glyph) {
  return raised(x, y, 23, 22, { thick: false }) + glyph(x + 4, y + 3);
}

const GLYPHS = [
  // Add item (+ on a chart)
  (x, y) => `<rect x="${x + 1.5}" y="${y + 3.5}" width="12" height="10" fill="${C.white}" stroke="${C.dark}"/><path d="M${x + 3} ${y + 11}l3 -3l2 2l4 -4" stroke="${C.navy}" fill="none"/>`,
  // Remove
  (x, y) => `<rect x="${x + 1.5}" y="${y + 3.5}" width="12" height="10" fill="${C.white}" stroke="${C.dark}"/><path d="M${x + 4} ${y + 6}l6 6M${x + 10} ${y + 6}l-6 6" stroke="#ff0000" stroke-width="1.5"/>`,
  // Line chart
  (x, y) => `<path d="M${x + 1} ${y + 14.5}h14M${x + 1.5} ${y + 2}v13" stroke="${C.dark}"/><path d="M${x + 2} ${y + 11}l4 -5l3 3l5 -6" stroke="#ff0000" fill="none"/>`,
  // Bar chart (active)
  (x, y) => `<path d="M${x + 1} ${y + 14.5}h14" stroke="${C.dark}"/><rect x="${x + 3}" y="${y + 8}" width="3" height="6" fill="${C.navy}"/><rect x="${x + 7}" y="${y + 4}" width="3" height="10" fill="${C.navy}"/><rect x="${x + 11}" y="${y + 6}" width="3" height="8" fill="${C.navy}"/>`,
  // Numeric
  (x, y) => `<rect x="${x + 1.5}" y="${y + 3.5}" width="13" height="10" fill="${C.white}" stroke="${C.dark}"/>${text(x + 8, y + 12, "42", { size: 9, anchor: "middle", weight: 700 })}`
];

export function renderWin98LangHistory({ rows, colors, legend, mover, yearCount }, { githubId, scale } = {}) {
  const colorOf = (language) => (language === OTHER ? OTHER_FILL : (colors[language] ?? C.shadow));
  const x = 20, y = 20, w = WIDTH - 40;
  const titleH = 18;
  const clientTop = y + 3 + titleH + 2;

  const rowH = 30;
  const visibleRows = Math.max(1, rows.length);
  const menuY = clientTop;
  const toolY = menuY + 22;
  const chartTitleY = toolY + 30;
  const chartY = chartTitleY + 20;
  const chartH = 30 + visibleRows * rowH + 6;
  const legendY = chartY + chartH + 8;
  const statusY = legendY + 30;
  const h = statusY + 20 + 4 - y;
  const HEIGHT = y + h + 20;

  const title = `System Monitor - ${githubId}`;
  const win = windowFrame(x, y, w, h, title, { icon: monitorIcon, controls: ["min", "max", "close"], titleH });
  const { client } = win;
  let body = win.svg;

  // Menu bar + toolbar.
  body += menuBar(client.x, menuY, ["File", "Edit", "View", "Options", "Help"]);
  body += etchedH(client.x, toolY - 3, client.w);
  GLYPHS.forEach((glyph, i) => {
    const bx = client.x + 4 + i * 24 + (i >= 2 ? 8 : 0);
    body += i === 3 ? sunken(bx, toolY, 23, 22, { fill: C.light }) + glyph(bx + 4, toolY + 3) : toolButton(bx, toolY, glyph);
  });
  body += etchedV(client.x + 4 + 2 * 24 + 2, toolY + 1, 20);
  body += etchedH(client.x, toolY + 26, client.w);

  // Chart caption strip (System Monitor labels each chart).
  const chartX = client.x + 6, chartW = client.w - 12;
  body += raised(chartX, chartTitleY, chartW, 18, { thick: false });
  body += text(chartX + 6, chartTitleY + 13, fit(`Commits: share by language per year (%) - last ${yearCount} years`, chartW - 12, 11), { size: 11 });

  // Sunken white chart.
  body += sunken(chartX, chartY, chartW, chartH);
  const yearX = chartX + 12;
  const barX = chartX + 64;
  const totalColW = 90;
  const barW = chartW - (barX - chartX) - totalColW - 10;
  const axisY = chartY + 18;
  [0, 25, 50, 75, 100].forEach((p) => {
    const gx = barX + (barW * p) / 100;
    body += `<path d="M${gx + 0.5} ${axisY + 4}V${chartY + chartH - 6}" stroke="${C.face}" stroke-dasharray="2 2"/>`;
    body += text(gx, axisY, `${p}`, { size: 10, anchor: p === 0 ? "start" : p === 100 ? "end" : "middle", fill: C.shadow });
  });
  body += text(yearX, axisY, "Year", { size: 10, fill: C.shadow });
  body += text(chartX + chartW - 12, axisY, "Commits", { size: 10, anchor: "end", fill: C.shadow });

  if (rows.length === 0) {
    body += text(barX, axisY + 30, `No public commits in the last ${yearCount} years`);
  }
  rows.forEach((row, i) => {
    const ry = chartY + 30 + i * rowH;
    const by = ry + 5, bh = 16;
    let g = text(yearX, ry + 18, String(row.year), { weight: 700 });
    if (row.total === 0) {
      g += `<rect x="${barX + 0.5}" y="${by + 0.5}" width="${barW - 1}" height="${bh - 1}" fill="${C.white}" stroke="${C.shadow}"/>`;
    } else {
      let running = 0;
      for (const [language, count] of row.segments) {
        const sx = barX + Math.round((running / row.total) * barW);
        running += count;
        const ex = barX + Math.round((running / row.total) * barW);
        if (ex <= sx) continue;
        const pct = Math.round((count / row.total) * 100);
        g += `<rect x="${sx}" y="${by}" width="${ex - sx}" height="${bh}" fill="${esc(colorOf(language))}"><title>${esc(`${row.year} ${language}: ${formatNumber(count)} commits (${pct}%)`)}</title></rect>`;
      }
      g += `<rect x="${barX + 0.5}" y="${by + 0.5}" width="${barW - 1}" height="${bh - 1}" fill="none" stroke="${C.dark}"/>`;
    }
    g += text(chartX + chartW - 12, ry + 18, formatNumber(row.total), { anchor: "end" });
    body += `<g class="w98-in" style="animation-delay:${(0.15 + i * 0.12).toFixed(2)}s">${g}</g>`;
  });

  // Legend swatches.
  let lx = chartX + 4;
  const legendRight = chartX + chartW;
  for (const language of [...legend, OTHER]) {
    const label = fit(language, 110);
    const itemW = 14 + 6 + textWidth(label, 12) + 18;
    if (lx + itemW > legendRight) break;
    body += `<rect x="${lx + 0.5}" y="${legendY + 4.5}" width="13" height="13" fill="${esc(colorOf(language))}" stroke="${C.dark}"/>`;
    body += text(lx + 20, legendY + 15, label);
    lx += itemW;
  }

  // Status bar with the biggest mover.
  const moverText = mover
    ? `Biggest mover: ${mover.language} ${mover.delta > 0 ? "▲" : "▼"} ${Math.abs(Math.round(mover.delta))}%p since ${mover.since}`
    : "Biggest mover: none";
  const totalCommits = rows.reduce((acc, row) => acc + row.total, 0);
  body += statusBar(client.x, statusY, client.w, [
    { text: moverText, w: Math.round(client.w * 0.55) },
    { text: `${rows.length} year(s)`, w: 110 },
    { text: `${formatNumber(totalCommits)} commits` }
  ]);

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title,
    label: `Language history card for ${githubId}`,
    body
  });
}
