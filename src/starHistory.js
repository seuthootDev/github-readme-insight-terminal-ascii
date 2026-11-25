// Star history card: cumulative stargazers of one repository over time.
// Terminal themes draw block-character columns; win98/winxp and editor have their own screens.
import { THEMES, isEditor, isWin98 } from "./themes.js";
import { REDUCED_MOTION_CSS } from "./constants.js";
import {
  POWERSHELL_ICON_DATA_URI,
  addTextSpans,
  buildRepoPrompt,
  escapeXml,
  fetchJson,
  formatNumber,
  promptPartsWidth,
  resolveOutputScale,
  resolveRepoTarget
} from "./repoCard.js";
import { renderWin98StarHistory } from "./win98/starHistory.js";
import { withSkin } from "./win98/skin.js";
import { renderEditorStarHistory } from "./editor/starHistory.js";

const GITHUB_API_BASE = "https://api.github.com";
const STAR_ACCEPT = "application/vnd.github.star+json"; // adds starred_at to every stargazer
const PER_PAGE = 100;
const MAX_PAGES = 10; // requests per card; bigger repos are sampled across their pages
const API_PAGE_LIMIT = 400; // GitHub stops paginating stargazers after 40,000
const DAY = 86_400_000;
const STARGAZERS_ERROR = "GitHub refused the stargazer list. The server needs a GITHUB_TOKEN that is allowed to list stargazers.";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Pages to request: all of them when there are few, otherwise MAX_PAGES spread evenly.
export function pickPages(totalStars) {
  const pages = Math.min(API_PAGE_LIMIT, Math.ceil(totalStars / PER_PAGE));
  if (pages <= MAX_PAGES) return Array.from({ length: pages }, (_, i) => i + 1);
  const picked = new Set();
  for (let i = 0; i < MAX_PAGES; i += 1) picked.add(Math.round(1 + (i * (pages - 1)) / (MAX_PAGES - 1)));
  return [...picked];
}

