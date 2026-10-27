import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { THEMES } from "./themes.js";
import { REDUCED_MOTION_CSS } from "./constants.js";

const GITHUB_API_BASE = "https://api.github.com";
const ASCII_ACCENT = "░▒▓█▓▒░";
const DEFAULT_LINES = 8;
const MIN_LINES = 3;
const MAX_LINES = 15;
const REPO_LABEL_MAX_CHARS = 16;
const MAX_REPOS = 5;
const ACTIVITY_EVENT_TYPES = new Set(["PushEvent", "PullRequestEvent", "CreateEvent"]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POWERSHELL_ICON_PATH = path.resolve(__dirname, "..", "resources", "PowerShell_icon.svg");

function loadPowershellIconDataUri() {
  try {
    const raw = fs.readFileSync(POWERSHELL_ICON_PATH, "utf8");
    const base64 = Buffer.from(raw, "utf8").toString("base64");
    return `data:image/svg+xml;base64,${base64}`;
  } catch {
    return null;
  }
}

const POWERSHELL_ICON_DATA_URI = loadPowershellIconDataUri();

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateFit(text, maxChars) {
  const t = String(text);
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function textWidth(text, fontSize = 16) {
  return text.length * (fontSize * 0.62);
}

function promptPartsWidth(parts, fontSize = 16) {
  const promptCharFactor = 0.56;
  return parts.reduce((acc, part) => acc + (part.text.length * (fontSize * promptCharFactor)), 0);
}

function addTextSpans(parts, startX, y, fontSize = 16) {
  const spans = [];
  for (const part of parts) {
    spans.push(`<tspan fill="${part.fill}">${escapeXml(part.text)}</tspan>`);
  }
  return `<text x="${startX}" y="${y}" font-size="${fontSize}" font-family="Consolas, Menlo, monospace">${spans.join("")}</text>`;
}

function resolveOutputScale(input) {
  const parsed = Number.parseFloat(String(input ?? "1"));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(0.05, parsed));
}

function resolveLineCount(input) {
  const parsed = Number.parseInt(String(input ?? ""), 10);
  if (Number.isNaN(parsed)) return DEFAULT_LINES;
  return Math.min(MAX_LINES, Math.max(MIN_LINES, parsed));
}

async function fetchJson(url) {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-readme-insight-terminal-ascii"
  };
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const resetEpoch = response.headers.get("x-ratelimit-reset");
      const resetHint = resetEpoch
        ? ` (reset at ${new Date(Number.parseInt(resetEpoch, 10) * 1000).toISOString()})`
        : "";
      if (!githubToken && remaining === "0") {
        throw new Error(`GitHub API rate limit exceeded. Set GITHUB_TOKEN or GH_TOKEN to increase limit${resetHint}.`);
      }
      throw new Error(`GitHub API access forbidden (HTTP ${response.status})${resetHint}.`);
    }
    if (response.status === 404) {
      throw new Error("GitHub user not found.");
    }
    throw new Error(`Failed to fetch GitHub API: HTTP ${response.status}`);
  }
  return response.json();
}

// Repos come from the user's own activity (events + owned repos), not commit search:
// search matches spoofed author emails and has a tight secondary rate limit.
async function fetchCandidateRepos(githubId) {
  const user = encodeURIComponent(githubId);
  const [eventsResult, reposResult] = await Promise.allSettled([
    fetchJson(`${GITHUB_API_BASE}/users/${user}/events/public?per_page=100`),
    fetchJson(`${GITHUB_API_BASE}/users/${user}/repos?sort=pushed&per_page=${MAX_REPOS}`)
  ]);
  if (eventsResult.status === "rejected" && reposResult.status === "rejected") {
    throw eventsResult.reason;
  }

  const repos = [];
  const seen = new Set();
  const add = (fullName) => {
    if (!fullName || seen.has(fullName.toLowerCase())) return;
    seen.add(fullName.toLowerCase());
    repos.push(fullName);
  };
  if (eventsResult.status === "fulfilled") {
    for (const event of eventsResult.value) {
      if (ACTIVITY_EVENT_TYPES.has(event.type)) add(event.repo?.name);
    }
  }
  if (reposResult.status === "fulfilled") {
    for (const repo of reposResult.value) add(repo.full_name);
  }
  return repos.slice(0, MAX_REPOS);
}

