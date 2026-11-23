// IntelliJ-only layouts for the editor theme (ide=intellij). Most cards share their VS Code
// layout and only swap the window chrome; these four use the IDE's own screens instead:
// stats = Settings › Plugins, git-log = the Git tool window's Log tab, streak = the Debug tool
// window, error = a notification balloon.
import { avatarImage } from "./avatar.js";
import {
  MONO, codeBlock, codeTokens, fadeIn, fit, formatNumber, hline, ideaFrame, ideaIcon, ideaTabs, ideaToolHeader,
  rect, relativeTime, shortDate, svgDocument, text, textWidth, vline, windowEnd
} from "./kit.js";

function ijButton(p, x, y, label, { primary = false, w } = {}) {
  const bw = w ?? Math.round(textWidth(label, 13) + 28);
  const svg = primary
    ? rect(x, y, bw, 26, p.accent, 'rx="4"') + text(x + bw / 2, y + 17.5, label, { size: 13, weight: 500, fill: "#ffffff", anchor: "middle" })
    : rect(x + 0.5, y + 0.5, bw - 1, 25, p.widget, `rx="4" stroke="${p.sep}"`) + text(x + bw / 2, y + 17.5, label, { size: 13, weight: 500, fill: p.fg, anchor: "middle" });
  return { svg, w: bw };
}

function underlineTabs(p, x, y, labels, activeIdx, { size = 13, gap = 20, h = 36 } = {}) {
  let out = "";
  let tx = x;
  labels.forEach((label, i) => {
    out += text(tx, y + h / 2 + 4.5, label, { size, fill: i === activeIdx ? p.fg : p.dim });
    if (i === activeIdx) out += rect(tx, y + h - 2, textWidth(label, size), 2, p.accent, 'rx="1"');
    tx += textWidth(label, size) + gap;
  });
  return out;
}

function initials(login) {
  const chars = [...String(login ?? "?")];
  const upper = chars.slice(1).find((ch) => ch >= "A" && ch <= "Z");
  return `${chars[0] ?? "?"}${upper ?? chars[1] ?? ""}`;
}

// 0 stars = 1, ~3 = 2, ~9 = 3, ~20 = 4, 100+ = 5 (same scale as the VS Code card).
function rating(stars) {
  return Math.min(5, Math.max(1, Math.ceil(Math.log10(Number(stars ?? 0) + 1) * 3)));
}

