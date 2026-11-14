// Windows 98 "Folder Properties" dialog for the repo card: the repository is the folder,
// its metadata are the General tab rows, commit activity is a small sunken bar chart.
import { C, ICONS, button, etchedH, fit, formatNumber, groupBox, sunken, svgDocument, tabPage, tabs, text, textWidth, windowFrame } from "./kit.js";

const WIDTH = 940;
const HEIGHT = 472;
const ROW_H = 20;

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

// Word-wrap into at most `maxLines` lines; the last line is truncated with an ellipsis.
function wrap(value, maxWidth, size, maxLines) {
  const words = String(value ?? "").split(" ");
  const lines = [];
  let line = "";
  while (words.length) {
    const next = line ? `${line} ${words[0]}` : words[0];
    if (textWidth(next, size) <= maxWidth || !line) {
      line = next;
      words.shift();
      continue;
    }
    if (lines.length === maxLines - 1) break;
    lines.push(line);
    line = "";
  }
  const rest = [line, ...words].filter(Boolean).join(" ");
  lines.push(fit(rest, maxWidth, size));
  return lines;
}

function checkbox(x, y, label, checked) {
  let out = sunken(x, y, 13, 13);
  if (checked) {
    out += `<path d="M${x + 3} ${y + 5}l2 2l4 -4v2l-4 4l-2 -2z" fill="${C.dark}" stroke="${C.dark}" stroke-width="0.6"/>`;
  }
  out += text(x + 19, y + 11, label, { size: 11 });
  return out;
}