async function fetchRecentCommits(githubId, lineCount) {
  const repos = await fetchCandidateRepos(githubId);
  const author = encodeURIComponent(githubId);
  const results = await Promise.allSettled(
    repos.map((repo) => fetchJson(`${GITHUB_API_BASE}/repos/${repo}/commits?author=${author}&per_page=${lineCount}`))
  );

  const latestAllowed = Date.now() + 24 * 60 * 60 * 1000;
  const seenShas = new Set();
  const commits = [];
  results.forEach((result, i) => {
    if (result.status !== "fulfilled" || !Array.isArray(result.value)) return;
    const [ownerLogin, repoName] = repos[i].split("/");
    for (const item of result.value) {
      const date = item.commit?.author?.date ?? item.commit?.committer?.date ?? null;
      if (!item.sha || seenShas.has(item.sha)) continue;
      if (date && new Date(date).getTime() > latestAllowed) continue;
      seenShas.add(item.sha);
      commits.push({
        sha: item.sha.slice(0, 7),
        repoFullName: repos[i],
        repoName,
        ownerLogin,
        message: String(item.commit?.message ?? "").split("\n")[0].trim(),
        date
      });
    }
  });

  commits.sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0));
  return commits.slice(0, lineCount);
}

function formatRelativeTime(isoDate, now = Date.now()) {
  if (!isoDate) return "";
  const diffSec = Math.max(0, Math.floor((now - new Date(isoDate).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function repoLabel(commit, githubId) {
  if (commit.ownerLogin.toLowerCase() === githubId.toLowerCase()) return commit.repoName;
  return commit.repoFullName;
}

function buildGitLogPrompt(themeName, githubId) {
  const palette = (THEMES[themeName] ?? THEMES.mac).palette;
  if (themeName === "windows") {
    return [
      { text: "PS ", fill: palette.purple },
      { text: `C:\\Users\\${githubId}`, fill: palette.yellow },
      { text: "> ", fill: palette.fg }
    ];
  }

  if (themeName === "ubuntu") {
    return [
      { text: `${githubId}@ubuntu`, fill: palette.green },
      { text: ":~", fill: palette.fg },
      { text: "$ ", fill: palette.fg }
    ];
  }

  return [
    { text: `${githubId}@MacBook`, fill: palette.green },
    { text: " ~ ", fill: palette.blue },
    { text: "% ", fill: palette.fg }
  ];
}

function buildGitLogCommand(themeName, githubId, lineCount) {
  if (themeName === "windows") {
    return `git log --oneline -n ${lineCount} --author=${githubId}`;
  }

  if (themeName === "ubuntu") {
    return `git log --oneline --graph -${lineCount} --author=${githubId}`;
  }

  return `git log --oneline --graph -n ${lineCount} --author=${githubId}`;
}

function createAnimationCss(timeline, rowCount) {
  const pct = (seconds) => ((seconds / timeline.cycleDuration) * 100).toFixed(4);
  const rowRules = [];
  for (let i = 0; i < rowCount; i += 1) {
    rowRules.push(`.row-${i} { animation-delay: ${(timeline.cardAt + timeline.rowStagger * (i + 1)).toFixed(2)}s; }`);
  }

  return `
  .line-fetch { opacity: 0; animation: show-fetch ${timeline.cycleDuration}s linear forwards; }
  .line-success { opacity: 0; animation: show-success ${timeline.cycleDuration}s linear forwards; }
  .line-card { opacity: 0; animation: show-card ${timeline.cycleDuration}s linear forwards; }
  .line-bottom { opacity: 0; animation: show-bottom ${timeline.cycleDuration}s linear forwards; }
  .log-row { opacity: 0; animation: row-in 0.12s linear forwards; }
  ${rowRules.join("\n  ")}
  .cursor {
    opacity: 1;
    visibility: hidden;
    animation: cursor-window ${timeline.cycleDuration}s steps(1, end) forwards, blink ${timeline.blinkDuration}s steps(1,end) infinite;
  }
  .typing-cursor {
    opacity: 1;
    animation: typing-cursor-window ${timeline.cycleDuration}s steps(1, end) forwards;
  }
  @keyframes show-fetch { 0%, ${pct(Math.max(0, timeline.fetchStart - 0.01))}% { opacity: 0; } ${pct(timeline.fetchStart)}%, 100% { opacity: 1; } }
  @keyframes show-success { 0%, ${pct(Math.max(0, timeline.successAt - 0.01))}% { opacity: 0; } ${pct(timeline.successAt)}%, 100% { opacity: 1; } }
  @keyframes show-card { 0%, ${pct(Math.max(0, timeline.cardAt - 0.01))}% { opacity: 0; } ${pct(timeline.cardAt)}%, 100% { opacity: 1; } }
  @keyframes show-bottom { 0%, ${pct(Math.max(0, timeline.bottomAt - 0.01))}% { opacity: 0; } ${pct(timeline.bottomAt)}%, 100% { opacity: 1; } }
  @keyframes row-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cursor-window { 0%, ${pct(Math.max(0, timeline.bottomAt - 0.01))}% { visibility: hidden; } ${pct(timeline.bottomAt)}%, 100% { visibility: visible; } }
  @keyframes typing-cursor-window { 0%, ${pct(timeline.typingDuration)}% { opacity: 1; } ${pct(Math.min(timeline.cycleDuration, timeline.typingDuration + 0.01))}%, 100% { opacity: 0; } }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  `;
}

export async function generateGitLogSvg(themeName, githubId, options = {}) {
  const palette = (THEMES[themeName] ?? THEMES.mac).palette;
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }

  const lineCount = resolveLineCount(options.lines);
  const commits = await fetchRecentCommits(githubId, lineCount);
  const now = Date.now();
  const repoCount = new Set(commits.map((c) => c.repoFullName)).size;

  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const promptY = 86;
  const cardX = 44;
  const cardY = 152;
  const rowH = 24;
  const rowsTop = cardY + 34;
  const visibleRows = Math.max(1, commits.length);
  const footerY = rowsTop + (visibleRows - 1) * rowH + 38;
  const cardH = footerY - cardY + 22;
  const stripWidth = 150;
  const fetchLineY = promptY + 22;
  const successLineY = fetchLineY + 20;
  const bottomPromptY = cardY + cardH + 28;
  const termBottomPadding = 24;
  const rowFontSize = 13;
  const charW = rowFontSize * 0.62;

  const maxPromptCommandWidth = Math.max(
    ...["mac", "windows", "ubuntu"].map((themeVariant) => {
      const promptParts = buildGitLogPrompt(themeVariant, githubId);
      const commandText = buildGitLogCommand(themeVariant, githubId, lineCount);
      return promptPartsWidth(promptParts, 15) + 3 + textWidth(commandText, 15);
    })
  );
  const minWidthForPrompt = Math.ceil(44 + maxPromptCommandWidth + 60);
  const minWidthForCard = 720 + stripWidth;
  const width = Math.max(minWidthForCard, minWidthForPrompt);

  const termW = width - 40;
  const cardW = width - 88;
  const termBodyTop = termY + headerH;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;
  const outputScale = resolveOutputScale(options.scale);
  const outputWidth = Math.round(width * outputScale);
  const outputHeight = Math.round(height * outputScale);

  const contentX0 = cardX + stripWidth;
  const contentRight = cardX + cardW - 20;
  const borderColor = palette.border;
  const labelColor = palette.mute;
  const titleColor = palette.accent;

  const graphX = contentX0 + 20;
  const hashX = graphX + charW * 2;
  const repoMaxChars = Math.min(
    REPO_LABEL_MAX_CHARS,
    Math.max(4, ...commits.map((c) => repoLabel(c, githubId).length))
  );
  const repoX = hashX + charW * 8;
  const timeColChars = 8;
  const messageX = repoX + charW * (repoMaxChars + 3);
  const messageMaxChars = Math.max(8, Math.floor((contentRight - charW * (timeColChars + 1) - messageX) / charW));

  const promptParts = buildGitLogPrompt(themeName, githubId);
  const promptStartX = 44;
  const commandText = buildGitLogCommand(themeName, githubId, lineCount);
  const commandX = promptStartX + promptPartsWidth(promptParts, 15) + 3;
  const commandWidth = textWidth(commandText, 15);
  const commandClipId = "gitlog-command-typing-clip";
  const fetchClipId = "gitlog-fetch-typing-clip";
  const fetchText = "Fetching recent commits from GitHub API...";
  const fetchWidth = textWidth(fetchText, 13);
  const successText = commits.length > 0
    ? `Success! Loaded ${commits.length} recent commit${commits.length === 1 ? "" : "s"} for '${githubId}'.`
    : `Success! No public commits found for '${githubId}'.`;

  const timeline = {
    typingDuration: 1.2,
    fetchStart: 1.2,
    fetchDuration: 0.75,
    successAt: 1.95,
    cardAt: 2.05,
    rowStagger: 0.08,
    blinkDuration: 0.8
  };
  timeline.bottomAt = timeline.cardAt + timeline.rowStagger * (visibleRows + 1) + 0.15;
  timeline.cycleDuration = timeline.bottomAt;
  timeline.typingRatio = (timeline.typingDuration / timeline.cycleDuration).toFixed(6);
  timeline.fetchStartRatio = (timeline.fetchStart / timeline.cycleDuration).toFixed(6);
  timeline.fetchEndRatio = ((timeline.fetchStart + timeline.fetchDuration) / timeline.cycleDuration).toFixed(6);

  const controlsY = termY + 20;
  const controlsX = themeName === "mac"
    ? termX + 18
    : (themeName === "windows" ? termX + termW - 74 : termX + termW - 62);

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}" role="img" aria-label="GitHub git log card for ${escapeXml(githubId)}">`);
  svg.push(`<title>${escapeXml(theme.title(githubId))}</title>`);
  svg.push(`<defs>`);
  svg.push(`<style>${createAnimationCss(timeline, commits.length)}${REDUCED_MOTION_CSS}</style>`);
  svg.push(`<clipPath id="${commandClipId}"><rect x="${commandX}" y="${promptY - 16}" width="0" height="22"><animate attributeName="width" values="0;${commandWidth + 6};${commandWidth + 6}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></rect></clipPath>`);
  svg.push(`<clipPath id="${fetchClipId}"><rect x="${promptStartX}" y="${fetchLineY - 16}" width="0" height="20"><animate attributeName="width" values="0;0;${fetchWidth + 6};${fetchWidth + 6}" keyTimes="0;${timeline.fetchStartRatio};${timeline.fetchEndRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></rect></clipPath>`);
  svg.push(`</defs>`);

  svg.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termBodyTop}" width="${termW - 2}" height="${termH - headerH - 1}" rx="0" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (themeName === "windows" && POWERSHELL_ICON_DATA_URI) {
    svg.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  svg.push(theme.controlsSvg(controlsX, controlsY));
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(githubId))}</text>`);

  svg.push(addTextSpans(promptParts, promptStartX, promptY, 15));
  svg.push(`<text x="${commandX}" y="${promptY}" fill="${theme.text}" font-size="15" font-family="Consolas, Menlo, monospace" clip-path="url(#${commandClipId})">${escapeXml(commandText)}</text>`);
  svg.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="${palette.fg}" font-size="15" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" values="${commandX};${commandX + commandWidth + 2};${commandX + commandWidth + 2}" keyTimes="0;${timeline.typingRatio};1" dur="${timeline.cycleDuration}s" fill="freeze" /></text>`);

  svg.push(`<g class="line-fetch">`);
  svg.push(`<text x="${promptStartX}" y="${fetchLineY}" fill="${palette.mute}" font-size="13" font-family="Consolas, Menlo, monospace" clip-path="url(#${fetchClipId})">${escapeXml(fetchText)}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-success">`);
  svg.push(`<text x="${promptStartX}" y="${successLineY}" font-size="13" font-family="Consolas, Menlo, monospace"><tspan fill="${palette.green}">\u2714 </tspan><tspan fill="${theme.text}">${escapeXml(successText)}</tspan></text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-card">`);
  const stripCenterX = cardX + stripWidth / 2;
  const stripCenterY = cardY + cardH / 2;
  svg.push(`<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="12" fill="${theme.bodyBg}" stroke="${borderColor}"/>`);
  svg.push(`<text x="${stripCenterX}" y="${stripCenterY - 30}" font-size="13" font-family="Consolas, Menlo, monospace" fill="${titleColor}" text-anchor="middle" letter-spacing="2">${ASCII_ACCENT}</text>`);
  svg.push(`<text x="${stripCenterX}" y="${stripCenterY - 9}" font-size="17" font-family="Consolas, Menlo, monospace" fill="${titleColor}" font-weight="700" text-anchor="middle" letter-spacing="1">GIT</text>`);
  svg.push(`<text x="${stripCenterX}" y="${stripCenterY + 12}" font-size="17" font-family="Consolas, Menlo, monospace" fill="${titleColor}" font-weight="700" text-anchor="middle" letter-spacing="1">LOG</text>`);
  svg.push(`<text x="${stripCenterX}" y="${stripCenterY + 32}" font-size="11" font-family="Consolas, Menlo, monospace" fill="${labelColor}" text-anchor="middle">${escapeXml(truncateFit(`@${githubId}`, 18))}</text>`);
  svg.push(`<line x1="${contentX0}" y1="${cardY + 16}" x2="${contentX0}" y2="${cardY + cardH - 16}" stroke="${borderColor}"/>`);

  if (commits.length === 0) {
    svg.push(`<text x="${graphX}" y="${rowsTop}" font-size="${rowFontSize}" font-family="Consolas, Menlo, monospace"><tspan fill="${palette.red}">fatal: </tspan><tspan fill="${theme.text}">your current branch does not have any commits yet</tspan></text>`);
  }
  commits.forEach((commit, i) => {
    const y = rowsTop + i * rowH;
    const graphGlyph = themeName === "windows" ? "" : "* ";
    const repoText = truncateFit(repoLabel(commit, githubId), repoMaxChars);
    const messageText = truncateFit(commit.message, messageMaxChars);
    const timeText = formatRelativeTime(commit.date, now);
    svg.push(`<g class="log-row row-${i}">`);
    if (graphGlyph) {
      svg.push(`<text x="${graphX}" y="${y}" font-size="${rowFontSize}" font-family="Consolas, Menlo, monospace" fill="${palette.green}" font-weight="700">*</text>`);
    }
    svg.push(`<text x="${graphGlyph ? hashX : graphX}" y="${y}" font-size="${rowFontSize}" font-family="Consolas, Menlo, monospace" fill="${palette.yellow}">${escapeXml(commit.sha)}</text>`);
    svg.push(`<text x="${graphGlyph ? repoX : repoX - charW * 2}" y="${y}" font-size="${rowFontSize}" font-family="Consolas, Menlo, monospace"><tspan fill="${palette.yellow}">(</tspan><tspan fill="${palette.cyan}">${escapeXml(repoText)}</tspan><tspan fill="${palette.yellow}">)</tspan></text>`);
    svg.push(`<text x="${graphGlyph ? messageX : messageX - charW * 2}" y="${y}" font-size="${rowFontSize}" font-family="Consolas, Menlo, monospace" fill="${theme.text}">${escapeXml(messageText)}</text>`);
    svg.push(`<text x="${contentRight}" y="${y}" font-size="12" font-family="Consolas, Menlo, monospace" fill="${palette.mute}" text-anchor="end">${escapeXml(timeText)}</text>`);
    svg.push(`</g>`);
  });

  svg.push(`<line x1="${graphX}" y1="${footerY - 18}" x2="${contentRight}" y2="${footerY - 18}" stroke="${borderColor}" stroke-dasharray="3,4"/>`);
  const footerText = `${formatNumber(commits.length)} recent commit${commits.length === 1 ? "" : "s"} across ${repoCount} active repo${repoCount === 1 ? "" : "s"}`;
  svg.push(`<text x="${graphX}" y="${footerY}" font-size="12" font-family="Consolas, Menlo, monospace" fill="${labelColor}">${escapeXml(footerText)}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-bottom">`);
  svg.push(addTextSpans(promptParts, promptStartX, bottomPromptY, 15));
  svg.push(`<text class="cursor" x="${promptStartX + promptPartsWidth(promptParts, 15)}" y="${bottomPromptY}" fill="${palette.fg}" font-size="15" font-family="Consolas, Menlo, monospace">█</text>`);
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}