async function fetchStarHistory(owner, name) {
  const base = `${GITHUB_API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  const repo = await fetchJson(base, "GitHub repository not found.");
  if (repo.private) throw new Error("GitHub repository not found.");
  const total = Number(repo.stargazers_count ?? 0);
  const pages = pickPages(total);
  // GitHub only lists stargazers to authenticated callers, and some tokens get a 404 instead.
  const results = await Promise.all(pages.map((page) => fetchJson(`${base}/stargazers?per_page=${PER_PAGE}&page=${page}`, STARGAZERS_ERROR, STAR_ACCEPT)
    .catch((error) => { throw /HTTP 401/.test(error.message) ? new Error(STARGAZERS_ERROR) : error; })));
  const points = [];
  results.forEach((list, i) => {
    if (!Array.isArray(list)) return;
    list.forEach((entry, j) => {
      const t = Date.parse(entry?.starred_at ?? "");
      if (Number.isFinite(t)) points.push({ t, count: (pages[i] - 1) * PER_PAGE + j + 1 });
    });
  });
  points.sort((a, b) => a.t - b.t || a.count - b.count);
  const complete = pages.length === Math.ceil(total / PER_PAGE) && points.length >= total;
  return { repo, total, points, complete, pagesFetched: pages.length };
}

// Turns the raw points into a function: stars at time t. Exact when every page was read,
// linear between sampled points otherwise.
export function buildHistory({ total, points, complete }, now = Date.now()) {
  const pts = points.length ? [...points] : [];
  if (!pts.length || pts[pts.length - 1].count < total) pts.push({ t: now, count: total });
  const countAt = (t) => {
    if (!pts.length || t < pts[0].t) return 0;
    let lo = 0, hi = pts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (pts[mid].t <= t) lo = mid; else hi = mid - 1;
    }
    const a = pts[lo], b = pts[lo + 1];
    if (complete || !b || a.t === t) return a.count;
    return Math.round(a.count + ((b.count - a.count) * (t - a.t)) / (b.t - a.t));
  };
  const first = pts.length && total > 0 ? pts[0].t : null;
  const weeks = first === null ? 0 : Math.max(1, Math.ceil((now - first) / (7 * DAY)));
  const last30 = total - countAt(now - 30 * DAY);
  return { countAt, first, now, weeks, total, last30, approx: !complete, avgPerWeek: weeks ? total / weeks : 0 };
}

// `n` evenly spaced samples from the first star to now (at most one per week).
export function sampleSeries(history, maxPoints) {
  if (history.first === null) return [];
  const n = Math.max(2, Math.min(maxPoints, history.weeks + 1));
  const span = history.now - history.first;
  return Array.from({ length: n }, (_, i) => {
    const t = history.first + (span * i) / (n - 1);
    return { t, total: history.countAt(t) };
  });
}

// Axis labels where the month (or the year, for long histories) changes, at least `minGap` samples apart.
export function seriesTicks(series, minGap = 3) {
  if (series.length < 2) return [];
  const years = (series[series.length - 1].t - series[0].t) / (365 * DAY) > 2;
  const key = (t) => { const d = new Date(t); return years ? d.getUTCFullYear() : d.getUTCFullYear() * 12 + d.getUTCMonth(); };
  const ticks = [];
  for (let i = 1; i < series.length; i += 1) {
    if (key(series[i].t) === key(series[i - 1].t)) continue;
    if (ticks.length && i - ticks[ticks.length - 1].i < minGap) continue;
    const d = new Date(series[i].t);
    ticks.push({ i, label: years ? String(d.getUTCFullYear()) : MONTHS[d.getUTCMonth()] });
  }
  return ticks;
}

// A round axis maximum: five steps of 1, 2, 2.5, 3, 4 or 5 × 10^k that reach `max`.
export function niceTop(max) {
  if (max <= 5) return 5;
  const raw = max / 5;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 3, 4, 5, 10].map((m) => m * mag).find((s) => s >= raw);
  return step * 5;
}

export function compactCount(n) {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(Math.round(v));
}

export function isoDay(t) {
  return t === null ? "" : new Date(t).toISOString().slice(0, 10);
}

function terminalCard(themeName, user, fullName, history, options) {
  const theme = THEMES[themeName];
  const p = theme.palette;
  const FONT = "Consolas, Menlo, monospace";
  const fs = 14, lh = 19, cw = fs * 0.6;
  const promptParts = buildRepoPrompt(themeName, user);
  const promptW = promptPartsWidth(promptParts, 15);
  const command = `github-cli stars --repo ${fullName}`;
  const width = Math.max(900, Math.ceil(44 + promptW + 3 + command.length * 15 * 0.6 + 60));
  const termX = 20, termY = 20, headerH = 40, termW = width - 40;

  const rows = 10;
  const top = niceTop(Math.max(1, history.total));
  const labels = Array.from({ length: rows / 2 }, (_, k) => compactCount((top * (k + 1)) / (rows / 2)));
  const labelChars = Math.max(...labels.map((l) => l.length));
  const x0 = 44 + cw * (labelChars + 2);
  const plotW = width - 44 - x0;
  const series = sampleSeries(history, Math.floor(plotW / (cw * 3)));
  const slot = series.length ? plotW / series.length : plotW;
  const bar = Math.max(2, Math.min(4, Math.floor(slot / cw) - 1));
  const pad = (slot - bar * cw) / 2;

  const promptY = 86;
  const fetchY = promptY + 24;
  const chartTop = fetchY + 14;
  const axisY = chartTop + rows * lh + 6;
  const ticksY = axisY + lh;
  const summaryY = ticksY + lh + 10;
  const bottomY = summaryY + lh + 8;
  const termH = bottomY + 24 - termY;
  const height = termY + termH + 20;
  const scale = resolveOutputScale(options.scale);

  const delay = (s) => `class="sh-in" style="animation-delay:${s.toFixed(2)}s"`;
  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(width * scale)}" height="${Math.round(height * scale)}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Star history of ${escapeXml(fullName)}">`);
  svg.push(`<title>${escapeXml(theme.title(user))}</title>`);
  svg.push(`<defs><style>
  .sh-in { opacity: 0; animation: sh-in 0.01s linear forwards; }
  @keyframes sh-in { to { opacity: 1; } }
  .cursor { animation: blink 0.8s steps(1, end) infinite; }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .sh-in { opacity: 1 !important; } }
  ${REDUCED_MOTION_CSS}</style></defs>`);

  svg.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + headerH}" width="${termW - 2}" height="${termH - headerH - 1}" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (themeName === "windows" && POWERSHELL_ICON_DATA_URI) {
    svg.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  const controlsX = themeName === "mac" ? termX + 18 : themeName === "windows" ? termX + termW - 74 : termX + termW - 62;
  svg.push(theme.controlsSvg(controlsX, termY + 20));
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="${FONT}" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(user))}</text>`);

  svg.push(addTextSpans(promptParts, 44, promptY, 15));
  svg.push(`<text x="${44 + promptW + 3}" y="${promptY}" fill="${theme.text}" font-size="15" font-family="${FONT}">${escapeXml(command)}</text>`);
  const pagesNote = history.approx ? `${options.pagesFetched} sampled pages` : `${options.pagesFetched} page${options.pagesFetched === 1 ? "" : "s"}`;
  svg.push(`<text ${delay(0.3)} x="44" y="${fetchY}" font-size="13" font-family="${FONT}"><tspan fill="${p.mute}">fetching stargazers… </tspan><tspan fill="${theme.accentSuccess}">✔ ${escapeXml(formatNumber(history.total))} stars · ${escapeXml(pagesNote)}</tspan></text>`);

  // Y axis: a label on every other row, the plot as cell-sized blocks like a terminal font draws them.
  for (let r = 1; r <= rows; r += 1) {
    const ry = chartTop + (rows - r + 1) * lh;
    const text = r % 2 === 0 ? `${labels[r / 2 - 1].padStart(labelChars)} ┤` : `${" ".repeat(labelChars)} │`;
    svg.push(`<text x="44" y="${ry}" font-size="${fs}" font-family="${FONT}" fill="${p.mute}" xml:space="preserve">${text}</text>`);
  }
  if (series.length) {
    const cellH = lh - 3;
    series.forEach((point, i) => {
      const filled = (point.total / top) * rows;
      const full = Math.floor(filled);
      const half = filled - full >= 0.5;
      if (full === 0 && !half) return;
      const color = i >= series.length - 4 ? p.graph[3] : p.graph[2];
      const bx = (x0 + i * slot + pad).toFixed(1);
      const bw = (bar * cw).toFixed(1);
      let cells = "";
      for (let c = 0; c < full; c += 1) {
        cells += `<rect x="${bx}" y="${(chartTop + (rows - c) * lh - cellH + 5).toFixed(1)}" width="${bw}" height="${cellH}" fill="${color}"/>`;
      }
      if (half && full < rows) {
        cells += `<rect x="${bx}" y="${(chartTop + (rows - full) * lh - cellH / 2 + 5).toFixed(1)}" width="${bw}" height="${(cellH / 2).toFixed(1)}" fill="${color}"/>`;
      }
      svg.push(`<g ${delay(0.5 + i * (1 / series.length))}>${cells}</g>`);
    });
  } else {
    svg.push(`<text x="${x0 + 16}" y="${chartTop + rows * lh * 0.55}" font-size="${fs}" font-family="${FONT}" fill="${p.mute}">no stargazers yet</text>`);
  }
  svg.push(`<text x="44" y="${axisY}" font-size="${fs}" font-family="${FONT}" fill="${p.mute}" xml:space="preserve">${" ".repeat(labelChars + 1)}└</text>`);
  svg.push(`<path d="M${(44 + cw * (labelChars + 2)).toFixed(1)} ${axisY - 4.5}H${width - 44}" stroke="${p.mute}"/>`);
  for (const tick of seriesTicks(series, Math.ceil((cw * 5) / slot))) {
    svg.push(`<text x="${(x0 + tick.i * slot + pad).toFixed(1)}" y="${ticksY}" font-size="${fs}" font-family="${FONT}" fill="${p.mute}">${tick.label}</text>`);
  }

  const spark = series.map((pt) => "▁▂▃▄▅▆▇█"[Math.min(7, Math.floor((pt.total * 8) / (top + 1)))]).join("");
  const approx = history.approx ? "~" : "";
  const summary = `<tspan fill="${p.yellow}">★ ${escapeXml(formatNumber(history.total))}</tspan><tspan fill="${p.mute}"> total   </tspan>`
    + `<tspan fill="${p.green}">${approx}+${escapeXml(formatNumber(history.last30))}</tspan><tspan fill="${p.mute}"> last 30d   first </tspan>`
    + `<tspan fill="${theme.text}">${history.first === null ? "—" : isoDay(history.first)}</tspan>`
    + (spark ? `<tspan fill="${p.mute}">   trend </tspan><tspan fill="${p.graph[3]}">${spark.slice(-32)}</tspan>` : "");
  svg.push(`<text ${delay(1.6)} x="44" y="${summaryY}" font-size="${fs}" font-family="${FONT}" xml:space="preserve">${summary}</text>`);
  svg.push(`<g ${delay(1.7)}>${addTextSpans(promptParts, 44, bottomY, 15)}<text class="cursor" x="${44 + promptW}" y="${bottomY}" fill="${p.fg}" font-size="15" font-family="${FONT}">█</text></g>`);
  svg.push(`</svg>`);
  return svg.join("\n");
}

export async function generateStarHistorySvg(themeName, githubId, options = {}) {
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }
  const { owner, name } = resolveRepoTarget(githubId, options.repo, "star-history");
  const data = await fetchStarHistory(owner, name);
  const history = buildHistory(data, Date.now());
  const fullName = data.repo.full_name ?? `${owner}/${name}`;
  const user = String(githubId ?? "").trim() || data.repo.owner?.login || owner;
  const card = { fullName, name: fullName.split("/")[1] ?? name, history, createdAt: data.repo.created_at, pagesFetched: data.pagesFetched };

  if (isEditor(themeName)) {
    return renderEditorStarHistory(card, { scale: options.scale, scheme: options.scheme, ide: options.ide });
  }
  if (isWin98(themeName)) {
    return withSkin(themeName, () => renderWin98StarHistory(card, { scale: options.scale }));
  }
  return terminalCard(themeName, user, fullName, history, { scale: options.scale, pagesFetched: data.pagesFetched });
}
