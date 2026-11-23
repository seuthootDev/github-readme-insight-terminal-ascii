// Editor theme, PRs & issues card: a pull-request view in the sidebar (PRs and issues as trees)
// with the newest item open in the editor.
import { editorWindow, fadeIn, fit, formatNumber, palette, pill, rect, relativeTime, sectionHeader, shortDate, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const WIDTH = 920;
const SIDE_W = 400;
const ROW_H = 24;
const STATE_LABEL = { open: "Open", draft: "Draft", merged: "Merged", closed: "Closed" };

function repoLabel(item, githubId) {
  if (String(item.ownerLogin).toLowerCase() === String(githubId).toLowerCase()) return item.repoName;
  return item.repoFullName;
}

// PR glyph (two nodes joined by a branch line) and issue glyph (ring with a dot), in the state colour.
function prGlyph(x, y, color, state) {
  if (state === "merged") {
    return `<g fill="none" stroke="${color}" stroke-width="1.5"><circle cx="${x + 3}" cy="${y + 2.5}" r="2"/><circle cx="${x + 3}" cy="${y + 12.5}" r="2"/><circle cx="${x + 11}" cy="${y + 8}" r="2"/><path d="M${x + 3} ${y + 4.5}v6M${x + 3} ${y + 5}c0 3 3 3 6 3"/></g>`;
  }
  return `<g fill="none" stroke="${color}" stroke-width="1.5"><circle cx="${x + 3}" cy="${y + 2.5}" r="2"/><circle cx="${x + 3}" cy="${y + 12.5}" r="2"/><circle cx="${x + 11}" cy="${y + 12.5}" r="2"/><path d="M${x + 3} ${y + 4.5}v6M${x + 11} ${y + 10.5}V${y + 5}a2 2 0 0 0-2-2h-3"/></g>`;
}

function issueGlyph(x, y, color, state) {
  const inner = state === "closed"
    ? `<path d="M${x + 4.5} ${y + 7.5}l2 2 3.5-4" fill="none" stroke="${color}" stroke-width="1.5"/>`
    : `<circle cx="${x + 7}" cy="${y + 7.5}" r="1.6" fill="${color}"/>`;
  return `<circle cx="${x + 7}" cy="${y + 7.5}" r="6" fill="none" stroke="${color}" stroke-width="1.5"/>${inner}`;
}

// Up to two lines, the second cut with an ellipsis (semibold text runs ~8% wider).
// A word too long for the rest of a short first line is split mid-word instead of leaving
// the line almost empty.
function wrapTitle(title, maxWidth, size) {
  const words = String(title ?? "").split(" ");
  let first = "";
  while (words.length && textWidth(`${first} ${words[0]}`.trim(), size, true) <= maxWidth) first = `${first} ${words.shift()}`.trim();
  if (words.length && textWidth(first, size, true) < maxWidth * 0.5) {
    const chars = [...words.shift()];
    let head = first ? `${first} ` : "";
    let taken = 0;
    while (taken < chars.length && textWidth(head + chars.slice(0, taken + 1).join(""), size, true) <= maxWidth) taken += 1;
    // Prefer breaking right after a hyphen when one fits.
    const hyphen = chars.slice(0, taken).lastIndexOf("-");
    if (hyphen > 0) taken = hyphen + 1;
    first = head + chars.splice(0, taken).join("");
    if (chars.length) words.unshift(chars.join(""));
  }
  return words.length ? [first, fit(words.join(" "), maxWidth, size, true)] : [first];
}

function glyph(item, x, y, p) {
  const color = p.states[item.state] ?? p.dim;
  return item.kind === "PR" ? prGlyph(x, y, color, item.state) : issueGlyph(x, y, color, item.state);
}

export function renderEditorPrIssue(data, { githubId, scale, scheme, lines = 8 } = {}) {
  const p = palette(scheme);
  const items = Array.isArray(data.items) ? data.items : [];
  const totalCount = Number(data.totalCount ?? items.length);
  const user = githubId;
  const now = Date.now();
  const prs = items.filter((it) => it.kind === "PR");
  const issues = items.filter((it) => it.kind !== "PR");
  const slots = Math.max(lines, items.length, 3);

  const listH = 2 * 22 + slots * ROW_H + 10;
  const mainH = Math.max(320, 35 + listH);
  const HEIGHT = 20 + 30 + mainH + 22 + 20;
  const head = items[0];

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: head ? `${head.kind === "PR" ? "Pull Request" : "Issue"} #${head.number} — ${repoLabel(head, user)}` : `GitHub — ${user}`,
    active: "pr",
    extraActivity: ["pr"],
    side: SIDE_W,
    sideTitle: "GITHUB",
    tabs: head ? [{ label: `${head.kind === "PR" ? "Pull Request" : "Issue"} #${head.number}`, badge: "gh", active: true }] : [],
    status: {
      left: [{ text: "⎇ main" }, { text: `${formatNumber(prs.length)} PRs · ${formatNumber(issues.length)} issues` }],
      right: [{ text: `${items.length} of ${formatNumber(totalCount)}` }, { text: `@${user}` }]
    }
  });
  const s = win.regions.side;
  const e = win.regions.editor;
  let body = win.svg;

  let y = s.y - 13;
  let order = 0;
  for (const [label, group] of [["PULL REQUESTS", prs], ["ISSUES", issues]]) {
    body += sectionHeader(p, s.x, y, s.w, label, { badge: group.length });
    y += 24;
    if (group.length === 0) {
      body += text(s.x + 30, y + 15, "Nothing recent.", { size: 12, fill: p.faint });
      y += ROW_H;
    }
    for (const item of group) {
      const selected = item === head;
      const when = relativeTime(item.date, now);
      const repo = fit(repoLabel(item, user), 110, 12);
      const right = textWidth(when, 12) + textWidth(repo, 12) + 22;
      let row = "";
      if (selected) row += rect(s.x + 1, y, s.w - 2, ROW_H, p.sel);
      row += glyph(item, s.x + 22, y + 4, p);
      const title = fit(`#${item.number} ${item.title}`, s.w - 46 - right - 12, 13);
      row += text(s.x + 44, y + 16.5, title, { size: 13, fill: item.state === "closed" ? p.dim : p.fg });
      row += text(s.x + s.w - 14 - textWidth(when, 12) - 8, y + 16.5, repo, { size: 12, fill: p.faint, anchor: "end" });
      row += text(s.x + s.w - 14, y + 16.5, when, { size: 12, fill: p.faint, anchor: "end" });
      body += fadeIn(row, 0.05 + order * 0.05);
      order += 1;
      y += ROW_H;
    }
    y += 4;
  }

  // Editor: overview of the newest item, then the state breakdown.
  if (head) {
    const x = e.x + 28, w = e.w - 56;
    let ey = e.y + 38;
    for (const line of wrapTitle(head.title, w, 19)) {
      body += text(x, ey, line, { size: 19, weight: 600, fill: p.fg });
      ey += 26;
    }
    ey -= 8;
    const color = p.states[head.state] ?? p.dim;
    const badge = pill(p, x, ey, `${head.kind === "PR" ? "⑂" : "◉"} ${STATE_LABEL[head.state] ?? head.state}`, { bg: color, size: 12, h: 22 });
    body += badge.svg;
    body += text(x + badge.w + 10, ey + 15.5, fit(`#${head.number} in ${head.repoFullName}`, w - badge.w - 10, 13), { size: 13, fill: p.dim });
    body += text(x, ey + 44, `Updated ${shortDate(head.date)} by @${user}`, { size: 12, fill: p.faint });
    ey += 62;
    body += `<path d="M${x} ${ey}H${x + w}" stroke="${p.line}"/>`;
    ey += 26;
    body += text(x, ey, "Recent activity", { size: 13, weight: 600, fill: p.fg });
    ey += 14;
    const counts = ["open", "draft", "merged", "closed"].map((state) => ({
      state,
      prs: prs.filter((it) => it.state === state).length,
      issues: issues.filter((it) => it.state === state).length
    })).filter((c) => c.prs + c.issues > 0);
    const maxN = Math.max(1, ...counts.map((c) => c.prs + c.issues));
    counts.forEach((c, i) => {
      const ry = ey + 10 + i * 26;
      const n = c.prs + c.issues;
      let row = `<circle cx="${x + 5}" cy="${ry + 8}" r="4.5" fill="${p.states[c.state]}"/>`;
      row += text(x + 18, ry + 12.5, STATE_LABEL[c.state], { size: 13, fill: p.fg });
      const bx = x + 90, bw = w - 90 - 150;
      row += rect(bx, ry + 4, bw, 8, p.chip, 'rx="4"');
      row += rect(bx, ry + 4, Math.max(8, (n / maxN) * bw), 8, p.states[c.state], 'rx="4"');
      row += text(x + w, ry + 12.5, `${c.prs} PR${c.prs === 1 ? "" : "s"} · ${c.issues} issue${c.issues === 1 ? "" : "s"}`, { size: 12, fill: p.dim, anchor: "end" });
      body += fadeIn(row, 0.3 + i * 0.06);
    });
    const fy = ey + 10 + counts.length * 26 + 18;
    if (fy < e.y + e.h - 10) {
      body += text(x, fy, `${formatNumber(totalCount)} pull requests and issues by @${user} in total`, { size: 12, fill: p.faint });
    }
  } else {
    body += text(e.x + e.w / 2, e.y + 80, "No pull requests or issues yet.", { size: 13, fill: p.dim, anchor: "middle" });
  }
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `Pull requests and issues — ${user}`,
    label: `GitHub PRs and issues card for ${user}`,
    body
  });
}
