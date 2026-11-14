// Windows 98 desktop for the dashboard card: teal desktop, taskbar, and three program windows
// (profile + stats, contributions + streak, languages) arranged like an open session.
import { addDays, toIsoDate } from "../constants.js";
import {
  C, ICONS, etchedH, fit, formatNumber, groupBox, progressBlocks, raised, skinName, statusBar, sunken, svgDocument, text, windowFrame
} from "./kit.js";

const WIDTH = 1029;
const HEIGHT = 594;
const TASKBAR_H = 28;
const GRAPH_WEEKS = 26;
const SPARK_DAYS = 30;
// Contribution levels: white for none, then a blue ramp like the defragmenter.
const LEVELS = ["#ffffff", "#a8a8ff", "#5f5fff", "#0000ff", "#000080"];

function formatCompact(value) {
  const n = Number(value ?? 0);
  if (n < 10000) return formatNumber(n);
  if (n < 1000000) return `${(n / 1000).toFixed(n < 100000 ? 1 : 0)}k`;
  return `${(n / 1000000).toFixed(1)}M`;
}

function valueOrNa(value, format = formatCompact) {
  return value === null || value === undefined ? "n/a" : format(value);
}

function formatSince(createdAt) {
  if (!createdAt) return "n/a";
  const created = new Date(createdAt);
  const years = Math.floor((Date.now() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${created.getUTCFullYear()} (${years}y)`;
}

const plural = (n, word) => `${formatNumber(n)} ${word}${n === 1 ? "" : "s"}`;

// 16x16 "chart" icon for the contributions window (original drawing).
function chartIcon(x, y) {
  return `<rect x="${x + 1.5}" y="${y + 1.5}" width="13" height="13" fill="${C.white}" stroke="${C.dark}"/>`
    + `<rect x="${x + 4}" y="${y + 8}" width="2" height="5" fill="${C.navy}"/><rect x="${x + 7}" y="${y + 4}" width="2" height="9" fill="${C.navy}"/><rect x="${x + 10}" y="${y + 6}" width="2" height="7" fill="${C.navy}"/>`;
}

// 32x32 recycle-bin style wastebasket (original drawing, drawn at 2px pixels).
function binIcon(x, y) {
  return `<path d="M${x + 6.5} ${y + 6.5}H${x + 25.5}L${x + 23.5} ${y + 29.5}H${x + 8.5}Z" fill="${C.light}" stroke="${C.dark}"/>`
    + `<rect x="${x + 4.5}" y="${y + 3.5}" width="23" height="4" fill="${C.face}" stroke="${C.dark}"/>`
    + [12, 16, 20].map((lx) => `<path d="M${x + lx + 0.5} ${y + 10}V${y + 27}" stroke="${C.shadow}"/>`).join("");
}

function desktopIcon(x, y, icon, label) {
  // Icons are 32px; the caption is centred under them like the real desktop.
  return icon(x + 22, y)
    + text(x + 38, y + 46, fit(label, 74, 11), { size: 11, anchor: "middle", fill: C.white });
}

function profileWindow(win, data) {
  const { x, y, w } = win;
  const topLang = data.languages.find((lang) => lang.name !== "Other")?.name ?? "n/a";
  const rightEdge = x + w - 12;
  let out = "";
  out += ICONS.computer(x + 12, y + 10, 2);
  out += text(x + 56, y + 24, fit(data.name || data.login, rightEdge - x - 56, 12, true), { weight: 700 });
  out += text(x + 56, y + 40, fit(`@${data.login}`, rightEdge - x - 56, 11), { size: 11, fill: C.disabled });
  out += etchedH(x + 10, y + 52, rightEdge - x - 10);

  const rows = [
    ["Repos:", data.publicRepos === null ? "n/a" : `${formatNumber(data.publicRepos)} public`],
    ["Followers:", valueOrNa(data.followers)],
    ["Stars:", data.stars === null ? "n/a" : `${formatCompact(data.stars)} earned`],
    ["Since:", formatSince(data.createdAt)],
    ["Top lang:", topLang],
    ["Uptime:", `${data.streak.current}d streak`]
  ];
  rows.forEach(([label, value], i) => {
    const ry = y + 74 + i * 18;
    out += text(x + 14, ry, label);
    out += text(x + 100, ry, fit(value, rightEdge - x - 100));
  });

  const gy = y + 74 + rows.length * 18 + 8;
  const gw = rightEdge - x - 10;
  out += groupBox(x + 10, gy, gw, 76, "Statistics");
  const stats = [
    ["Stars:", data.stars], ["Pull requests:", data.prs],
    ["Issues:", data.issues], ["Contribs/yr:", data.contributionsYear]
  ];
  const colW = (gw - 24) / 2;
  stats.forEach(([label, value], i) => {
    const cx = x + 20 + (i % 2) * (colW + 8);
    const cy = gy + 16 + Math.floor(i / 2) * 27;
    out += text(cx, cy + 14, label);
    out += sunken(cx + colW - 70, cy, 66, 20);
    out += text(cx + colW - 10, cy + 14, valueOrNa(value), { anchor: "end" });
  });
  return out;
}

function contributionsWindow(win, data, today) {
  const { x, y, w } = win;
  let out = "";

  // Graph: last 26 weeks, quartile levels of active days (same rules as the terminal card).
  const lastSunday = addDays(today, -today.getDay());
  const firstSunday = addDays(lastSunday, -(GRAPH_WEEKS - 1) * 7);
  const activeCounts = [];
  for (let i = 0; i < GRAPH_WEEKS * 7; i += 1) {
    const count = data.contributions[toIsoDate(addDays(firstSunday, i))] ?? 0;
    if (count > 0) activeCounts.push(count);
  }
  activeCounts.sort((a, b) => a - b);
  const quartile = (q) => activeCounts[Math.min(activeCounts.length - 1, Math.floor(activeCounts.length * q))] ?? 0;
  const thresholds = [quartile(0.25), quartile(0.5), quartile(0.75)];
  const levelFor = (count) => (count === 0 ? 0 : 1 + thresholds.filter((t) => count > t).length);

  const boxX = x + 8, boxY = y + 8, boxW = w - 16, boxH = 150;
  out += sunken(boxX, boxY, boxW, boxH);
  const cell = 14, step = 16;
  const gridW = GRAPH_WEEKS * step - 2;
  const gx = boxX + Math.round((boxW - 36 - gridW) / 2) + 36;
  const gy = boxY + 28;
  let lastMonthEnd = -Infinity;
  let total = 0;
  for (let wk = 0; wk < GRAPH_WEEKS; wk += 1) {
    const weekStart = addDays(firstSunday, wk * 7);
    const cx = gx + wk * step;
    const monthStarts = wk === 0 || weekStart.getMonth() !== addDays(weekStart, -7).getMonth();
    if (monthStarts && cx > lastMonthEnd + 4 && cx + 24 <= gx + gridW) {
      out += text(cx, gy - 8, weekStart.toLocaleString("en-US", { month: "short" }), { size: 11 });
      lastMonthEnd = cx + 24;
    }
    for (let d = 0; d < 7; d += 1) {
      const date = addDays(weekStart, d);
      if (date > today) continue;
      const count = data.contributions[toIsoDate(date)] ?? 0;
      total += count;
      out += `<rect class="w98-in" style="animation-delay:${(0.2 + wk * 0.02).toFixed(2)}s" x="${cx + 0.5}" y="${gy + d * step + 0.5}" width="${cell - 1}" height="${cell - 1}" fill="${LEVELS[levelFor(count)]}" stroke="${C.shadow}"/>`;
    }
  }
  [[1, "Mon"], [3, "Wed"], [5, "Fri"]].forEach(([d, label]) => {
    out += text(gx - 8, gy + d * step + 11, label, { size: 11, anchor: "end" });
  });

  const legendY = boxY + boxH + 18;
  out += text(boxX + 2, legendY, fit(`${formatNumber(total)} contributions in ${GRAPH_WEEKS} weeks`, boxW - 170));
  const legendX = boxX + boxW - 4 - 5 * 14 - 34;
  out += text(legendX - 6, legendY, "Less", { size: 11, anchor: "end" });
  LEVELS.forEach((fill, i) => {
    out += `<rect x="${legendX + i * 14 + 0.5}" y="${legendY - 10.5}" width="11" height="11" fill="${fill}" stroke="${C.shadow}"/>`;
  });
  out += text(legendX + 5 * 14 + 4, legendY, "More", { size: 11 });

  // Streak group: current/longest, progress to best, last 30 days.
  const sx = x + 8, sy = legendY + 18, sw = w - 16, sh = 162;
  out += groupBox(sx, sy, sw, sh, "Streak");
  const { current, longest } = data.streak;
  out += text(sx + 12, sy + 30, "Current streak:");
  out += sunken(sx + 110, sy + 16, 90, 21);
  out += text(sx + 194, sy + 31, plural(current, "day"), { anchor: "end" });
  out += text(sx + 236, sy + 30, "Longest streak:");
  out += sunken(sx + 336, sy + 16, 90, 21);
  out += text(sx + 420, sy + 31, plural(longest, "day"), { anchor: "end" });

  const ratio = longest > 0 ? current / longest : 0;
  out += text(sx + 12, sy + 61, "Of best:");
  out += progressBlocks(sx + 110, sy + 47, 316, 19, ratio, { delay: 0.4 });
  out += text(sx + 436, sy + 61, `${Math.round(ratio * 100)}%`);

  out += text(sx + 12, sy + 92, "Last 30 days:");
  const counts = [];
  for (let i = SPARK_DAYS - 1; i >= 0; i -= 1) {
    counts.push(data.contributions[toIsoDate(addDays(today, -i))] ?? 0);
  }
  const max = Math.max(1, ...counts);
  const chartX = sx + 110, chartY = sy + 78, chartW = SPARK_DAYS * 10 + 6, chartH = 52;
  out += sunken(chartX, chartY, chartW, chartH);
  counts.forEach((count, i) => {
    const bh = count === 0 ? 1 : Math.max(3, Math.round(Math.sqrt(count / max) * (chartH - 8)));
    out += `<rect x="${chartX + 4 + i * 10}" y="${chartY + chartH - 3 - bh}" width="8" height="${bh}" fill="${count === 0 ? C.face : C.navy}"/>`;
  });
  out += text(chartX, chartY + chartH + 14, "30d ago", { size: 11, fill: C.disabled });
  out += text(chartX + chartW, chartY + chartH + 14, "today", { size: 11, fill: C.disabled, anchor: "end" });
  return out;
}

function languagesWindow(win, data, languageColors) {
  const { x, y, w, h } = win;
  let out = "";
  if (data.languages.length === 0) {
    out += text(x + 12, y + 24, "No language data", { fill: C.disabled });
  }
  data.languages.forEach(({ name, pct }, i) => {
    const ry = y + 10 + i * 30;
    out += `<rect x="${x + 12.5}" y="${ry + 3.5}" width="11" height="11" fill="${languageColors[name] ?? C.shadow}" stroke="${C.dark}"/>`;
    out += text(x + 30, ry + 14, fit(name, 88));
    out += progressBlocks(x + 122, ry, w - 122 - 52, 19, pct / 100, { delay: 0.6 + i * 0.1, step: 0.02 });
    out += text(x + w - 10, ry + 14, `${pct}%`, { anchor: "end" });
  });
  out += statusBar(x, y + h - 21, w, [{ text: `${data.languages.length} language(s)`, w: 130 }, { text: "By repository count" }]);
  return out;
}

// ---- Windows XP desktop (winxp skin) ----
// An original rolling-hill landscape in the spirit of the XP default desktop (not the photo).
function xpDesktop() {
  const horizon = HEIGHT * 0.62;
  return `<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#xp-sky)"/>`
    + [[180, 70, 120, 26], [300, 92, 90, 18], [640, 60, 150, 30], [820, 110, 110, 20], [470, 140, 80, 14]]
      .map(([cx, cy, rx, ry]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#ffffff" opacity="0.55"/><ellipse cx="${cx + rx * 0.35}" cy="${cy - ry * 0.4}" rx="${rx * 0.55}" ry="${ry * 0.8}" fill="#ffffff" opacity="0.45"/>`).join("")
    + `<path d="M0 ${horizon + 40}C${WIDTH * 0.2} ${horizon - 70} ${WIDTH * 0.55} ${horizon - 60} ${WIDTH} ${horizon + 10}V${HEIGHT}H0Z" fill="url(#xp-hill-back)"/>`
    + `<path d="M0 ${horizon + 90}C${WIDTH * 0.25} ${horizon - 10} ${WIDTH * 0.6} ${horizon + 30} ${WIDTH} ${horizon + 80}V${HEIGHT}H0Z" fill="url(#xp-hill)"/>`;
}

function xpDefs() {
  return `<linearGradient id="xp-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fdc"/><stop offset=".45" stop-color="#6aa6ec"/><stop offset=".7" stop-color="#b9d9f6"/></linearGradient>`
    + `<linearGradient id="xp-hill-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc24a"/><stop offset="1" stop-color="#3f8f25"/></linearGradient>`
    + `<linearGradient id="xp-hill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6ab83a"/><stop offset=".5" stop-color="#3d9a24"/><stop offset="1" stop-color="#256f17"/></linearGradient>`
    + `<linearGradient id="xp-bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d95ff"/><stop offset=".08" stop-color="#2b71e8"/><stop offset=".5" stop-color="#245edb"/><stop offset="1" stop-color="#1941a5"/></linearGradient>`
    + `<linearGradient id="xp-start" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5eb95e"/><stop offset=".15" stop-color="#3c9c3c"/><stop offset=".85" stop-color="#2f8a2f"/><stop offset="1" stop-color="#1f6b1f"/></linearGradient>`
    + `<linearGradient id="xp-task" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a9bf6"/><stop offset="1" stop-color="#3876e8"/></linearGradient>`
    + `<linearGradient id="xp-task-on" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c4fb8"/><stop offset="1" stop-color="#2a63d4"/></linearGradient>`
    + `<linearGradient id="xp-tray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14a3f5"/><stop offset="1" stop-color="#0d8adf"/></linearGradient>`;
}

function xpTaskbar(tasks, trayText) {
  const ty = HEIGHT - TASKBAR_H;
  let out = `<rect x="0" y="${ty}" width="${WIDTH}" height="${TASKBAR_H}" fill="url(#xp-bar)"/>`;
  // Green start button with a rounded right edge.
  out += `<path d="M0 ${ty}H92q12 0 12 ${TASKBAR_H / 2}q0 ${TASKBAR_H / 2} -12 ${TASKBAR_H / 2}H0Z" fill="url(#xp-start)"/>`;
  out += ICONS.computer(8, ty + 6);
  out += text(31, ty + 20, "start", { size: 17, weight: 700, fill: "#0e3d0e", extra: 'font-style="italic"', family: "'Trebuchet MS', Tahoma, sans-serif" });
  out += text(30, ty + 19, "start", { size: 17, weight: 700, fill: "#ffffff", extra: 'font-style="italic"', family: "'Trebuchet MS', Tahoma, sans-serif" });
  const btnW = 160;
  tasks.forEach(([label, icon, active], i) => {
    const x = 114 + i * (btnW + 4);
    out += `<rect x="${x + 0.5}" y="${ty + 3.5}" width="${btnW - 1}" height="${TASKBAR_H - 7}" rx="3" fill="url(#${active ? "xp-task-on" : "xp-task"})" stroke="${active ? "#163e93" : "#2a62d6"}"/>`;
    out += icon(x + 5, ty + 6);
    out += text(x + 26, ty + 18, fit(label, btnW - 32, 11, active), { size: 11, weight: active ? 700 : undefined, fill: "#ffffff" });
  });
  const trayW = 100;
  const trayX = WIDTH - trayW;
  out += `<rect x="${trayX}" y="${ty}" width="${trayW}" height="${TASKBAR_H}" fill="url(#xp-tray)"/><path d="M${trayX + 0.5} ${ty}V${HEIGHT}" stroke="#0c5ec0"/>`;
  out += chartIcon(trayX + 8, ty + 6);
  out += text(WIDTH - 10, ty + 18, trayText, { size: 11, anchor: "end", fill: "#ffffff" });
  return out;
}

function taskButton(x, y, w, label, icon, active) {
  let out = active ? sunken(x, y, w, 22, { fill: C.face }) : raised(x, y, w, 22);
  if (active) {
    out += `<rect x="${x + 2}" y="${y + 2}" width="${w - 4}" height="18" fill="url(#w98-desk-dither)"/>`;
  }
  out += icon(x + 4, y + 3);
  out += text(x + 24, y + 15, fit(label, w - 30, 11, active), { size: 11, weight: active ? 700 : undefined });
  return out;
}

export function renderWin98Dashboard(data, { githubId, scale, languageColors = {} } = {}) {
  const user = data.login || githubId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const xp = skinName() === "winxp";
  let body = xp ? xpDesktop() : `<rect width="${WIDTH}" height="${HEIGHT}" fill="${C.desktop}"/>`;

  // Desktop icons.
  body += desktopIcon(4, 12, (ix, iy) => ICONS.computer(ix, iy, 2), "My GitHub");
  body += desktopIcon(4, 84, (ix, iy) => ICONS.folder(ix, iy, 2), "Repositories");
  body += desktopIcon(4, 156, (ix, iy) => ICONS.envelope(ix, iy, 2), "Inbox");
  body += desktopIcon(WIDTH - 88, HEIGHT - TASKBAR_H - 70, binIcon, "Recycle Bin");

  // Windows, back to front: profile and languages are inactive, contributions is active on top.
  const profile = windowFrame(92, 12, 392, 304, `Profile - ${user}`, { icon: ICONS.computer, active: false });
  body += `<g class="w98-fade">${profile.svg}${profileWindow(profile.client, data)}</g>`;

  const langs = windowFrame(104, 298, 360, 214, "Languages", { icon: ICONS.folder, active: false, controls: ["min", "close"] });
  body += `<g class="w98-fade" style="animation-delay:0.1s">${langs.svg}${languagesWindow(langs.client, data, languageColors)}</g>`;

  const contrib = windowFrame(468, 28, 544, 398, `Contributions - ${user}`, { icon: chartIcon });
  body += `<g class="w98-fade" style="animation-delay:0.2s">${contrib.svg}${contributionsWindow(contrib.client, data, today)}</g>`;

  // Tray: the calendar's last day, so the card never shows a live clock.
  const lastDay = Object.keys(data.contributions).sort().at(-1);
  const trayText = lastDay ? `${lastDay.slice(5, 7)}/${lastDay.slice(8, 10)}/${lastDay.slice(0, 4)}` : "";
  const tasks = [[`Profile - ${user}`, ICONS.computer, false], ["Languages", ICONS.folder, false], [`Contributions - ${user}`, chartIcon, true]];

  if (xp) {
    body += xpTaskbar(tasks, trayText);
  } else {
    // Taskbar.
    const ty = HEIGHT - TASKBAR_H;
    body += `<rect x="0" y="${ty}" width="${WIDTH}" height="${TASKBAR_H}" fill="${C.face}"/>`;
    body += `<path d="M0 ${ty + 0.5}H${WIDTH}" stroke="${C.light}"/><path d="M0 ${ty + 1.5}H${WIDTH}" stroke="${C.white}"/>`;
    body += raised(2, ty + 4, 56, 22);
    body += ICONS.computer(6, ty + 7);
    body += text(25, ty + 19, "Start", { weight: 700 });
    body += `<path d="M62.5 ${ty + 4}V${ty + 26}" stroke="${C.shadow}"/><path d="M63.5 ${ty + 4}V${ty + 26}" stroke="${C.white}"/>`;

    const trayW = 92;
    const btnW = 160;
    tasks.forEach(([label, icon, active], i) => {
      body += taskButton(68 + i * (btnW + 3), ty + 4, btnW, label, icon, active);
    });

    const trayX = WIDTH - trayW - 3;
    body += sunken(trayX, ty + 4, trayW, 22, { fill: C.face });
    body += chartIcon(trayX + 4, ty + 7);
    body += text(trayX + trayW - 6, ty + 19, trayText, { size: 11, anchor: "end" });
  }

  const defs = (xp ? xpDefs() : "") + `<pattern id="w98-desk-dither" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${C.white}"/><rect width="1" height="1" fill="${C.face}"/><rect x="1" y="1" width="1" height="1" fill="${C.face}"/></pattern>`;

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title: `Desktop - ${user}`,
    label: `GitHub dashboard card for ${user}`,
    body,
    defs
  });
}
