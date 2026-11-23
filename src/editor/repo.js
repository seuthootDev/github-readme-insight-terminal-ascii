// Editor theme, repo card: the repository rendered as a Markdown preview of its README-style summary.
import { MONO, editorWindow, fadeIn, fit, formatNumber, hline, palette, rect, shortDate, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const WIDTH = 880;

function wrap(value, maxWidth, size, maxLines = 2) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  while (words.length && lines.length < maxLines) {
    let line = "";
    while (words.length && textWidth(`${line} ${words[0]}`.trim(), size) <= maxWidth) line = `${line} ${words.shift()}`.trim();
    if (!line) line = words.shift();
    lines.push(line);
  }
  if (words.length) lines[lines.length - 1] = fit(`${lines[lines.length - 1]} ${words.join(" ")}`, maxWidth, size);
  return lines;
}

// shields-style badge: grey label half, coloured value half.
function badge(x, y, label, value, color) {
  const lw = textWidth(label, 11) + 12;
  const vw = textWidth(value, 11) + 12;
  return {
    svg: `<g><rect x="${x}" y="${y}" width="${lw + vw}" height="20" rx="3" fill="#555"/><rect x="${x + lw}" y="${y}" width="${vw}" height="20" rx="3" fill="${color}"/><rect x="${x + lw}" y="${y}" width="4" height="20" fill="${color}"/>`
      + text(x + lw / 2, y + 14, label, { size: 11, fill: "#ffffff", anchor: "middle" })
      + text(x + lw + vw / 2, y + 14, value, { size: 11, fill: "#ffffff", anchor: "middle" }) + "</g>",
    w: lw + vw
  };
}

