// Windows 98 "Date/Time Properties" dialog for the streak card.
import { C, FONT, ICONS, button, fit, formatNumber, groupBox, raised, sunken, svgDocument, tabPage, tabs, text, windowFrame } from "./kit.js";

const WIDTH = 710;
const HEIGHT = 392;
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseIso(iso) {
  const [yy, mm, dd] = String(iso).split("-").map(Number);
  return { yy, mm, dd };
}

function shortDate(iso) {
  const { yy, mm, dd } = parseIso(iso);
  return `${MONTHS[mm - 1].slice(0, 3)} ${dd}, ${yy}`;
}

function rangeText(range) {
  if (!range) return "No active streak";
  return range.start === range.end ? shortDate(range.start) : `${shortDate(range.start)} - ${shortDate(range.end)}`;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function arrow(cx, cy, up) {
  return up
    ? `<path d="M${cx - 3} ${cy + 1.5}h7l-3.5 -3.5z" fill="${C.dark}"/>`
    : `<path d="M${cx - 3} ${cy - 1.5}h7l-3.5 3.5z" fill="${C.dark}"/>`;
}

// Drop-down combo box: sunken field + raised arrow button.
function comboBox(x, y, w, value) {
  return sunken(x, y, w, 21)
    + text(x + 5, y + 15, value)
    + raised(x + w - 18, y + 2, 16, 17)
    + arrow(x + w - 10, y + 10, false);
}

// Spin box (year): sunken field + stacked up/down buttons.
function spinBox(x, y, w, value) {
  return sunken(x, y, w, 21)
    + text(x + 5, y + 15, value)
    + raised(x + w - 18, y + 2, 16, 9) + arrow(x + w - 10, y + 6.5, true)
    + raised(x + w - 18, y + 11, 16, 8) + arrow(x + w - 10, y + 14.5, false);
}

export function renderWin98Streak({ contributions, streak }, { githubId, scale } = {}) {
  const user = githubId;
  const x = 20, y = 20, w = WIDTH - 40, h = HEIGHT - 40;
  const title = "Date/Time Properties";
  const win = windowFrame(x, y, w, h, title, { icon: ICONS.clock, controls: ["help", "close"] });
  const { client } = win;
  let body = win.svg;

  const strip = tabs(client.x + 6, client.y + 6, ["Date & Time", "Time Zone"], 0);
  const pageX = client.x + 6, pageY = strip.bodyY, pageW = client.w - 12, pageH = 248;
  body += tabPage(pageX, pageY, pageW, pageH, strip.activeX, strip.activeW);
  body += strip.svg;

  // The calendar shows the month of the data's last day (GitHub's "today"), not the real clock.
  const endIso = streak.totalRange?.end ?? "1970-01-01";
  const { yy, mm, dd: today } = parseIso(endIso);
  const inStreak = (iso) => Boolean(streak.currentRange) && iso >= streak.currentRange.start && iso <= streak.currentRange.end;

  // ---- Date group: month combo, year spinner, calendar grid.
  const gx = pageX + 12, gy = pageY + 16, gw = 252, gh = 212;
  body += groupBox(gx, gy, gw, gh, "Date");
  body += comboBox(gx + 10, gy + 16, 128, MONTHS[mm - 1]);
  body += spinBox(gx + gw - 10 - 76, gy + 16, 76, String(yy));

  const calX = gx + 10, calY = gy + 46, calW = gw - 20, calH = 156;
  body += sunken(calX, calY, calW, calH);
  const colW = (calW - 8) / 7;
  const headH = 18, rowH = 21;
  body += `<rect x="${calX + 2}" y="${calY + 2}" width="${calW - 4}" height="${headH}" fill="${C.shadow}"/>`;
  ["S", "M", "T", "W", "T", "F", "S"].forEach((d, i) => {
    body += text(calX + 4 + colW * i + colW / 2, calY + 15, d, { anchor: "middle", fill: C.white });
  });
  const firstDow = new Date(Date.UTC(yy, mm - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  let cells = "";
  for (let day = 1; day <= daysInMonth; day += 1) {
    const slot = firstDow + day - 1;
    const col = slot % 7, row = Math.floor(slot / 7);
    const cx = calX + 4 + colW * col, cy = calY + headH + 6 + row * rowH;
    const iso = `${yy}-${pad(mm)}-${pad(day)}`;
    const count = contributions[iso] ?? 0;
    const selected = inStreak(iso);
    const future = day > today;
    if (selected) {
      cells += `<rect x="${(cx + 2).toFixed(1)}" y="${cy}" width="${(colW - 4).toFixed(1)}" height="${rowH - 3}" fill="${C.select}"/>`;
    }
    if (day === today) {
      cells += `<rect x="${(cx + 2.5).toFixed(1)}" y="${cy + 0.5}" width="${(colW - 5).toFixed(1)}" height="${rowH - 4}" fill="none" stroke="${selected ? C.white : C.dark}" stroke-dasharray="1 1"/>`;
    }
    const fill = selected ? C.selectText : future ? C.disabled : C.text;
    const tip = `${iso}: ${count} contribution${count === 1 ? "" : "s"}`;
    cells += `<text x="${(cx + colW / 2).toFixed(1)}" y="${cy + 13}" font-size="12" font-family="${FONT}" fill="${fill}" text-anchor="middle"${count > 0 && !selected ? ' font-weight="700"' : ""}><title>${tip}</title>${day}</text>`;
  }
  body += cells;

  // ---- Streak group: three sunken value fields with their date ranges.
  const sx = gx + gw + 12, sy = gy, sw = pageX + pageW - 12 - sx, sh = 168;
  body += groupBox(sx, sy, sw, sh, "Contribution Streak");
  const rows = [
    ["Total Contributions:", streak.totalContributions, streak.totalRange ? rangeText(streak.totalRange) : "No contributions"],
    ["Current Streak:", streak.currentStreak, rangeText(streak.currentRange)],
    ["Longest Streak:", streak.longestStreak, rangeText(streak.longestRange)]
  ];
  rows.forEach(([label, value, range], i) => {
    const ry = sy + 18 + i * 48;
    const fieldW = 92;
    body += text(sx + 12, ry + 15, label);
    body += sunken(sx + sw - 12 - fieldW, ry, fieldW, 21);
    body += text(sx + sw - 18, ry + 15, i === 0 ? formatNumber(value) : `${formatNumber(value)} day${value === 1 ? "" : "s"}`, { anchor: "end" });
    body += text(sx + 12, ry + 35, fit(range, sw - 24, 11), { size: 11 });
  });

  // Legend + account line under the streak group.
  const ly = sy + sh + 14;
  body += `<rect x="${sx + 12}" y="${ly}" width="14" height="13" fill="${C.select}"/>`;
  body += text(sx + 32, ly + 11, "Current streak", { size: 11 });
  body += text(sx + 140, ly + 11, "Bold", { size: 11, weight: 700 });
  body += text(sx + 170, ly + 11, "= day with contributions", { size: 11 });
  body += text(sx + 12, ly + 33, fit(`Current time zone: GitHub Time (@${user})`, sw - 24), {});

  // Dialog buttons.
  const by = pageY + pageH + 10;
  const bw = 75, bh = 23;
  const right = pageX + pageW;
  body += button(right - bw * 3 - 12, by, bw, bh, "OK", { isDefault: true });
  body += button(right - bw * 2 - 6, by, bw, bh, "Cancel");
  body += button(right - bw, by, bw, bh, "Apply", { disabled: true });

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title: `${title} - ${user}`,
    label: `GitHub streak card for ${user}`,
    body
  });
}
