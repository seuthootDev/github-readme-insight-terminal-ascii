// Editor theme, streak card: a debugger paused inside a streak function, the streak values shown
// as variables, inline values and the debug console.
import { MONO, codeBlock, codeTokens, editorWindow, fadeIn, fit, formatNumber, palette, rect, sectionHeader, shortDate, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const WIDTH = 900;
const HEIGHT = 440;
const SIDE_W = 280;

function range(r) {
  if (!r) return "—";
  if (r.start === r.end) return shortDate(r.start);
  // Drop the first year when both ends share it: "Mar 29 – Apr 14, 2026".
  const start = shortDate(r.start);
  const end = shortDate(r.end);
  return start.slice(-4) === end.slice(-4) ? `${start.slice(0, -6)} – ${end}` : `${start} – ${end}`;
}

// Debug toolbar glyphs (continue, step over, step into, step out, restart, stop).
function debugToolbar(p, x, y) {
  const w = 196, h = 28;
  let out = `<rect x="${x - 1}" y="${y + 2}" width="${w + 2}" height="${h + 1}" rx="5" fill="${p.shadow}"/>`;
  out += rect(x, y, w, h, p.widget, `rx="4" stroke="${p.line}"`);
  out += `<path d="M${x + 9} ${y + 8}v12M${x + 13} ${y + 8}v12" stroke="${p.faint}" stroke-width="1.5"/>`;
  const glyphs = [
    `<path d="M0 0v10M3 0l8 5-8 5z" stroke="#75beff" fill="#75beff" stroke-width="1.4" stroke-linejoin="round"/>`,
    `<path d="M0 7a5.5 5.5 0 0 1 11 0M11 7l-3-1.5M11 7l1.5-3" stroke="#75beff" fill="none" stroke-width="1.4"/><circle cx="5.5" cy="11" r="1.6" fill="#75beff"/>`,
    `<path d="M5.5 0v7M2.5 4.5l3 3 3-3" stroke="#75beff" fill="none" stroke-width="1.4"/><circle cx="5.5" cy="11" r="1.6" fill="#75beff"/>`,
    `<path d="M5.5 8V1M2.5 3.5l3-3 3 3" stroke="#75beff" fill="none" stroke-width="1.4"/><circle cx="5.5" cy="11" r="1.6" fill="#75beff"/>`,
    `<path d="M10 3A5 5 0 1 0 11 7M10 0v3.5H6.5" stroke="#89d185" fill="none" stroke-width="1.4"/>`,
    `<rect x="0.5" y="0.5" width="10" height="10" fill="none" stroke="#f48771" stroke-width="1.4"/>`
  ];
  glyphs.forEach((g, i) => {
    out += `<g transform="translate(${x + 24 + i * 28} ${y + 8})">${g}</g>`;
  });
  return out;
}

function variableRow(p, x, y, name, value, valueColor) {
  return codeTokens(p, x, y, [[name, "prop"], [": ", "fg"], [value, valueColor]], { size: 13 });
}

export function renderEditorStreak({ contributions, streak }, { githubId, scale, scheme } = {}) {
  const p = palette(scheme);
  const user = githubId;
  const current = streak.currentStreak ?? 0;
  const longest = streak.longestStreak ?? 0;
  const total = streak.totalContributions ?? 0;
  const today = streak.totalRange?.end ?? "";
  const todayCount = contributions?.[today] ?? 0;

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `streak.js — ${user} [Debugging]`,
    active: "debug",
    side: SIDE_W,
    sideTitle: "RUN AND DEBUG",
    tabs: [{ label: "streak.js", badge: "js", active: true }],
    panel: 112,
    panelTabs: ["PROBLEMS", "OUTPUT", "TERMINAL", "*DEBUG CONSOLE"],
    status: {
      bg: p.debug, fg: "#ffffff",
      left: [{ text: "⎇ main", color: "#ffffff" }, { text: "▷ Launch streak", color: "#ffffff" }],
      right: [{ text: "Ln 7, Col 3", color: "#ffffff" }, { text: "JavaScript", color: "#ffffff" }]
    }
  });
  const s = win.regions.side;
  const e = win.regions.editor;
  let body = win.svg;

  // Launch config row.
  body += text(s.x + 20, s.y + 4, "▶", { size: 12, fill: p.ok });
  body += rect(s.x + 38, s.y - 10, s.w - 58, 22, p.input, `rx="2" stroke="${p.line}"`);
  body += text(s.x + 46, s.y + 5, fit(`Launch streak (@${user})`, s.w - 90, 12), { size: 12, fill: p.fg });
  body += text(s.x + s.w - 30, s.y + 5, "⌄", { size: 12, fill: p.dim });

  // VARIABLES.
  let y = s.y + 24;
  body += sectionHeader(p, s.x, y, s.w, "VARIABLES");
  y += 22;
  body += text(s.x + 22, y + 13, "⌄ Local", { size: 13, fill: p.fg });
  const vars = [
    ["currentStreak", formatNumber(current), p.num],
    ["longestStreak", formatNumber(longest), p.num],
    ["total", formatNumber(total), p.num],
    ["today", `"${today}"`, p.str]
  ];
  vars.forEach(([name, value, color], i) => {
    body += fadeIn(variableRow(p, s.x + 38, y + 33 + i * 20, name, value, color), 0.1 + i * 0.06);
  });
  y += 22 + vars.length * 20 + 6;

  // CALL STACK: the two streak ranges as frames.
  body += sectionHeader(p, s.x, y, s.w, "CALL STACK");
  const badge = "PAUSED ON BREAKPOINT";
  const bw = textWidth(badge, 9) + 12;
  body += rect(s.x + s.w - bw - 10, y + 6, bw, 14, p.chip, 'rx="2"');
  body += text(s.x + s.w - 10 - bw / 2, y + 16, badge, { size: 9, fill: p.dim, anchor: "middle" });
  y += 22;
  [["currentStreak", range(streak.currentRange), true], ["longestStreak", range(streak.longestRange), false]].forEach(([name, value, on], i) => {
    const ry = y + i * 22;
    if (on) body += rect(s.x + 1, ry, s.w - 2, 22, p.sel);
    body += text(s.x + 22, ry + 15, name, { size: 13, fill: p.fg });
    body += text(s.x + s.w - 12, ry + 15, fit(value, s.w - 130, 12), { size: 12, fill: p.dim, anchor: "end" });
  });

  // Editor: paused on the return line, with inline values.
  const lines = [
    { tokens: [["export function", "kw"], [" ", "fg"], ["streak", "fn"], ["(", "fg"], ["days", "prop"], [") {", "fg"]] },
    { tokens: [["  let", "kw"], [" current = ", "fg"], ["0", "num"], [", longest = ", "fg"], ["0", "num"], [";", "fg"]] },
    { tokens: [["  for", "ctl"], [" (", "fg"], ["const", "kw"], [" day ", "fg"], ["of", "ctl"], [" days) {", "fg"]] , inline: `day = "${today}", count = ${todayCount}` },
    { tokens: [["    current = day.", "fg"], ["count", "prop"], [" > ", "fg"], ["0", "num"], [" ? current + ", "fg"], ["1", "num"], [" : ", "fg"], ["0", "num"], [";", "fg"]], inline: `current = ${current}` },
    { tokens: [["    longest = Math.", "fg"], ["max", "fn"], ["(longest, current);", "fg"]], inline: `longest = ${longest}` },
    { tokens: [["  }", "fg"]] },
    { tokens: [["  return", "ctl"], [" { current, longest };", "fg"]], bg: "paused", mark: "paused" },
    { tokens: [["}", "fg"]] }
  ];
  body += codeBlock(p, e.x, e.y + 10, e.w, lines, { size: 13, lineH: 21, activeLine: 7 });
  body += debugToolbar(p, e.x + e.w - 196 - 24, e.y + 8);

  // Debug console.
  const c = win.regions.panel;
  body += text(c.x + 20, c.y + 16, "> streak(contributions)", { size: 13, fill: p.dim, family: MONO });
  body += fadeIn(
    codeTokens(p, c.x + 20, c.y + 38, [["{ ", "fg"], ["current", "prop"], [": ", "fg"], [String(current), "num"], [", ", "fg"], ["longest", "prop"], [": ", "fg"], [String(longest), "num"], [", ", "fg"], ["total", "prop"], [": ", "fg"], [String(total), "num"], [" }", "fg"]], { size: 13 })
    + text(c.x + 20, c.y + 60, fit(`current ${range(streak.currentRange)}  ·  longest ${range(streak.longestRange)}`, c.w - 40, 12), { size: 12, fill: p.dim }),
    0.4
  );
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `streak.js — ${user}`,
    label: `GitHub streak card for ${user}`,
    body
  });
}