export function renderEditorRepo(data, { githubId, scale, scheme, ide } = {}) {
  const p = palette(scheme, ide);
  const repoName = data.name || data.fullName;
  const x0 = 20 + 44 + 36;
  const contentW = WIDTH - 20 - x0 - 36;
  const descLines = wrap(data.description || "No description provided.", contentW, 14);
  const topics = Array.isArray(data.topics) ? data.topics : [];
  const activity = Array.isArray(data.activity) && data.activity.length > 0 ? data.activity.slice(-52) : null;

  // Vertical layout of the preview.
  const top = 20 + 30 + 35;
  const yTitle = top + 44;
  const yDesc = yTitle + 34;
  const yBadges = yDesc + (descLines.length - 1) * 22 + 20;
  const ySections = yBadges + 50;
  const yActivity = ySections + 22 + 6 * 24 + 44;
  const HEIGHT = yActivity + 110 + 22 + 20;

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `Preview README.md — ${data.fullName}`,
    active: "explorer",
    tabs: [{ label: "README.md", badge: "md" }, { label: "Preview README.md", badge: "md", active: true, preview: true }],
    status: {
      left: [{ text: `⎇ ${data.branch || "main"}` }, { text: "⊗ 0  ⚠ 0" }],
      right: [{ text: `★ ${formatNumber(data.stars)}` }, { text: data.language || "Markdown" }, { text: "Markdown Preview" }]
    }
  });
  let body = win.svg;

  // Title + description.
  body += text(x0, yTitle, fit(repoName, contentW, 26, true), { size: 26, weight: 600, fill: p.fg });
  body += hline(x0, yTitle + 12, contentW, p.line);
  descLines.forEach((line, i) => {
    body += text(x0, yDesc + i * 22, line, { size: 14, fill: data.description ? p.fg : p.dim });
  });

  // Badges.
  const badges = [
    ["stars", compactNum(data.stars), "#dfb317"],
    ["forks", compactNum(data.forks), "#007ec6"],
    ["license", data.license || "none", data.license ? "#97ca00" : "#9f9f9f"],
    ["release", data.release ? data.release.split(" ")[0] : "none", data.release ? "#007ec6" : "#9f9f9f"],
    [data.language || "language", data.language ? (data.languagePct || "—") : "none", data.languageColor || "#9f9f9f"]
  ];
  if (data.archived) badges.push(["status", "archived", "#e05d44"]);
  let bx = x0;
  badges.forEach(([label, value, color], i) => {
    const b = badge(bx, yBadges, label, value, color);
    if (bx + b.w <= x0 + contentW) body += fadeIn(b.svg, 0.05 + i * 0.05);
    bx += b.w + 8;
  });

  // Two sections: details table and topics.
  const colW = (contentW - 32) / 2;
  body += text(x0, ySections, "Details", { size: 18, weight: 600, fill: p.fg });
  body += hline(x0, ySections + 9, colW, p.line);
  const rows = [
    ["Repository", data.fullName],
    ["Default branch", data.branch || "main"],
    ["Last push", [data.pushed, shortDate(data.pushedAt)].filter(Boolean).join(" · ") || "—"],
    ["Open issues / PRs", formatNumber(data.openIssues)],
    ["Watchers", formatNumber(data.watchers)],
    ["Fork", data.fork ? "yes" : "no"]
  ];
  rows.forEach(([k, v], i) => {
    const ry = ySections + 22 + i * 24;
    if (i % 2 === 0) body += rect(x0, ry, colW, 24, p.hover);
    body += text(x0 + 8, ry + 16, k, { size: 13, fill: p.dim });
    body += text(x0 + colW - 8, ry + 16, fit(v, colW - 150, 13), { size: 13, fill: p.fg, anchor: "end" });
  });

  const tx0 = x0 + colW + 32;
  body += text(tx0, ySections, "Topics", { size: 18, weight: 600, fill: p.fg });
  body += hline(tx0, ySections + 9, colW, p.line);
  if (topics.length === 0) {
    body += text(tx0, ySections + 38, "No topics yet.", { size: 13, fill: p.dim });
  }
  let cx = tx0, cy = ySections + 24;
  for (const topic of topics) {
    const tw = textWidth(topic, 12) + 20;
    if (cx + tw > tx0 + colW) { cx = tx0; cy += 30; }
    if (cy > ySections + 140) break;
    body += rect(cx, cy, tw, 22, p.name === "light" ? "#ddf4ff" : "rgba(56,139,253,0.15)", 'rx="11"');
    body += text(cx + tw / 2, cy + 15, topic, { size: 12, fill: p.link, anchor: "middle" });
    cx += tw + 6;
  }

  // Commit activity: 52 weekly bars.
  body += text(x0, yActivity, "Commit activity", { size: 18, weight: 600, fill: p.fg });
  body += hline(x0, yActivity + 9, contentW, p.line);
  const chartY = yActivity + 24, chartH = 56;
  if (activity) {
    const max = Math.max(1, ...activity);
    const step = contentW / activity.length;
    let bars = "";
    activity.forEach((n, i) => {
      const h = n > 0 ? Math.max(3, (n / max) * chartH) : 1;
      bars += rect(x0 + i * step + 1, chartY + chartH - h, Math.max(1, step - 3), h, n > 0 ? p.lanes[2] : p.line, 'rx="1"');
    });
    body += fadeIn(bars, 0.2);
    const totalCommits = activity.reduce((a, b) => a + b, 0);
    body += text(x0, chartY + chartH + 20, `${formatNumber(totalCommits)} commits in the last 52 weeks`, { size: 12, fill: p.dim });
    body += text(x0 + contentW, chartY + chartH + 20, "weekly", { size: 12, fill: p.faint, anchor: "end", family: MONO });
  } else {
    body += text(x0, chartY + 24, "Commit activity is still being computed by GitHub.", { size: 13, fill: p.dim });
  }
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `${data.fullName} — README preview`,
    label: `GitHub repository card for ${data.fullName}`,
    body
  });
}

function compactNum(n) {
  const v = Number(n ?? 0);
  return v >= 1000 ? `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(v);
}
