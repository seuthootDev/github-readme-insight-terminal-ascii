// Editor theme, top languages: the "Select Language Mode" quick pick, one item per language.
import { codeBlock, editorWindow, fadeIn, fit, formatNumber, palette, rect, svgDocument, text, windowEnd } from "./kit.js";

const WIDTH = 780;
const ROW_H = 26;

function humanSize(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = Number(bytes ?? 0);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return i === 0 ? `${formatNumber(Math.round(v))} B` : `${v.toFixed(1)} ${units[i]}`;
}

// Faded code behind the quick pick.
const BACKDROP = [
  { tokens: [["import", "ctl"], [" { languages } ", "fg"], ["from", "ctl"], [" ", "fg"], ['"./github"', "str"], [";", "fg"]] },
  { tokens: [] },
  { tokens: [["export async function", "kw"], [" ", "fg"], ["topLanguages", "fn"], ["(", "fg"], ["login", "prop"], [") {", "fg"]] },
  { tokens: [["  const", "kw"], [" repos = ", "fg"], ["await", "ctl"], [" ", "fg"], ["fetchRepos", "fn"], ["(login);", "fg"]] },
  { tokens: [["  return", "ctl"], [" ", "fg"], ["languages", "fn"], ["(repos).", "fg"], ["sort", "fn"], ["((a, b) => b.", "fg"], ["bytes", "prop"], [" - a.", "fg"], ["bytes", "prop"], [");", "fg"]] },
  { tokens: [["}", "fg"]] }
];

export function renderEditorTopLang(data, { githubId, scale, scheme } = {}) {
  const p = palette(scheme);
  const user = data.login || githubId;
  const unit = data.sizeUnit ?? 1;
  const rows = (Array.isArray(data.rows) ? data.rows : []).map((row) => ({
    label: row.language ?? row.label ?? "", color: row.color, pct: Number(row.pct ?? 0), bytes: Number(row.size ?? 0) * unit
  }));
  // The top-N rows are a share of everything; scale the first one up to get the total.
  const totalBytes = rows.length > 0 && rows[0].pct > 0 ? rows[0].bytes / (rows[0].pct / 100) : 0;
  const itemCount = Math.max(rows.length, 2);

  const pickW = 560;
  const pickH = 10 + 28 + 8 + 22 + itemCount * ROW_H + 8;
  const editorH = Math.max(150, 16 + pickH + 22);
  const HEIGHT = 20 + 30 + 35 + editorH + 22 + 20;

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `languages.ts — ${user}`,
    active: "explorer",
    tabs: [{ label: "languages.ts", badge: "ts", active: true }],
    status: {
      left: [{ text: "⎇ main" }, { text: `${rows.length} language${rows.length === 1 ? "" : "s"}` }],
      right: [{ text: rows.length ? `Total ${humanSize(totalBytes)}` : "No data" }, { text: "Select Language Mode", color: p.fg }]
    }
  });
  const e = win.regions.editor;
  let body = win.svg;
  body += `<g opacity="0.45">${codeBlock(p, e.x, e.y + 8, e.w, BACKDROP, { size: 13, lineH: 20 })}</g>`;

  // Quick pick widget.
  const qx = e.x + Math.round((e.w - pickW) / 2), qy = e.y + 8;
  body += `<rect x="${qx - 1}" y="${qy + 2}" width="${pickW + 2}" height="${pickH + 2}" rx="7" fill="${p.shadow}"/>`;
  body += rect(qx, qy, pickW, pickH, p.widget, `rx="6" stroke="${p.line}"`);
  body += rect(qx + 8, qy + 10, pickW - 16, 28, p.input, `rx="3" stroke="${p.accent}"`);
  body += text(qx + 16, qy + 29, "Select Language Mode", { size: 13, fill: p.faint });
  body += text(qx + pickW - 18, qy + 29, `top ${rows.length}`, { size: 12, fill: p.faint, anchor: "end" });
  body += text(qx + 14, qy + 62, `languages of @${user}, by bytes of code`, { size: 11, fill: p.dim });

  const listY = qy + 46 + 22;
  if (rows.length === 0) {
    const [emptyText, hintText] = data.emptyLines ?? ["No language data found", ""];
    body += rect(qx + 4, listY, pickW - 8, ROW_H, p.sel, 'rx="3"');
    body += text(qx + 16, listY + 17, fit(emptyText, pickW - 32), { fill: p.fg });
    if (hintText) body += text(qx + 16, listY + ROW_H + 17, fit(hintText, pickW - 32), { fill: p.dim, size: 12 });
  }
  const pctMax = Math.max(1, ...rows.map((row) => row.pct));
  rows.forEach((row, i) => {
    const ry = listY + i * ROW_H;
    let item = "";
    if (i === 0) item += rect(qx + 4, ry, pickW - 8, ROW_H, p.sel, 'rx="3"');
    item += `<circle cx="${qx + 20}" cy="${ry + 13}" r="5" fill="${row.color}"/>`;
    item += text(qx + 34, ry + 17.5, fit(row.label, 150), { size: 13, fill: p.fg });
    item += text(qx + 190, ry + 17.5, humanSize(row.bytes), { size: 12, fill: p.dim });
    const bx = qx + 270, bw = pickW - 270 - 76;
    item += rect(bx, ry + 10, bw, 6, p.chip, 'rx="3"');
    item += rect(bx, ry + 10, Math.max(3, (row.pct / pctMax) * bw), 6, row.color, 'rx="3"');
    item += text(qx + pickW - 16, ry + 17.5, `${row.pct.toFixed(1)}%`, { size: 12, fill: p.fg, anchor: "end", family: "Consolas, Menlo, monospace" });
    body += fadeIn(item, 0.05 + i * 0.05);
  });
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `Select Language Mode — ${user}`,
    label: `Top languages card for ${user}`,
    body
  });
}