export function renderWin98Repo(data, { scale } = {}) {
  const { fullName, owner, name } = data;
  const title = `${name} Properties`;
  const x = 20, y = 20, w = WIDTH - 40, h = HEIGHT - 40;
  const win = windowFrame(x, y, w, h, title, { icon: ICONS.folder, controls: ["help", "close"] });
  const { client } = win;
  let body = win.svg;

  const strip = tabs(client.x + 6, client.y + 6, ["General", "Sharing"], 0);
  const pageX = client.x + 6, pageY = strip.bodyY, pageW = client.w - 12;
  const by = y + h - 4 - 8 - 23;
  const pageH = by - 10 - pageY;
  body += tabPage(pageX, pageY, pageW, pageH, strip.activeX, strip.activeW);
  body += strip.svg;

  // ---- Left column: folder icon, name field, property rows ----
  const lx = pageX + 16;
  const lw = 430;
  body += ICONS.folder(lx, pageY + 8, 2);
  const fieldX = lx + 52, fieldW = lw - 52;
  body += sunken(fieldX, pageY + 16, fieldW, 21);
  body += text(fieldX + 5, pageY + 31, fit(name, fieldW - 10));

  let cy = pageY + 50;
  body += etchedH(lx, cy, lw);
  cy += 8;

  const valueX = lx + 104;
  const valueW = lx + lw - valueX;
  const kinds = [data.fork ? "fork" : null, data.archived ? "archived" : null].filter(Boolean);
  const rows = [
    ["Type:", `Repository folder${kinds.length ? ` (${kinds.join(", ")})` : ""}`],
    ["Location:", `github.com/${owner}`],
    ["Description:", data.description || "No description provided.", data.description ? C.text : C.shadow],
    ["Language:", data.language ? `${data.language}${data.languagePct ? ` (${data.languagePct})` : ""}` : "(none)", data.language ? C.text : C.shadow, data.language ? data.languageColor : null],
    ["License:", data.license || "(none)", data.license ? C.text : C.shadow],
    ["Branch:", data.branch],
    ["Release:", data.release || "(none)", data.release ? C.text : C.shadow],
    ["Pushed:", [data.pushed, formatDate(data.pushedAt)].filter(Boolean).join(", ") || "—"],
    ["Open issues/PRs:", formatNumber(data.openIssues)]
  ];
  rows.forEach(([label, value, fill = C.text, swatch], i) => {
    const ry = cy + i * ROW_H;
    body += `<g class="w98-in" style="animation-delay:${(0.05 + i * 0.04).toFixed(2)}s">`;
    body += text(lx, ry + 14, label, { size: 11 });
    let vx = valueX;
    if (swatch) {
      body += `<rect x="${vx + 0.5}" y="${ry + 4.5}" width="11" height="11" fill="${swatch}" stroke="${C.dark}"/>`;
      vx += 17;
    }
    const lines = label === "Description:" ? wrap(value, valueW, 11, 2) : [fit(value, valueW - (vx - valueX), 11)];
    lines.forEach((line, j) => { body += text(vx, ry + 14 + j * 15, line, { size: 11, fill }); });
    body += "</g>";
    if (lines.length > 1) cy += 15;
  });
  cy += rows.length * ROW_H + 6;
  body += etchedH(lx, cy, lw);
  cy += 8;
  body += text(lx, cy + 14, "Contains:", { size: 11 });
  body += text(valueX, cy + 14, fit(`${formatNumber(data.stars)} Stars, ${formatNumber(data.forks)} Forks, ${formatNumber(data.watchers)} Watchers`, valueW, 11), { size: 11 });
  cy += ROW_H + 6;
  body += etchedH(lx, cy, lw);
  cy += 10;
  body += text(lx, cy + 11, "Attributes:", { size: 11 });
  body += checkbox(valueX, cy, "Archived", data.archived);
  body += checkbox(valueX + 96, cy, "Fork", data.fork);
  body += checkbox(valueX + 172, cy, "Public", true);

  // ---- Right column: topics list box + commit activity chart ----
  const rx0 = lx + lw + 24;
  const rw = pageX + pageW - 16 - rx0;
  const topics = Array.isArray(data.topics) ? data.topics : [];

  const tgY = pageY + 18;
  const tgH = 108;
  body += groupBox(rx0, tgY, rw, tgH, "Topics");
  const lbX = rx0 + 12, lbY = tgY + 18, lbW = rw - 24, lbH = tgH - 30;
  body += sunken(lbX, lbY, lbW, lbH);
  if (topics.length === 0) {
    body += text(lbX + 6, lbY + 16, "(no topics)", { size: 11, fill: C.shadow });
  }
  const perCol = 4;
  const colW = (lbW - 8) / 2;
  topics.slice(0, perCol * 2).forEach((topic, i) => {
    const tx = lbX + 4 + Math.floor(i / perCol) * colW;
    const ty = lbY + 4 + (i % perCol) * 17;
    body += `<g class="w98-in" style="animation-delay:${(0.1 + i * 0.04).toFixed(2)}s">`;
    body += ICONS.document(tx, ty, 1);
    body += text(tx + 18, ty + 12, fit(topic, colW - 22, 11), { size: 11 });
    body += "</g>";
  });

  const agY = tgY + tgH + 18;
  const agH = pageY + pageH - 14 - agY;
  const activity = Array.isArray(data.activity) ? data.activity : null;
  body += groupBox(rx0, agY, rw, agH, "Commit activity");
  const chX = rx0 + 12, chY = agY + 18, chW = rw - 24, chH = agH - 50;
  body += sunken(chX, chY, chW, chH);
  const innerX = chX + 4, innerY = chY + 4, innerW = chW - 8, innerH = chH - 8;
  for (let g = 1; g < 4; g += 1) {
    const gy = Math.round(innerY + (innerH * g) / 4) + 0.5;
    body += `<path d="M${innerX} ${gy}H${innerX + innerW}" stroke="${C.light}"/>`;
  }
  if (activity && activity.length > 0) {
    const weeks = 52;
    const max = Math.max(1, ...activity);
    const slot = innerW / weeks;
    const barW = Math.max(2, Math.floor(slot) - 2);
    activity.forEach((value, i) => {
      if (value <= 0) return;
      const bh = Math.max(2, Math.round((value / max) * (innerH - 2)));
      const bx = Math.round(innerX + (weeks - activity.length + i) * slot + (slot - barW) / 2);
      body += `<rect class="w98-in" style="animation-delay:${(0.2 + i * 0.015).toFixed(3)}s" x="${bx}" y="${innerY + innerH - bh}" width="${barW}" height="${bh}" fill="${C.navy}"/>`;
    });
    const total = activity.reduce((a, v) => a + v, 0);
    body += text(chX, chY + chH + 18, fit(`${formatNumber(total)} commits in the last ${activity.length} weeks`, chW, 11), { size: 11 });
  } else {
    body += text(innerX + innerW / 2, innerY + innerH / 2 + 4, fit("Not available yet", innerW - 8, 11), { size: 11, anchor: "middle", fill: C.shadow });
    body += text(chX, chY + chH + 18, fit("GitHub is still computing statistics.", chW, 11), { size: 11 });
  }

  // Dialog buttons.
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
    label: `GitHub repository card for ${fullName}`,
    body
  });
}
