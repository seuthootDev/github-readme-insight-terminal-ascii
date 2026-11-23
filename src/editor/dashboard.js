// Editor theme, dashboard: a whole workspace — profile in the sidebar, stats.json and the
// language list as two editor groups, the contribution heatmap in the bottom panel.
import { NUM_WEEKS, addDays, levelFromCount, toIsoDate } from "../constants.js";
import { MONO, codeBlock, compact, editorWindow, esc, fadeIn, fit, formatNumber, palette, rect, sectionHeader, shortDate, svgDocument, tabStrip, text, vline, windowEnd } from "./kit.js";

const WIDTH = 1040;
const HEIGHT = 520;
const SIDE_W = 230;
const PANEL_H = 160;

function initials(data) {
  const source = String(data.name || data.login || "?").trim();
  const words = source.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : source.slice(0, 2)).toUpperCase();
}

function valueOrNa(value) {
  return value === null || value === undefined ? "null" : String(value);
}

export function renderEditorDashboard(data, { githubId, scale, scheme, languageColors = {} } = {}) {
  const p = palette(scheme);
  const user = data.login || githubId;
  const streak = data.streak ?? { current: 0, longest: 0 };

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `${user} — workspace`,
    active: "explorer",
    side: SIDE_W,
    sideTitle: "PROFILE",
    tabs: [{ label: "stats.json", badge: "json", active: true }],
    panel: PANEL_H,
    panelTabs: ["PROBLEMS", "OUTPUT", "TERMINAL", "*CONTRIBUTIONS"],
    status: {
      left: [{ text: "⎇ main" }, { text: "⊗ 0  ⚠ 0" }],
      right: [{ text: `streak ${streak.current}d` }, { text: `longest ${streak.longest}d` }, { text: "JSON" }]
    }
  });
  const s = win.regions.side;
  const e = win.regions.editor;
  const c = win.regions.panel;
  let body = win.svg;

  // ---- Sidebar: avatar, name, profile rows.
  const ax = s.x + 20, ay = s.y + 8;
  body += `<circle cx="${ax + 28}" cy="${ay + 28}" r="28" fill="${p.accent}"/>`;
  body += text(ax + 28, ay + 36, initials(data), { size: 20, weight: 600, fill: "#ffffff", anchor: "middle" });
  body += text(ax + 70, ay + 24, fit(data.name || user, s.w - 96, 14, true), { size: 14, weight: 600, fill: p.fg });
  body += text(ax + 70, ay + 44, fit(`@${user}`, s.w - 100, 13), { size: 13, fill: p.dim });
  let y = ay + 76;
  body += sectionHeader(p, s.x, y, s.w, "OVERVIEW");
  y += 24;
  const rows = [
    ["Repositories", data.publicRepos === null ? "n/a" : formatNumber(data.publicRepos)],
    ["Followers", data.followers === null ? "n/a" : formatNumber(data.followers)],
    ["Stars earned", data.stars === null ? "n/a" : compact(data.stars)],
    ["Member since", data.createdAt ? shortDate(data.createdAt) : "n/a"],
    ["Current streak", `${streak.current} day${streak.current === 1 ? "" : "s"}`],
    ["Longest streak", `${streak.longest} day${streak.longest === 1 ? "" : "s"}`]
  ];
  rows.forEach(([k, v], i) => {
    const ry = y + i * 24;
    body += fadeIn(text(s.x + 22, ry + 15, k, { size: 13, fill: p.dim }) + text(s.x + s.w - 16, ry + 15, v, { size: 13, fill: p.fg, anchor: "end" }), 0.05 + i * 0.05);
  });

  // ---- Editor group 1: stats.json.
  const half = Math.round(e.w * 0.5);
  const json = [
    { tokens: [["{", "fg"]] },
    { tokens: [['  "login"', "prop"], [": ", "fg"], [`"${user}"`, "str"], [",", "fg"]] },
    { tokens: [['  "stars"', "prop"], [": ", "fg"], [valueOrNa(data.stars), "num"], [",", "fg"]] },
    { tokens: [['  "pullRequests"', "prop"], [": ", "fg"], [valueOrNa(data.prs), "num"], [",", "fg"]] },
    { tokens: [['  "issues"', "prop"], [": ", "fg"], [valueOrNa(data.issues), "num"], [",", "fg"]] },
    { tokens: [['  "contributions"', "prop"], [": ", "fg"], [String(data.contributionsYear ?? 0), "num"], [",", "fg"]] },
    { tokens: [['  "currentStreak"', "prop"], [": ", "fg"], [String(streak.current), "num"], [",", "fg"]] },
    { tokens: [['  "longestStreak"', "prop"], [": ", "fg"], [String(streak.longest), "num"]] },
    { tokens: [["}", "fg"]] }
  ];
  body += codeBlock(p, e.x, e.y + 8, half, json, { size: 13, lineH: 21, gutter: 44 });

  // ---- Editor group 2: languages.
  const gx = e.x + half;
  const gw = e.w - half;
  body += tabStrip(p, gx, e.y - 35, gw, [{ label: "languages.md", badge: "md", active: true }]);
  body += rect(gx, e.y, gw, e.h, p.bg) + vline(gx, e.y - 35, e.h + 35, p.line);
  body += text(gx + 20, e.y + 26, "## Languages", { size: 13, fill: p.kw, family: MONO, weight: 700 });
  const langs = Array.isArray(data.languages) ? data.languages : [];
  if (langs.length === 0) body += text(gx + 20, e.y + 52, "No language data.", { size: 13, fill: p.dim });
  langs.slice(0, 6).forEach(({ name, pct }, i) => {
    const ly = e.y + 44 + i * 24;
    const color = name === "Other" ? p.faint : (languageColors[name] ?? p.dim);
    let row = `<circle cx="${gx + 25}" cy="${ly + 8}" r="4.5" fill="${color}"/>`;
    row += text(gx + 36, ly + 12.5, fit(name, 110, 13), { size: 13, fill: p.fg });
    const bx = gx + 150, bw = gw - 150 - 64;
    row += rect(bx, ly + 4, bw, 8, p.chip, 'rx="4"');
    row += rect(bx, ly + 4, Math.max(4, (pct / 100) * bw), 8, color, 'rx="4"');
    row += text(gx + gw - 20, ly + 12.5, `${Math.round(pct)}%`, { size: 12, fill: p.dim, anchor: "end", family: MONO });
    body += fadeIn(row, 0.15 + i * 0.05);
  });

  // ---- Panel: contribution heatmap.
  const days = Object.keys(data.contributions ?? {}).sort();
  const lastDay = days.at(-1);
  const today = lastDay ? new Date(`${lastDay}T00:00:00Z`) : new Date();
  const firstSunday = addDays(today, -(today.getUTCDay() + (NUM_WEEKS - 1) * 7));
  const cell = 8, step = 10;
  const hx = c.x + 20, hy = c.y + 6;
  let heat = "";
  for (let col = 0; col < NUM_WEEKS; col += 1) {
    for (let row = 0; row < 7; row += 1) {
      const date = addDays(firstSunday, col * 7 + row);
      if (date > today) continue;
      const iso = toIsoDate(date);
      const count = data.contributions?.[iso] ?? 0;
      heat += `<rect x="${hx + col * step}" y="${hy + row * step}" width="${cell}" height="${cell}" rx="2" fill="${p.heat[levelFromCount(count)]}"><title>${esc(`${iso}: ${count}`)}</title></rect>`;
    }
  }
  body += fadeIn(heat, 0.3);
  const tx = hx + NUM_WEEKS * step + 20;
  body += text(tx, hy + 16, formatNumber(data.contributionsYear ?? 0), { size: 22, weight: 600, fill: p.fg });
  body += text(tx, hy + 36, "contributions this year", { size: 12, fill: p.dim });
  body += text(tx, hy + 62, `PRs ${data.prs === null ? "n/a" : formatNumber(data.prs)} · Issues ${data.issues === null ? "n/a" : formatNumber(data.issues)}`, { size: 12, fill: p.dim });
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `${user} — workspace`,
    label: `GitHub dashboard card for ${user}`,
    body
  });
}
