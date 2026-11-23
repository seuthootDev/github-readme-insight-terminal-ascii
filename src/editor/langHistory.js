// Editor theme, language history: a notebook cell whose output is the stacked bar chart per year.
import { MONO, codeTokens, editorWindow, esc, fadeIn, fit, formatNumber, hline, palette, rect, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const WIDTH = 880;
const OTHER = "Other";
const BAR_ROW = 30;

export function renderEditorLangHistory({ rows, colors, legend, mover, yearCount }, { githubId, scale, scheme, ide } = {}) {
  const p = palette(scheme, ide);
  const user = githubId;
  const colorOf = (language) => (language === OTHER ? p.faint : (colors?.[language] ?? p.dim));
  const chartRows = Array.isArray(rows) ? rows : [];

  const top = 20 + 30 + 35;
  const toolbarH = 34;
  const cellY = top + toolbarH + 14;
  const cellH = 2 * 20 + 18;
  const outY = cellY + cellH + 34;
  const chartH = Math.max(1, chartRows.length) * BAR_ROW;
  const legendY = outY + chartH + 18;
  const moverY = legendY + 34;
  const HEIGHT = moverY + 26 + 22 + 20;

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `lang-history.ipynb — ${user}`,
    active: "explorer",
    tabs: [{ label: "lang-history.ipynb", badge: "ipynb", active: true }],
    status: {
      left: [{ text: "⎇ main" }, { text: "Kernel idle" }],
      right: [{ text: `${yearCount ?? chartRows.length} years` }, { text: "Cell 1 of 1" }, { text: "{} Python" }]
    }
  });
  const e = win.regions.editor;
  let body = win.svg;

  // Notebook toolbar.
  let tx = e.x + 20;
  for (const label of ["+ Code", "+ Markdown", "▷ Run All", "↺ Restart", "Clear All Outputs"]) {
    body += text(tx, e.y + 21, label, { size: 12, fill: p.fg });
    tx += textWidth(label, 12) + 22;
  }
  body += text(e.x + e.w - 20, e.y + 21, "◉ Python 3.12", { size: 12, fill: p.dim, anchor: "end" });
  body += hline(e.x, e.y + toolbarH - 1, e.w, p.line);

  // Code cell.
  const cx = e.x + 64, cw = e.w - 64 - 24;
  body += rect(e.x + 24, cellY, 2, cellH, p.accent);
  body += text(e.x + 56, cellY + 24, "[1]", { size: 12, fill: p.dim, anchor: "end", family: MONO });
  body += rect(cx, cellY, cw, cellH, p.side, `rx="4" stroke="${p.accent}"`);
  body += codeTokens(p, cx + 14, cellY + 24, [["df", "fg"], [" = ", "fg"], ["commits_by_language", "fn"], ["(", "fg"], [`"${user}"`, "str"], [", years=", "fg"], [String(yearCount ?? chartRows.length), "num"], [")", "fg"]], { size: 13, maxWidth: cw - 28 });
  body += codeTokens(p, cx + 14, cellY + 44, [["df", "fg"], [".", "fg"], ["plot", "fn"], [".", "fg"], ["barh", "fn"], ["(stacked=", "fg"], ["True", "kw"], [", by=", "fg"], ['"share"', "str"], [")", "fg"]], { size: 13, maxWidth: cw - 28 });
  body += text(cx, cellY + cellH + 18, "✓", { size: 12, fill: p.ok });
  body += text(cx + 16, cellY + cellH + 18, "1.8s", { size: 12, fill: p.faint });

  // Output: one stacked bar per year.
  const yearW = 48, totalW = 90;
  const barX = cx + yearW, barW = cw - yearW - totalW;
  if (chartRows.length === 0) {
    body += text(cx, outY + 18, "No commit history found.", { size: 13, fill: p.dim, family: MONO });
  }
  chartRows.forEach((row, i) => {
    const ry = outY + i * BAR_ROW;
    let g = text(cx, ry + 17, String(row.year), { size: 13, fill: p.fg, family: MONO });
    if (row.total === 0) {
      g += text(barX, ry + 17, "no commits", { size: 12, fill: p.faint, family: MONO });
    } else {
      let running = 0;
      for (const [language, count] of row.segments ?? []) {
        const sx = barX + Math.round((running / row.total) * barW);
        running += count;
        const ex = barX + Math.round((running / row.total) * barW);
        const pct = Math.round((count / row.total) * 100);
        g += `<rect x="${sx}" y="${ry + 5}" width="${Math.max(0, ex - sx - 1)}" height="16" fill="${esc(colorOf(language))}"><title>${esc(`${row.year} ${language}: ${formatNumber(count)} commits (${pct}%)`)}</title></rect>`;
      }
    }
    g += text(cx + cw, ry + 17, `${formatNumber(row.total)} commits`, { size: 12, fill: p.dim, anchor: "end", family: MONO });
    body += fadeIn(g, 0.1 + i * 0.08);
  });

  // Legend.
  let lx = barX;
  for (const language of [...(legend ?? []), OTHER]) {
    const lw = textWidth(language, 12) + 30;
    if (lx + lw > cx + cw) break;
    body += rect(lx, legendY - 9, 10, 10, colorOf(language), 'rx="2"');
    body += text(lx + 15, legendY, language, { size: 12, fill: p.dim });
    lx += lw;
  }

  // Printed result.
  const moverText = mover
    ? `biggest mover: ${mover.language} ${mover.delta > 0 ? "▲" : "▼"} ${Math.abs(Math.round(mover.delta))}%p since ${mover.since}`
    : "biggest mover: none (shares held steady)";
  body += codeTokens(p, cx, moverY, [["Out[1]: ", "faint"], [moverText, "fg"]], { size: 13, maxWidth: cw });
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `lang-history.ipynb — ${user}`,
    label: `Language history card for ${user}`,
    body
  });
}
