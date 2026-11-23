// Editor theme, git-log card: the source control graph (one lane per repository) with the newest
// commit opened in the editor.
import { renderIdeaGitLog } from "./intellij.js";
import { MONO, codeTokens, editorWindow, fadeIn, fit, palette, pill, rect, relativeTime, sectionHeader, shortDate, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const WIDTH = 920;
const SIDE_W = 380;
const ROW_H = 26;
const MAX_LANES = 4;

function repoLabel(commit, githubId) {
  if (String(commit.ownerLogin).toLowerCase() === String(githubId).toLowerCase()) return commit.repoName;
  return commit.repoFullName;
}

export function renderEditorGitLog(data, { githubId, scale, scheme, ide, lines = 8 } = {}) {
  const p = palette(scheme, ide);
  if (p.ide === "intellij") return renderIdeaGitLog(data, { githubId, scale, p, lines });
  const commits = Array.isArray(data.commits) ? data.commits : [];
  const user = githubId;
  const now = Date.now();
  const rowSlots = Math.max(lines, commits.length, 3);

  // One lane per repository, in order of first appearance; extra repos share the last lane.
  const laneOf = new Map();
  for (const c of commits) {
    if (!laneOf.has(c.repoFullName)) laneOf.set(c.repoFullName, Math.min(laneOf.size, MAX_LANES - 1));
  }
  const laneCount = Math.max(1, Math.min(MAX_LANES, laneOf.size));
  const repoCount = laneOf.size;

  const listTop = 22 + 52 + 22;
  const sideContentH = listTop + rowSlots * ROW_H + 12;
  const mainH = 35 + sideContentH;
  const HEIGHT = 20 + 30 + mainH + 22 + 20;
  const head = commits[0];

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: head ? `${head.sha} — ${repoLabel(head, user)}` : `Source Control — ${user}`,
    active: "scm",
    side: SIDE_W,
    sideTitle: "SOURCE CONTROL",
    tabs: head ? [{ label: `${head.sha} (commit)`, badge: "git", active: true }] : [{ label: "Source Control", badge: "git", active: true }],
    status: {
      left: [{ text: "⎇ main" }, { text: "↓0 ↑0" }],
      right: [{ text: `${commits.length} commit${commits.length === 1 ? "" : "s"}` }, { text: `${repoCount} repo${repoCount === 1 ? "" : "s"}` }]
    }
  });
  const s = win.regions.side;
  const e = win.regions.editor;
  let body = win.svg;

  // Commit box.
  body += rect(s.x + 12, s.y - 8, s.w - 24, 24, p.input, `rx="2" stroke="${p.line}"`);
  body += text(s.x + 20, s.y + 8, fit(`Message (Ctrl+Enter to commit on "main")`, s.w - 44, 12), { size: 12, fill: p.faint });
  body += rect(s.x + 12, s.y + 22, s.w - 24, 24, p.accent, 'rx="2"');
  body += text(s.x + s.w / 2, s.y + 38, "✓ Commit", { size: 12, fill: "#ffffff", anchor: "middle" });

  const gy = s.y + 58;
  body += sectionHeader(p, s.x, gy, s.w, "GRAPH");
  const ly = gy + 24;
  const laneX = (lane) => s.x + 14 + lane * 12;
  const textX = s.x + 14 + laneCount * 12 + 6;

  // Lane spans: a vertical line from a repo's first to last commit.
  const spans = new Map();
  commits.forEach((c, i) => {
    const lane = laneOf.get(c.repoFullName);
    const span = spans.get(lane) ?? { from: i, to: i };
    span.to = i;
    spans.set(lane, span);
  });
  for (const [lane, span] of spans) {
    if (span.to > span.from) {
      body += `<path d="M${laneX(lane)} ${ly + span.from * ROW_H + 13}V${ly + span.to * ROW_H + 13}" stroke="${p.lanes[lane]}" stroke-width="2"/>`;
    }
  }

  if (commits.length === 0) {
    body += text(s.x + 20, ly + 18, "No recent public commits.", { size: 12, fill: p.dim });
  }
  const seen = new Set();
  commits.forEach((c, i) => {
    const ry = ly + i * ROW_H;
    const lane = laneOf.get(c.repoFullName);
    const color = p.lanes[lane];
    let row = "";
    if (i === 0) row += rect(s.x + 1, ry, s.w - 2, ROW_H, p.sel);
    row += `<circle cx="${laneX(lane)}" cy="${ry + 13}" r="4" fill="${color}" stroke="${i === 0 ? p.sel : p.side}" stroke-width="1.5"/>`;
    let tx = textX;
    const when = relativeTime(c.date, now);
    const whenW = textWidth(when, 12) + 8;
    if (!seen.has(c.repoFullName)) {
      seen.add(c.repoFullName);
      const label = fit(repoLabel(c, user), 120, 11);
      const tag = pill(p, tx, ry + 5, label, { bg: color, fg: "#ffffff", size: 11 });
      row += tag.svg;
      tx += tag.w + 6;
    }
    row += text(tx, ry + 17.5, fit(c.message, s.x + s.w - 12 - whenW - tx, 13), { size: 13, fill: p.fg });
    row += text(s.x + s.w - 12, ry + 17.5, when, { size: 12, fill: p.faint, anchor: "end" });
    body += fadeIn(row, 0.05 + i * 0.05);
  });

  // Editor: the newest commit, `git show` style, then a per-repository summary.
  if (head) {
    const x = e.x + 20;
    let y = e.y + 26;
    const lh = 21;
    const w = e.w - 40;
    const meta = [
      [["commit ", "kw"], [head.sha, "num"], ["  (HEAD -> main)", "type"]],
      [["Author: ", "kw"], [`@${user}`, "fg"]],
      [["Date:   ", "kw"], [shortDate(head.date), "fg"]],
      [["Repo:   ", "kw"], [head.repoFullName, "str"]]
    ];
    meta.forEach((tokens) => {
      body += codeTokens(p, x, y, tokens, { size: 13, maxWidth: w });
      y += lh;
    });
    y += 8;
    body += codeTokens(p, x, y, [[`    ${head.message}`, "fg"]], { size: 13, maxWidth: w });
    y += lh + 18;
    body += codeTokens(p, x, y, [[`// ${commits.length} recent commits across ${repoCount} repositor${repoCount === 1 ? "y" : "ies"}`, "cmt"]], { size: 13, maxWidth: w });
    y += 12;
    const counts = [...laneOf.keys()].map((repo) => ({ repo, n: commits.filter((c) => c.repoFullName === repo).length, lane: laneOf.get(repo) }));
    const maxN = Math.max(1, ...counts.map((c) => c.n));
    counts.slice(0, Math.floor((e.y + e.h - y - 8) / 24)).forEach(({ repo, n, lane }, i) => {
      const ry = y + 10 + i * 24;
      const label = fit(repoLabel(commits.find((c) => c.repoFullName === repo), user), 190, 12);
      body += `<circle cx="${x + 5}" cy="${ry + 8}" r="4" fill="${p.lanes[lane]}"/>`;
      body += text(x + 16, ry + 12, label, { size: 12, fill: p.fg });
      const bx = x + 220, bw = w - 220 - 40;
      body += fadeIn(rect(bx, ry + 4, Math.max(4, (n / maxN) * bw), 8, p.lanes[lane], 'rx="2" opacity="0.85"'), 0.3 + i * 0.05);
      body += text(x + w, ry + 12, String(n), { size: 12, fill: p.dim, anchor: "end", family: MONO });
    });
  } else {
    body += text(e.x + e.w / 2, e.y + 60, "No commits to show.", { size: 13, fill: p.dim, anchor: "middle" });
  }
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `Source Control — ${user}`,
    label: `GitHub git log card for ${user}`,
    body
  });
}
