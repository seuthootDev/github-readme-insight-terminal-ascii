// Windows 98-era mail client "Inbox" for the pr-issue card (generic chrome, no product branding).
import { C, ICONS, columnHeaders, etchedH, etchedV, menuBar, raised, statusBar, sunken, svgDocument, text, windowFrame, fit, textWidth } from "./kit.js";

const WIDTH = 1030;
const ROW_H = 18;
const STATE_COLORS = { open: "#008000", merged: "#800080", closed: "#c00000", draft: C.shadow };

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()} ${h % 12 || 12}:${m} ${h < 12 ? "AM" : "PM"}`;
}

function repoLabel(item, githubId) {
  if (String(item.ownerLogin).toLowerCase() === String(githubId).toLowerCase()) return item.repoName;
  return item.repoFullName;
}

// 14x14 pull-request glyph: two stacked nodes on the left, one on the right with a hook back.
function prIcon(x, y, color) {
  return `<g fill="none" stroke="${color}" stroke-width="1.5">`
    + `<circle cx="${x + 3.5}" cy="${y + 2.5}" r="2"/><circle cx="${x + 3.5}" cy="${y + 11.5}" r="2"/><circle cx="${x + 10.5}" cy="${y + 11.5}" r="2"/>`
    + `<path d="M${x + 3.5} ${y + 4.5}V${y + 9.5}M${x + 10.5} ${y + 9.5}V${y + 4.5}Q${x + 10.5} ${y + 2.5} ${x + 8.5} ${y + 2.5}H${x + 6.5}"/>`
    + `</g><path d="M${x + 6} ${y + 2.5}l2.5 -2.2v4.4z" fill="${color}"/>`;
}

// 14x14 issue glyph: ring with a centre dot.
function issueIcon(x, y, color) {
  return `<circle cx="${x + 7}" cy="${y + 7}" r="5.5" fill="none" stroke="${color}" stroke-width="1.5"/><circle cx="${x + 7}" cy="${y + 7}" r="1.8" fill="${color}"/>`;
}

const TOOL_ICONS = {
  envelope: (x, y) => ICONS.envelope(x, y),
  reply: (x, y) => ICONS.envelope(x, y) + `<path d="M${x - 1} ${y + 13}l4 -3v2h5v2h-5v2z" fill="#800080"/>`,
  replyAll: (x, y) => ICONS.envelope(x, y) + `<path d="M${x - 1} ${y + 13}l4 -3v2h5v2h-5v2z" fill="#800080"/><path d="M${x - 1} ${y + 9}l3 -2v4z" fill="#800080"/>`,
  forward: (x, y) => ICONS.envelope(x, y) + `<path d="M${x + 17} ${y + 13}l-4 -3v2h-5v2h5v2z" fill="#000080"/>`,
  print: (x, y) => `<rect x="${x + 4}" y="${y + 1}" width="8" height="6" fill="${C.white}" stroke="${C.dark}"/>`
    + raised(x, y + 6, 16, 7, { thick: false }) + `<rect x="${x + 4}" y="${y + 11}" width="8" height="4" fill="${C.white}" stroke="${C.dark}"/>`,
  delete: (x, y) => `<path d="M${x + 3} ${y + 3}l10 10M${x + 13} ${y + 3}l-10 10" stroke="${C.dark}" stroke-width="2.5"/>`,
  sendRecv: (x, y) => ICONS.envelope(x, y) + `<path d="M${x + 12} ${y + 1}l3 3h-2v3h-2v-3h-2z" fill="#008000"/>`,
  addresses: (x, y) => ICONS.document(x, y),
  find: (x, y) => `<circle cx="${x + 6}" cy="${y + 6}" r="4" fill="${C.white}" stroke="${C.dark}" stroke-width="1.5"/><path d="M${x + 9} ${y + 9}l5 5" stroke="${C.dark}" stroke-width="2.5"/>`
};

// Flat toolbar button: icon above caption, like the big-button toolbars of the era.
function toolButton(x, y, label, icon, { hot = false } = {}) {
  const w = Math.max(48, Math.round(textWidth(label, 11) + 14));
  let out = hot ? raised(x, y, w, 38, { thick: false }) : "";
  out += TOOL_ICONS[icon](x + w / 2 - 8, y + 4);
  out += text(x + w / 2, y + 33, label, { size: 11, anchor: "middle" });
  return { svg: out, w };
}

function treeItem(x, y, label, icon, { selected = false, bold = false, count } = {}) {
  let out = icon(x, y + 1);
  const lx = x + 20;
  const weight = bold ? 700 : undefined;
  const labelW = textWidth(label, 11, bold) + (count != null ? textWidth(` (${count})`, 11, bold) : 0);
  if (selected) {
    out += `<rect x="${lx - 2}" y="${y + 1}" width="${Math.ceil(labelW) + 5}" height="16" fill="${C.select}"/>`;
  }
  const fill = selected ? C.selectText : C.text;
  out += `<text x="${lx}" y="${y + 13}" font-size="11" font-family="Tahoma, 'MS Sans Serif', 'Segoe UI', Geneva, Verdana, sans-serif" fill="${fill}"${weight ? ` font-weight="${weight}"` : ""}>${label}${count != null ? `<tspan fill="${selected ? C.selectText : "#0000ff"}"> (${count})</tspan>` : ""}</text>`;
  return out;
}

export function renderWin98PrIssue(data, { githubId, scale, lines = 8 } = {}) {
  const items = Array.isArray(data.items) ? data.items : [];
  const totalCount = Number(data.totalCount ?? items.length);
  const user = githubId;
  const rowSlots = Math.max(lines, items.length, 1);
  const unread = items.filter((it) => it.state === "open" || it.state === "draft").length;

  const x = 20, y = 20, w = WIDTH - 40;
  const listH = 4 + 18 + rowSlots * ROW_H + 6;
  const previewH = 92;
  const mainH = listH + 4 + previewH;
  // frame+title(27) + menu(22) + toolbar(44) + folder bar(30) + main + status(25)
  const h = 27 + 22 + 44 + 30 + mainH + 27;
  const HEIGHT = y + h + 20;

  const title = "Inbox - GitHub Mail";
  const win = windowFrame(x, y, w, h, title, { icon: ICONS.envelope, controls: ["min", "max", "close"] });
  const { client } = win;
  let body = win.svg;

  // Menu bar.
  let cy = client.y;
  body += menuBar(client.x, cy + 1, ["File", "Edit", "View", "Tools", "Message", "Help"]);
  cy += 20;
  body += etchedH(client.x, cy, client.w);
  cy += 2;

  // Big-button toolbar.
  const tbY = cy + 3;
  body += etchedV(client.x + 2, tbY, 38);
  let tx = client.x + 8;
  const groups = [
    [["New Mail", "envelope", true]],
    [["Reply", "reply"], ["Reply All", "replyAll"], ["Forward", "forward"]],
    [["Print", "print"], ["Delete", "delete"]],
    [["Send/Recv", "sendRecv"]],
    [["Addresses", "addresses"], ["Find", "find"]]
  ];
  groups.forEach((group, gi) => {
    for (const [label, icon, hot] of group) {
      const b = toolButton(tx, tbY, label, icon, { hot });
      body += b.svg;
      tx += b.w + 2;
    }
    if (gi < groups.length - 1) {
      body += etchedV(tx + 2, tbY + 2, 34);
      tx += 8;
    }
  });
  cy += 44;
  body += etchedH(client.x, cy, client.w);
  cy += 2;

  // Folder name bar.
  const fbY = cy + 2;
  body += `<rect x="${client.x}" y="${fbY}" width="${client.w}" height="24" fill="${C.shadow}"/>`;
  body += text(client.x + 10, fbY + 17, "Inbox", { size: 14, weight: 700, fill: C.white });
  cy += 30;

  // Folder pane.
  const paneW = 196;
  const px = client.x, py = cy;
  body += raised(px, py, paneW, 20, { thick: false });
  body += text(px + 6, py + 14, "Folders", { size: 11 });
  body += `<path d="M${px + paneW - 14} ${py + 7}l6 6M${px + paneW - 8} ${py + 7}l-6 6" stroke="${C.dark}" stroke-width="1.2"/>`;
  const treeY = py + 22, treeH = mainH - 22;
  body += sunken(px, treeY, paneW, treeH);
  const tl = px + 8;
  let ty = treeY + 6;
  body += treeItem(tl, ty, "GitHub Mail", ICONS.computer);
  ty += 20;
  body += treeItem(tl + 18, ty, "Local Folders", ICONS.folder);
  const folders = [
    ["Inbox", ICONS.envelope, { selected: true, bold: unread > 0, count: unread > 0 ? unread : undefined }],
    ["Outbox", ICONS.folder, {}],
    ["Sent Items", ICONS.folder, {}],
    ["Deleted Items", ICONS.folder, {}],
    ["Drafts", ICONS.folder, {}]
  ];
  // Dotted tree lines.
  const lineX = tl + 26.5;
  const lastY = ty + 20 * folders.length + 9;
  body += `<path d="M${tl + 8.5} ${treeY + 24}V${ty + 9}H${tl + 17}" stroke="${C.shadow}" stroke-dasharray="1 1" fill="none"/>`;
  body += `<path d="M${lineX} ${ty + 18}V${lastY}" stroke="${C.shadow}" stroke-dasharray="1 1" fill="none"/>`;
  folders.forEach(([label, icon, opts], i) => {
    const fy = ty + 20 * (i + 1);
    body += `<path d="M${lineX} ${fy + 9.5}H${tl + 35}" stroke="${C.shadow}" stroke-dasharray="1 1"/>`;
    body += treeItem(tl + 36, fy, label, icon, opts);
  });

  // Message list.
  const lx = px + paneW + 4, ly = cy, lw = client.x + client.w - lx;
  body += sunken(lx, ly, lw, listH);
  const innerW = lw - 4;
  const colBang = 20, colType = 24, colRepo = 230, colDate = 134;
  const colSubj = innerW - colBang - colType - colRepo - colDate;
  const columns = [
    { label: "!", w: colBang },
    { label: "", w: colType },
    { label: "Repository", w: colRepo },
    { label: "Subject", w: colSubj },
    { label: "Received", w: colDate }
  ];
  body += columnHeaders(lx + 2, ly + 2, columns);
  const colX = [lx + 2];
  columns.forEach((c, i) => colX.push(colX[i] + c.w));
  const listRowsTop = ly + 22;
  const defs = columns.map((c, i) => `<clipPath id="w98pr-col${i}"><rect x="${colX[i] + 2}" y="${listRowsTop}" width="${c.w - 4}" height="${listH - 24}"/></clipPath>`).join("");
  const clip = (i, svg) => `<g clip-path="url(#w98pr-col${i})">${svg}</g>`;
  // Header glyph for the type column: a tiny envelope.
  body += `<rect x="${colX[1] + 7.5}" y="${ly + 7.5}" width="9" height="7" fill="${C.white}" stroke="${C.dark}"/><path d="M${colX[1] + 7.5} ${ly + 7.5}l4.5 4l4.5 -4" stroke="${C.dark}" fill="none"/>`;

  const rowsTop = ly + 2 + 18 + 2;
  if (items.length === 0) {
    body += text(lx + lw / 2, rowsTop + 30, "There are no items in this view.", { size: 11, anchor: "middle", fill: C.disabled });
  }
  items.forEach((item, i) => {
    const ry = rowsTop + i * ROW_H;
    const base = ry + 13;
    const selected = i === 0;
    const fg = selected ? C.selectText : C.text;
    const bold = item.state === "open" || item.state === "draft";
    let row = "";
    if (selected) row += `<rect x="${lx + 2}" y="${ry}" width="${innerW}" height="${ROW_H}" fill="${C.select}"/>`;
    if (item.kind === "issue" && item.state === "open") {
      row += text(colX[0] + colBang / 2, base, "!", { size: 11, weight: 700, anchor: "middle", fill: selected ? fg : "#ff0000" });
    } else if (item.state === "draft") {
      row += `<path d="M${colX[0] + 10} ${ry + 14}l-3.5 -4h2v-6h3v6h2z" fill="${selected ? fg : "#0000ff"}"/>`;
    }
    const color = selected ? C.selectText : (STATE_COLORS[item.state] ?? C.text);
    row += item.kind === "PR" ? prIcon(colX[1] + 5, ry + 2, color) : issueIcon(colX[1] + 5, ry + 2, color);
    const weight = bold ? 700 : undefined;
    row += clip(2, text(colX[2] + 6, base, fit(repoLabel(item, githubId), colRepo - 12, 11, bold), { size: 11, weight, fill: fg }));
    row += clip(3, text(colX[3] + 6, base, fit(`#${item.number} ${item.title}`, colSubj - 12, 11, bold), { size: 11, weight, fill: fg }));
    row += clip(4, text(colX[4] + 6, base, fit(formatDate(item.date), colDate - 12, 11, bold), { size: 11, weight, fill: fg }));
    body += `<g class="w98-in" style="animation-delay:${(0.1 + i * 0.06).toFixed(2)}s">${row}</g>`;
  });

  // Preview pane for the selected message.
  const pvY = ly + listH + 4;
  body += sunken(lx, pvY, lw, previewH);
  const first = items[0];
  const hdrH = 48;
  body += `<rect x="${lx + 2}" y="${pvY + 2}" width="${lw - 4}" height="${hdrH}" fill="${C.face}"/>`;
  body += `<path d="M${lx + 2} ${pvY + 2 + hdrH - 0.5}H${lx + lw - 2}" stroke="${C.shadow}"/>`;
  const fields = first
    ? [["From:", user], ["To:", first.repoFullName], ["Subject:", `${first.kind === "PR" ? "Pull request" : "Issue"} #${first.number}: ${first.title}`]]
    : [["From:", user], ["To:", ""], ["Subject:", ""]];
  fields.forEach(([label, value], i) => {
    const fy = pvY + 15 + i * 14;
    body += text(lx + 10, fy, label, { size: 11, weight: 700 });
    body += text(lx + 64, fy, fit(value, lw - 84, 11), { size: 11 });
  });
  if (first) {
    const color = STATE_COLORS[first.state] ?? C.text;
    const by = pvY + hdrH + 22;
    body += first.kind === "PR" ? prIcon(lx + 10, by - 11, color) : issueIcon(lx + 10, by - 11, color);
    const stateWord = first.state.charAt(0).toUpperCase() + first.state.slice(1);
    const lead = `This ${first.kind === "PR" ? "pull request" : "issue"} is `;
    body += `<text x="${lx + 30}" y="${by}" font-size="11" font-family="Tahoma, 'MS Sans Serif', 'Segoe UI', Geneva, Verdana, sans-serif" fill="${C.text}">${lead}<tspan font-weight="700" fill="${color}">${stateWord}</tspan>. Last updated ${formatDate(first.date)}.</text>`;
  } else {
    body += text(lx + 10, pvY + hdrH + 22, "No message selected.", { size: 11, fill: C.disabled });
  }

  // Status bar.
  const counts = ["open", "draft", "merged", "closed"]
    .map((state) => ({ state, n: items.filter((it) => it.state === state).length }))
    .filter(({ n }) => n > 0)
    .map(({ state, n }) => `${n} ${state}`)
    .join(", ");
  const sy = pvY + previewH + 3;
  body += statusBar(client.x, sy, client.w, [
    { text: `${items.length} message(s), ${totalCount.toLocaleString("en-US")} total`, w: 260 },
    { text: counts || "0 results", w: 360 },
    { text: "Working Online" }
  ]);

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title,
    label: `GitHub pull requests and issues card for ${user}`,
    defs,
    body
  });
}
