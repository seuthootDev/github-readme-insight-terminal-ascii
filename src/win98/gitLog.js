// Windows 98 "Explorer, Details view" for the git-log card.
import { C, ICONS, etchedH, etchedV, menuBar, raised, statusBar, sunken, svgDocument, text, columnHeaders, windowFrame, fit, textWidth } from "./kit.js";

const WIDTH = 870;
const ROW_H = 18;

// Explorer-style "Modified" stamp, in UTC so the card is the same wherever it renders.
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()} ${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

function repoLabel(commit, githubId) {
  if (String(commit.ownerLogin).toLowerCase() === String(githubId).toLowerCase()) return commit.repoName;
  return commit.repoFullName;
}

// Small toolbar glyphs drawn with paths (no artwork).
const GLYPHS = {
  back: (x, y) => `<path d="M${x} ${y + 6}l6 -6v4h7v4h-7v4z" fill="${C.dark}"/>`,
  forward: (x, y) => `<path d="M${x + 13} ${y + 6}l-6 -6v4h-7v4h7v4z" fill="${C.disabled}"/>`,
  up: (x, y) => `<path d="M${x + 6} ${y}l6 6h-4v6h-4v-6h-4z" fill="${C.dark}"/>`
};

function toolButton(x, y, label, glyph, { disabled = false } = {}) {
  const w = Math.round(textWidth(label, 11) + (glyph ? 30 : 16));
  let out = raised(x, y, w, 22, { thick: false });
  let tx = x + 8;
  if (glyph) {
    out += GLYPHS[glyph](x + 6, y + 5);
    tx = x + 24;
  }
  if (disabled) {
    out += text(tx + 1, y + 16, label, { size: 11, fill: C.white });
    out += text(tx, y + 15, label, { size: 11, fill: C.disabled });
  } else {
    out += text(tx, y + 15, label, { size: 11 });
  }
  return { svg: out, w };
}

export function renderWin98GitLog(data, { githubId, scale, lines = 8 } = {}) {
  const commits = Array.isArray(data.commits) ? data.commits : [];
  const user = githubId;
  const rowSlots = Math.max(lines, commits.length, 1);
  const repoCount = new Set(commits.map((c) => c.repoFullName)).size;

  const x = 20, y = 20, w = WIDTH - 40;
  const listRowsH = rowSlots * ROW_H + 8;
  const listH = 4 + 18 + listRowsH;
  // title(21) + menu(22) + toolbar(30) + address(28) + list + status(24)
  const h = 9 + 18 + 22 + 30 + 28 + listH + 26;
  const HEIGHT = y + h + 20;

  const title = "Recent Commits - Exploring";
  const win = windowFrame(x, y, w, h, title, { icon: ICONS.folder, controls: ["min", "max", "close"] });
  const { client } = win;
  let body = win.svg;

  // Menu bar.
  let cy = client.y;
  body += menuBar(client.x, cy + 1, ["File", "Edit", "View", "Go", "Favorites", "Help"]);
  cy += 20;
  body += etchedH(client.x, cy, client.w);
  cy += 2;

  // Toolbar row.
  const tbY = cy + 3;
  let tx = client.x + 8;
  body += etchedV(client.x + 2, tbY, 22);
  const groups = [
    [["Back", "back"], ["Forward", "forward", true], ["Up", "up"]],
    [["Cut"], ["Copy"], ["Paste"]],
    [["Undo"], ["Delete"], ["Properties"]],
    [["Views"]]
  ];
  groups.forEach((group, gi) => {
    for (const [label, glyph, disabled] of group) {
      const b = toolButton(tx, tbY, label, glyph, { disabled });
      body += b.svg;
      tx += b.w + 1;
    }
    if (gi < groups.length - 1) {
      body += etchedV(tx + 3, tbY + 1, 20);
      tx += 9;
    }
  });
  cy += 28;
  body += etchedH(client.x, cy, client.w);
  cy += 2;

  // Address bar.
  const adY = cy + 3;
  body += etchedV(client.x + 2, adY, 22);
  body += text(client.x + 10, adY + 15, "Address");
  body += `<path d="M${client.x + 10} ${adY + 17.5}H${client.x + 17}" stroke="${C.text}"/>`;
  const fieldX = client.x + 62, fieldW = client.w - 62 - 4;
  body += sunken(fieldX, adY, fieldW, 22);
  body += ICONS.folder(fieldX + 3, adY + 3);
  const path = `C:\\GitHub\\${user}\\Recent Commits`;
  body += text(fieldX + 23, adY + 15, fit(path, fieldW - 50, 11), { size: 11 });
  // Drop-down arrow button inside the field.
  const ddX = fieldX + fieldW - 18;
  body += raised(ddX, adY + 2, 16, 18);
  body += `<path d="M${ddX + 4} ${adY + 9}h7l-3.5 4z" fill="${C.dark}"/>`;
  cy += 28;

  // List view.
  const lx = client.x, ly = cy, lw = client.w;
  body += sunken(lx, ly, lw, listH);
  const innerW = lw - 4;
  const colHash = 92, colRepo = 170, colDate = 134;
  const colMsg = innerW - colHash - colRepo - colDate;
  const columns = [
    { label: "Hash", w: colHash },
    { label: "Message", w: colMsg },
    { label: "Repository", w: colRepo },
    { label: "Date", w: colDate }
  ];
  body += columnHeaders(lx + 2, ly + 2, columns);
  const rowsTop = ly + 2 + 18 + 3;
  const colX = [lx + 2];
  columns.forEach((c, i) => colX.push(colX[i] + c.w));
  const defs = columns.map((c, i) => `<clipPath id="w98gl-col${i}"><rect x="${colX[i] + 2}" y="${rowsTop}" width="${c.w - 4}" height="${listRowsH}"/></clipPath>`).join("");
  const clip = (i, svg) => `<g clip-path="url(#w98gl-col${i})">${svg}</g>`;

  if (commits.length === 0) {
    body += text(lx + lw / 2, rowsTop + 40, "This folder is empty.", { size: 11, anchor: "middle", fill: C.disabled });
  }
  commits.forEach((commit, i) => {
    const ry = rowsTop + i * ROW_H;
    const base = ry + 13;
    let row = ICONS.document(colX[0] + 4, ry + 1);
    const hash = commit.sha;
    if (i === 0) {
      const selW = Math.ceil(textWidth(hash, 11)) + 6;
      row += `<rect x="${colX[0] + 22}" y="${ry + 1}" width="${selW}" height="${ROW_H - 2}" fill="${C.select}"/>`;
      row += `<rect x="${colX[0] + 22.5}" y="${ry + 1.5}" width="${selW - 1}" height="${ROW_H - 3}" fill="none" stroke="#ffff7f" stroke-dasharray="1 1"/>`;
      row += text(colX[0] + 25, base, hash, { size: 11, fill: C.selectText });
    } else {
      row += text(colX[0] + 25, base, hash, { size: 11 });
    }
    row += clip(1, text(colX[1] + 6, base, fit(commit.message, colMsg - 12, 11), { size: 11 }));
    row += clip(2, text(colX[2] + 6, base, fit(repoLabel(commit, githubId), colRepo - 12, 11), { size: 11 }));
    row += clip(3, text(colX[3] + 6, base, fit(formatDate(commit.date), colDate - 12, 11), { size: 11 }));
    body += `<g class="w98-in" style="animation-delay:${(0.1 + i * 0.06).toFixed(2)}s">${row}</g>`;
  });

  // Status bar.
  const sy = ly + listH + 3;
  body += statusBar(client.x, sy, client.w, [
    { text: `${commits.length} object(s)`, w: 220 },
    { text: `${repoCount} repositor${repoCount === 1 ? "y" : "ies"}`, w: 220 },
    { text: `@${user}` }
  ]);

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title,
    label: `GitHub git log card for ${user}`,
    defs,
    body
  });
}