// ---------------------------------------------------------------- stats: Settings › Plugins
export function renderIdeaStats(data, { githubId, scale, p, avatar = null }) {
  const WIDTH = 800, HEIGHT = 410;
  const x = 20, y = 20, w = WIDTH - 40, h = HEIGHT - 40;
  const user = data.login || githubId;
  const name = data.name || user;
  const now = new Date();
  let body = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="10" fill="${p.side}" stroke="${p.sep}"/>`;
  body += `<clipPath id="ed-win"><rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="9.5"/></clipPath><g clip-path="url(#ed-win)">`;

  // Dialog title.
  body += hline(x, y + 34, w, p.line);
  [0, 18, 36].forEach((dx) => { body += `<circle cx="${x + 18 + dx}" cy="${y + 17}" r="5.5" fill="${p.sep}"/>`; });
  body += text(x + w / 2, y + 22, "Settings", { size: 13, weight: 600, fill: p.fg, anchor: "middle" });

  // Settings tree.
  const treeW = 200, top = y + 35, footH = 46, bodyH = h - 35 - footH;
  body += vline(x + treeW, top, bodyH, p.line);
  body += rect(x + 10.5, top + 10.5, treeW - 21, 25, p.input, `rx="4" stroke="${p.sep}"`);
  body += ideaIcon("search", x + 17, top + 15, p.faint, { size: 14 });
  body += text(x + 37, top + 27, "Search", { size: 13, fill: p.faint });
  const items = ["› Appearance & Behavior", "Keymap", "› Editor", "Plugins", "› Version Control", "› Build, Execution, Deployment", "› Languages & Frameworks", "› Tools", "Advanced Settings"];
  items.forEach((label, i) => {
    const iy = top + 46 + i * 26;
    if (label === "Plugins") body += rect(x + 8, iy, treeW - 16, 24, p.sel, 'rx="4"');
    body += text(x + 16, iy + 16.5, fit(label, treeW - 30, 13), { size: 13, fill: p.fg });
  });

  // Plugin page.
  const px = x + treeW + 1, pw = w - treeW - 1;
  body += rect(px, top, pw, bodyH, p.bg);
  body += underlineTabs(p, px + 18, top, ["Marketplace", "Installed"], 1);
  body += hline(px, top + 36, pw, p.line);

  const hx = px + 18, hy = top + 54;
  body += avatarImage(avatar, hx, hy, 76, { id: "ed-avatar", round: false, radius: 14, fallbackText: initials(user), fallbackFill: p.accent });
  const ix = hx + 76 + 16;
  const disable = ijButton(p, px + pw - 18 - 80, hy, "Disable", { w: 80 });
  body += disable.svg;
  body += text(ix, hy + 20, fit(user, px + pw - 18 - 96 - ix, 19, true), { size: 19, weight: 600, fill: p.fg });
  const stars = rating(data.totalStars);
  const starsW = 5 * 13 * 0.98;
  let mx = ix;
  const meta = [
    [fit(name, 170, 13), p.link],
    [`⬇ ${formatNumber(data.contributionsYear)}`, p.dim],
    [null, null],
    [`v${now.getUTCFullYear()}.${now.getUTCMonth() + 1}`, p.dim]
  ];
  for (const [label, color] of meta) {
    if (label === null) {
      body += text(mx, hy + 44, `${"★".repeat(stars)}${"☆".repeat(5 - stars)}`, { size: 13, fill: p.star });
      body += text(mx + starsW + 4, hy + 44, formatNumber(data.totalStars), { size: 13, fill: p.dim });
      mx += starsW + 4 + textWidth(formatNumber(data.totalStars), 13) + 16;
      continue;
    }
    body += text(mx, hy + 44, label, { size: 13, fill: color });
    mx += textWidth(label, 13) + 16;
  }
  let cx = ix;
  for (const tag of ["GitHub", "Profile", data.partial ? "Partial data" : "Stats"]) {
    const tw = textWidth(tag, 12) + 16;
    body += rect(cx, hy + 56, tw, 19, p.chip, 'rx="9.5"') + text(cx + 8, hy + 69.5, tag, { size: 12, fill: p.dim });
    cx += tw + 6;
  }

  const sy = hy + 76 + 16;
  body += underlineTabs(p, px + 18, sy, ["Overview", "What's New", "Reviews", "Additional Info"], 0, { h: 30 });
  body += hline(px, sy + 30, pw, p.line);
  const rows = [
    ["OSS Contribs", data.ossContribs], ["Total PRs", data.totalPRs], ["Total Issues", data.totalIssues],
    ["Total Stars", data.totalStars], ["Total Forks", data.totalForks], ["Contributions (1y)", data.contributionsYear]
  ];
  const colW = (pw - 36 - 26) / 2;
  rows.forEach(([label, value], i) => {
    const rx = px + 18 + (i < 3 ? 0 : colW + 26);
    const ry = sy + 42 + (i % 3) * 30;
    let row = text(rx, ry + 15, label, { size: 13, fill: p.dim });
    row += text(rx + colW, ry + 15, formatNumber(value), { size: 13, fill: p.fg, anchor: "end", family: MONO });
    row += hline(rx, ry + 24, colW, p.line);
    body += fadeIn(row, 0.05 + i * 0.05);
  });

  // Footer buttons.
  const fy = y + h - footH;
  body += hline(x, fy, w, p.line);
  body += `<circle cx="${x + 26}" cy="${fy + 23}" r="11" fill="none" stroke="${p.sep}"/>` + text(x + 26, fy + 27.5, "?", { size: 12, fill: p.dim, anchor: "middle" });
  let bx = x + w - 14;
  for (const [label, primary] of [["OK", true], ["Apply", false], ["Cancel", false]]) {
    const bw = Math.max(72, Math.round(textWidth(label, 13) + 28));
    bx -= bw;
    body += ijButton(p, bx, fy + 10, label, { primary, w: bw }).svg;
    bx -= 8;
  }
  body += windowEnd;

  return svgDocument({ width: WIDTH, height: HEIGHT, scale, title: `Settings › Plugins — ${user}`, label: `GitHub stats card for ${user}`, body });
}

// ---------------------------------------------------------------- git-log: Git tool window, Log tab
function repoLabel(commit, githubId) {
  if (String(commit.ownerLogin).toLowerCase() === String(githubId).toLowerCase()) return commit.repoName;
  return commit.repoFullName;
}

function wrap(value, maxWidth, size, bold, maxLines = 2) {
  const words = String(value ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  while (words.length && lines.length < maxLines) {
    let line = "";
    while (words.length && textWidth(`${line} ${words[0]}`.trim(), size, bold) <= maxWidth) line = `${line} ${words.shift()}`.trim();
    if (!line) line = fit(words.shift(), maxWidth, size, bold);
    lines.push(line);
  }
  if (words.length) lines[lines.length - 1] = fit(`${lines[lines.length - 1]} ${words.join(" ")}`, maxWidth, size, bold);
  return lines;
}

export function renderIdeaGitLog(data, { githubId, scale, p, lines = 8 }) {
  const commits = Array.isArray(data.commits) ? data.commits : [];
  const user = githubId;
  const now = Date.now();
  const ROW = 24;
  const slots = Math.max(lines, commits.length, 3);
  const WIDTH = 920;
  const codeH = 72;
  const HEIGHT = 20 + 30 + 35 + codeH + 36 + 26 + slots * ROW + 10 + 22 + 20;

  const laneOf = new Map();
  for (const c of commits) if (!laneOf.has(c.repoFullName)) laneOf.set(c.repoFullName, Math.min(laneOf.size, 3));
  const laneCount = Math.max(1, Math.min(4, laneOf.size));

  const frame = ideaFrame(p, {
    w: WIDTH - 40, h: HEIGHT - 40, active: "git", run: "git-log",
    crumbs: ["github-cli", "Git Log"],
    statusRight: [{ text: `${commits.length} commits · ${laneOf.size} repos` }, { text: "UTF-8" }]
  });
  const c = frame.content;
  let body = frame.svg;

  // A faded editor above the tool window.
  body += rect(c.x, c.y, c.w, c.h, p.bg);
  body += ideaTabs(p, c.x, c.y, c.w, [{ label: "commits.js", badge: "js", active: true }]);
  const code = [
    { tokens: [["export async function", "kw"], [" ", "fg"], ["recentCommits", "fn"], ["(login) {", "fg"]] },
    { tokens: [["  const", "kw"], [" events = ", "fg"], ["await", "kw"], [" ", "fg"], ["fetchEvents", "fn"], ["(login);", "fg"]] },
    { tokens: [["}", "fg"]] }
  ];
  body += `<g opacity="0.5">${codeBlock(p, c.x, c.y + 35 + 4, c.w, code, { size: 13, lineH: 21 })}</g>`;

  // Git tool window.
  const ty = c.y + 35 + codeH;
  body += rect(c.x, ty, c.w, c.y + c.h - ty, p.side);
  body += ideaToolHeader(p, c.x, ty, c.w, "Git", ["Log", "Console"], 0);
  const by = ty + 36;
  const bh = c.y + c.h - by;
  const brW = 170, detW = 250;
  const lx = c.x + brW, lw = c.w - brW - detW;
  body += vline(c.x + brW, by, bh, p.line) + vline(lx + lw, by, bh, p.line);

  // Branches.
  const branches = [["⌕ Filter", "faint", 0], ["◈ HEAD (Current Branch)", "fg", 0, true], ["⌄ Local", "fg", 0], ["★ main", "fg", 14], ["⌄ Remote", "fg", 0], ["› origin", "fg", 14]];
  branches.forEach(([label, color, indent, on], i) => {
    const ry = by + 6 + i * 24;
    if (on) body += rect(c.x + 6, ry, brW - 12, 22, p.sel, 'rx="4"');
    body += text(c.x + 14 + indent, ry + 15.5, fit(label, brW - 26 - indent, 13), { size: 13, fill: p[color] });
  });

  // Log table.
  const graphW = 14 + laneCount * 12;
  const authorW = 100, dateW = 44;
  const subjX = lx + graphW + 4;
  const subjW = lw - graphW - 4 - authorW - dateW - 12;
  body += text(subjX, by + 17, "Subject", { size: 12, fill: p.dim });
  body += text(lx + lw - dateW - 10 - authorW, by + 17, "Author", { size: 12, fill: p.dim });
  body += text(lx + lw - 10, by + 17, "Date", { size: 12, fill: p.dim, anchor: "end" });
  body += hline(lx, by + 26, lw, p.line);
  const ry0 = by + 26;
  const laneX = (lane) => lx + 12 + lane * 12;
  const spans = new Map();
  commits.forEach((cm, i) => {
    const lane = laneOf.get(cm.repoFullName);
    const span = spans.get(lane) ?? { from: i, to: i };
    span.to = i;
    spans.set(lane, span);
  });
  commits.forEach((cm, i) => { if (i === 0) body += rect(lx, ry0, lw, ROW, p.sel); });
  for (const [lane, span] of spans) {
    if (span.to > span.from) body += `<path d="M${laneX(lane)} ${ry0 + span.from * ROW + 12}V${ry0 + span.to * ROW + 12}" stroke="${p.lanes[lane]}" stroke-width="1.6"/>`;
  }
  if (commits.length === 0) body += text(subjX, ry0 + 18, "No recent public commits.", { size: 13, fill: p.dim });
  const seen = new Set();
  commits.forEach((cm, i) => {
    const ry = ry0 + i * ROW;
    const lane = laneOf.get(cm.repoFullName);
    let row = `<circle cx="${laneX(lane)}" cy="${ry + 12}" r="3.6" fill="${p.lanes[lane]}"/>`;
    let tx = subjX;
    if (!seen.has(cm.repoFullName)) {
      seen.add(cm.repoFullName);
      const label = fit(repoLabel(cm, user), 120, 11);
      const tw = textWidth(label, 11) + 12;
      row += rect(tx, ry + 5, tw, 15, p.lanes[lane], 'rx="3"') + text(tx + 6, ry + 16, label, { size: 11, fill: "#ffffff" });
      tx += tw + 6;
    }
    row += text(tx, ry + 16.5, fit(cm.message, subjX + subjW - tx, 13), { size: 13, fill: p.fg });
    row += text(lx + lw - dateW - 10 - authorW, ry + 16.5, fit(user, authorW - 8, 13), { size: 13, fill: p.dim });
    row += text(lx + lw - 10, ry + 16.5, relativeTime(cm.date, now), { size: 13, fill: p.dim, anchor: "end" });
    body += fadeIn(row, 0.05 + i * 0.05);
  });

  // Commit details.
  const dx = lx + lw + 12, dw = detW - 24;
  const head = commits[0];
  if (head) {
    let dy = by + 22;
    for (const line of wrap(head.message, dw, 13, true)) {
      body += text(dx, dy, line, { size: 13, weight: 600, fill: p.fg });
      dy += 18;
    }
    dy += 4;
    body += text(dx, dy, head.sha, { size: 12, fill: p.fg, family: MONO });
    body += text(dx + textWidth(head.sha, 12) * 1.1 + 8, dy, `@${user}`, { size: 12, fill: p.dim });
    body += text(dx, dy + 17, shortDate(head.date), { size: 12, fill: p.dim });
    body += text(dx, dy + 34, fit(head.repoFullName, dw, 12), { size: 12, fill: p.dim });
    dy += 50;
    body += hline(dx, dy, dw, p.line);
    dy += 20;
    const counts = [...laneOf.keys()].map((repo) => ({ repo, n: commits.filter((cm) => cm.repoFullName === repo).length, lane: laneOf.get(repo) }));
    counts.slice(0, Math.max(0, Math.floor((by + bh - dy) / 20))).forEach(({ repo, n, lane }, i) => {
      const yy = dy + i * 20;
      body += `<circle cx="${dx + 4}" cy="${yy - 4}" r="3.5" fill="${p.lanes[lane]}"/>`;
      body += text(dx + 14, yy, fit(repoLabel(commits.find((cm) => cm.repoFullName === repo), user), dw - 40, 12), { size: 12, fill: p.fg });
      body += text(dx + dw, yy, String(n), { size: 12, fill: p.dim, anchor: "end", family: MONO });
    });
  }
  body += windowEnd;

  return svgDocument({ width: WIDTH, height: HEIGHT, scale, title: `Git Log — ${user}`, label: `GitHub git log card for ${user}`, body });
}

// ---------------------------------------------------------------- streak: Debug tool window
function range(r) {
  if (!r) return "—";
  if (r.start === r.end) return shortDate(r.start);
  const start = shortDate(r.start);
  const end = shortDate(r.end);
  return start.slice(-4) === end.slice(-4) ? `${start.slice(0, -6)} – ${end}` : `${start} – ${end}`;
}

export function renderIdeaStreak({ contributions, streak }, { githubId, scale, p }) {
  const WIDTH = 900, HEIGHT = 480;
  const user = githubId;
  const current = streak.currentStreak ?? 0;
  const longest = streak.longestStreak ?? 0;
  const total = streak.totalContributions ?? 0;
  const today = streak.totalRange?.end ?? "";
  const todayCount = contributions?.[today] ?? 0;

  const frame = ideaFrame(p, {
    w: WIDTH - 40, h: HEIGHT - 40, active: "debug", run: "streak", running: true,
    crumbs: ["github-cli", "src", "streak.js"],
    statusRight: [{ text: "7:5" }, { text: "LF" }, { text: "UTF-8" }, { text: "2 spaces" }]
  });
  const c = frame.content;
  let body = frame.svg;
  body += rect(c.x, c.y, c.w, c.h, p.bg);
  body += ideaTabs(p, c.x, c.y, c.w, [{ label: "streak.js", badge: "js", active: true }, { label: "README.md", badge: "md" }]);

  // Code with the execution point and inline values.
  const lineH = 21, gutter = 58;
  const cy0 = c.y + 35 + 8;
  const code = [
    [[["export function", "kw"], [" ", "fg"], ["streak", "fn"], ["(days) {", "fg"]]],
    [[["  let", "kw"], [" current = ", "fg"], ["0", "num"], [", longest = ", "fg"], ["0", "num"], [";", "fg"]]],
    [[["  for", "kw"], [" (", "fg"], ["const", "kw"], [" day ", "fg"], ["of", "kw"], [" days) {", "fg"]], `day: {date: "${today}", count: ${todayCount}}`],
    [[["    current = day.", "fg"], ["count", "prop"], [" > ", "fg"], ["0", "num"], [" ? current + ", "fg"], ["1", "num"], [" : ", "fg"], ["0", "num"], [";", "fg"]], `current: ${current}`],
    [[["    longest = Math.", "fg"], ["max", "fn"], ["(longest, current);", "fg"]], `longest: ${longest}`],
    [[["  }", "fg"]]],
    [[["  return", "kw"], [" { current, longest };", "fg"]]],
    [[["}", "fg"]]]
  ];
  code.forEach(([tokens, inline], i) => {
    const ly = cy0 + i * lineH;
    const n = i + 1;
    if (n === 7) {
      body += rect(c.x, ly, c.w, lineH, p.pausedBg);
      body += `<circle cx="${c.x + 44}" cy="${ly + lineH / 2}" r="5.5" fill="${p.err}"/>`;
    }
    body += text(c.x + 32, ly + 15, String(n), { size: 12, fill: p.faint, anchor: "end", family: MONO });
    body += codeTokens(p, c.x + gutter, ly + 15, tokens, { size: 13 });
    if (inline) {
      const used = tokens.reduce((acc, [t]) => acc + String(t).length, 0);
      body += text(c.x + gutter + used * 13 * 0.6 + 20, ly + 15, inline, { size: 12.5, fill: p.faint, family: MONO, italic: true });
    }
  });

  // Debug tool window.
  const ty = cy0 + code.length * lineH + 10;
  body += rect(c.x, ty, c.w, c.y + c.h - ty, p.side);
  body += ideaToolHeader(p, c.x, ty, c.w, "Debug", ["streak", "Debugger", "Console"], 1);
  const tb = ty + 36;
  body += hline(c.x, tb + 30, c.w, p.line);
  const tools = [["run", p.ok, p.ok], ["pause", p.dim], ["stop", p.err, p.err], ["stepOver", p.dim], ["stepInto", p.dim], ["stepOut", p.dim]];
  tools.forEach(([name, color, fill], i) => { body += ideaIcon(name, c.x + 14 + i * 28, tb + 7, color, { fill: fill ?? "none" }); });

  const fy = tb + 31;
  const frW = 230;
  body += vline(c.x + frW, fy, c.y + c.h - fy, p.line);
  const frames = [["streak:7, ", "streak.js", true], ["render:42, ", "card.js"], ["(anonymous):12, ", "server.js"]];
  frames.forEach(([fn, file, on], i) => {
    const ry = fy + 4 + i * 24;
    if (on) body += rect(c.x, ry, frW, 24, p.sel);
    body += text(c.x + 14, ry + 16.5, fn, { size: 13, fill: on ? p.fg : p.dim });
    body += text(c.x + 14 + textWidth(fn, 13) + 2, ry + 16.5, file, { size: 13, fill: p.dim });
  });
  const vx = c.x + frW + 14;
  const vars = [
    ["v", p.prop, [["current", "fg"], [" = ", "fg"], [String(current), "num"]], range(streak.currentRange)],
    ["v", p.prop, [["longest", "fg"], [" = ", "fg"], [String(longest), "num"]], range(streak.longestRange)],
    ["v", p.prop, [["total", "fg"], [" = ", "fg"], [String(total), "num"]], ""],
    ["o", p.type, [["day", "fg"], [" = {date: ", "fg"], [`"${today}"`, "str"], [", count: ", "fg"], [String(todayCount), "num"], ["}", "fg"]], ""]
  ];
  vars.forEach(([badge, color, tokens, note], i) => {
    const ry = fy + 4 + i * 24;
    let row = `<circle cx="${vx + 8}" cy="${ry + 12}" r="8" fill="${color}"/>` + text(vx + 8, ry + 15.5, badge, { size: 10, weight: 700, fill: "#ffffff", anchor: "middle" });
    row += codeTokens(p, vx + 24, ry + 16.5, tokens, { size: 12.5 });
    if (note) {
      const used = tokens.reduce((acc, [t]) => acc + String(t).length, 0);
      row += text(vx + 24 + used * 12.5 * 0.6 + 14, ry + 16.5, note, { size: 12, fill: p.faint, italic: true });
    }
    body += fadeIn(row, 0.1 + i * 0.06);
  });
  body += windowEnd;

  return svgDocument({ width: WIDTH, height: HEIGHT, scale, title: `streak.js — ${user}`, label: `GitHub streak card for ${user}`, body });
}

// ---------------------------------------------------------------- error: notification balloon
export function renderIdeaError({ user, type, message, scale, p }) {
  const WIDTH = 760;
  const file = `${type || "card"}.svg`;
  const balloonW = 400;
  const lines = wrap(message || "Something went wrong.", balloonW - 60, 13, false, 4);
  const balloonH = 30 + lines.length * 19 + 34;
  const editorH = Math.max(220, balloonH + 40);
  const HEIGHT = 20 + 30 + 35 + editorH + 22 + 20;
  const frame = ideaFrame(p, {
    w: WIDTH - 40, h: HEIGHT - 40, active: "project", run: type || "Current File",
    crumbs: ["github-cli", file],
    statusRight: [{ text: "⊘ 1", color: p.err }, { text: "6:43" }, { text: "LF" }, { text: "UTF-8" }]
  });
  const c = frame.content;
  let body = frame.svg;
  body += rect(c.x, c.y, c.w, c.h, p.bg);
  body += ideaTabs(p, c.x, c.y, c.w, [{ label: file, badge: "svg", active: true }]);
  const login = user || "octocat";
  const code = [
    { tokens: [["const", "kw"], [" res = ", "fg"], ["await", "kw"], [" ", "fg"], ["fetch", "fn"], ["(", "fg"], ['"https://api.github.com/graphql"', "str"], [", {", "fg"]] },
    { tokens: [["  method", "prop"], [": ", "fg"], ['"POST"', "str"], [",", "fg"]] },
    { tokens: [["  headers", "prop"], [": { ", "fg"], ["authorization", "prop"], [": ", "fg"], ["`bearer ${token}`", "str"], [" },", "fg"]] },
    { tokens: [["  body", "prop"], [": JSON.", "fg"], ["stringify", "fn"], ["({ query, variables: { login: ", "fg"], [`"${login}"`, "str"], [" } })", "fg"]] },
    { tokens: [["});", "fg"]] },
    { tokens: [["if", "kw"], [" (!res.", "fg"], ["ok", "prop"], [") ", "fg"], ["throw new", "kw"], [" ", "fg"], ["Error", "type"], ["(res.", "fg"], ["statusText", "prop"], [");", "fg"]] }
  ];
  body += `<g opacity="0.5">${codeBlock(p, c.x, c.y + 35 + 8, c.w, code, { size: 13, lineH: 21 })}</g>`;

  const bx = c.x + c.w - balloonW - 16, by = c.y + c.h - balloonH - 14;
  body += `<rect x="${bx - 1}" y="${by + 3}" width="${balloonW + 2}" height="${balloonH + 2}" rx="9" fill="${p.shadow}"/>`;
  body += rect(bx + 0.5, by + 0.5, balloonW - 1, balloonH - 1, p.side, `rx="8" stroke="${p.sep}"`);
  body += `<circle cx="${bx + 23}" cy="${by + 24}" r="8" fill="${p.err}"/><path d="M${bx + 23} ${by + 19.5}v5.5" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/><circle cx="${bx + 23}" cy="${by + 28.6}" r="1.05" fill="#ffffff"/>`;
  body += text(bx + 40, by + 28, fit(`Could not create the ${type || "card"} card`, balloonW - 70, 13, true), { size: 13, weight: 600, fill: p.fg });
  lines.forEach((line, i) => { body += text(bx + 40, by + 48 + i * 19, line, { size: 13, fill: p.fg }); });
  const ly = by + 48 + lines.length * 19 + 8;
  body += text(bx + 40, ly, "Retry", { size: 13, fill: p.link });
  body += text(bx + 40 + textWidth("Retry", 13) + 18, ly, "Settings", { size: 13, fill: p.link });
  body += text(bx + balloonW - 16, by + 24, "×", { size: 15, fill: p.dim, anchor: "middle" });
  body += windowEnd;

  return svgDocument({ width: WIDTH, height: HEIGHT, scale, title: `Error — ${file}`, label: `Error: ${message}`, body });
}
