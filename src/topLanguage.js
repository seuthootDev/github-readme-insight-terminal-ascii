import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { THEMES } from "./themes.js";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";

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

const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Go: "#00ADD8",
  Rust: "#dea584",
  Ruby: "#701516",
  PHP: "#4F5D95",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Vue: "#41b883",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Dart: "#00B4AB"
};

function escapeXml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

function hashColorFromLanguage(language) {
  let hash = 0;
  for (const ch of String(language)) {
    hash = ((hash << 5) - hash) + ch.charCodeAt(0);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 62%, 56%)`;
}

function getLanguageColor(language) {
  return LANGUAGE_COLORS[language] ?? hashColorFromLanguage(language);
}

function getRowColor(row) {
  return row?.color ?? getLanguageColor(row?.language);
}

function createCombinedLanguageBar({ x, y, width, rows, blockWidth = 5, blockGap = 2, emptyColor = "#30363d" }) {
  const parts = [];
  const blocks = Math.max(12, Math.floor((width + blockGap) / (blockWidth + blockGap)));
  const barWidth = (blocks * blockWidth) + ((blocks - 1) * blockGap);
  const normalized = Array.isArray(rows) ? rows : [];

  for (let i = 0; i < blocks; i += 1) {
    const point = ((i + 0.5) / blocks) * 100;
    let cumulative = 0;
    let fill = emptyColor;

    for (const row of normalized) {
      cumulative += Number(row?.pct ?? 0);
      if (point <= cumulative) {
        fill = getRowColor(row);
        break;
      }
    }

    const blockX = x + (i * (blockWidth + blockGap));
    parts.push(`<rect x="${blockX}" y="${y}" width="${blockWidth}" height="7" rx="1" fill="${fill}"/>`);
  }

  return {
    markup: parts.join(""),
    width: barWidth
  };
}

function clampTopN(input) {
  const parsed = Number.parseInt(String(input ?? "6"), 10);
  if (Number.isNaN(parsed)) return 6;
  return Math.min(12, Math.max(6, parsed));
}

function cardHeightForTop(top) {
  const rowsPerColumn = Math.ceil(clampTopN(top) / 2);
  const baseHeight = 188;
  const rowHeight = 24;
  return baseHeight + ((rowsPerColumn - 4) * rowHeight);
}

function resolveOutputScale(input) {
  const parsed = Number.parseFloat(String(input ?? "1"));
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(3, Math.max(0.2, parsed));
}

function createAnimationCss() {
  return `
  .line-fetch { opacity: 0; animation: show 0.01s linear 1.2s forwards; }
  .line-success { opacity: 0; animation: show 0.01s linear 1.95s forwards; }
  .line-languages { opacity: 0; animation: show 0.01s linear 2.05s forwards; }
  .line-bottom { opacity: 0; animation: show 0.01s linear 2.4s forwards; }
  .cursor { opacity: 0; animation: show 0.01s linear 2.4s forwards, blink 1s steps(1,end) 2.4s infinite; }
  .typing-cursor {
    opacity: 1;
    animation: hideTypingCursor 0.01s linear 1.2s forwards;
  }
  @keyframes show { to { opacity: 1; } }
  @keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
  @keyframes hideTypingCursor { to { opacity: 0; } }
  `;
}

async function fetchJson(url) {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const logTokenUsage = ["1", "true", "yes", "on"].includes(String(process.env.LOG_GITHUB_TOKEN_USAGE ?? "").toLowerCase());
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-readme-insight-terminal-ascii"
  };

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  if (logTokenUsage) {
    console.log(`[github-api][top-language] token-used=${Boolean(githubToken)} url=${url}`);
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    if (response.status === 403) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const resetEpoch = response.headers.get("x-ratelimit-reset");
      const hasToken = Boolean(githubToken);
      const resetHint = resetEpoch
        ? ` (reset at ${new Date(Number.parseInt(resetEpoch, 10) * 1000).toISOString()})`
        : "";

      if (!hasToken && remaining === "0") {
        throw new Error(`GitHub API rate limit exceeded. Set GITHUB_TOKEN or GH_TOKEN to increase limit${resetHint}.`);
      }

      throw new Error(`GitHub API access forbidden (HTTP 403)${resetHint}.`);
    }

    throw new Error(`Failed to fetch GitHub API: HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchGraphql(query, variables) {
  const githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const logTokenUsage = ["1", "true", "yes", "on"].includes(String(process.env.LOG_GITHUB_TOKEN_USAGE ?? "").toLowerCase());

  if (!githubToken) {
    throw new Error("GitHub GraphQL requests require GITHUB_TOKEN or GH_TOKEN.");
  }

  if (logTokenUsage) {
    console.log("[github-api][top-language] token-used=true graphql=true");
  }

  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${githubToken}`,
      "Content-Type": "application/json",
      "User-Agent": "github-readme-insight-terminal-ascii"
    },
    body: JSON.stringify({ query, variables })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub GraphQL API: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    throw new Error(String(data.errors[0]?.message ?? "Failed to fetch GitHub GraphQL API."));
  }

  return data?.data;
}

async function fetchAllRepos(username) {
  const repos = [];
  let page = 1;

  while (true) {
    const url = `${GITHUB_API_BASE}/users/${encodeURIComponent(username)}/repos?type=owner&per_page=100&page=${page}`;
    const chunk = await fetchJson(url);
    if (!Array.isArray(chunk) || chunk.length === 0) {
      break;
    }

    repos.push(...chunk);
    if (chunk.length < 100) {
      break;
    }

    page += 1;
    if (page > 10) {
      break;
    }
  }

  return repos;
}

const TOP_LANGUAGE_GRAPHQL_QUERY = `
  query topLanguages($login: String!, $after: String) {
    user(login: $login) {
      repositories(
        ownerAffiliations: OWNER
        isFork: false
        privacy: PUBLIC
        first: 100
        after: $after
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          name
          languages(first: 20, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

async function fetchAllRepoLanguageEdges(username) {
  const repos = [];
  let after = null;
  let page = 0;

  while (page < 10) {
    const data = await fetchGraphql(TOP_LANGUAGE_GRAPHQL_QUERY, {
      login: username,
      after
    });

    const repositoryConnection = data?.user?.repositories;
    const nodes = repositoryConnection?.nodes ?? [];
    repos.push(...nodes);

    if (!repositoryConnection?.pageInfo?.hasNextPage) {
      break;
    }

    after = repositoryConnection.pageInfo.endCursor;
    page += 1;
  }

  return repos;
}

function aggregateLanguages(repos) {
  const languageMap = new Map();

  for (const repo of repos) {
    if (!repo || repo.fork) continue;
    const language = String(repo.language ?? "").trim();
    if (!language) continue;

    const size = Math.max(1, Number(repo.size ?? 0));
    const current = languageMap.get(language) ?? { size: 0, repos: 0 };
    current.size += size;
    current.repos += 1;
    languageMap.set(language, current);
  }

  const totalSize = [...languageMap.values()].reduce((acc, item) => acc + item.size, 0);
  const rows = [...languageMap.entries()]
    .map(([language, info]) => ({
      language,
      size: info.size,
      repos: info.repos,
      pct: totalSize > 0 ? (info.size / totalSize) * 100 : 0
    }))
    .sort((a, b) => b.size - a.size);

  return rows;
}

function aggregateLanguageEdges(repos) {
  const languageMap = new Map();

  for (const repo of repos) {
    const edges = repo?.languages?.edges ?? [];
    for (const edge of edges) {
      const language = String(edge?.node?.name ?? "").trim();
      if (!language) continue;

      const size = Math.max(0, Number(edge?.size ?? 0));
      if (size <= 0) continue;

      const current = languageMap.get(language) ?? {
        language,
        size: 0,
        repos: 0,
        color: edge?.node?.color ?? null
      };

      current.size += size;
      current.repos += 1;
      if (!current.color && edge?.node?.color) {
        current.color = edge.node.color;
      }

      languageMap.set(language, current);
    }
  }

  const totalSize = [...languageMap.values()].reduce((acc, item) => acc + item.size, 0);
  return [...languageMap.values()]
    .map((item) => ({
      language: item.language,
      size: item.size,
      repos: item.repos,
      color: item.color,
      pct: totalSize > 0 ? (item.size / totalSize) * 100 : 0
    }))
    .sort((a, b) => b.size - a.size);
}

function buildPrompt(themeName, githubId) {
  if (themeName === "window") {
    return [
      { text: "PS ", fill: "#c678dd" },
      { text: `C:\\Users\\${githubId}`, fill: "#e5c07b" },
      { text: "> ", fill: "#c5c8c6" }
    ];
  }

  if (themeName === "ubuntu") {
    return [
      { text: `${githubId}@ubuntu`, fill: "#98c379" },
      { text: ":~", fill: "#c5c8c6" },
      { text: "$ ", fill: "#c5c8c6" }
    ];
  }

  return [
    { text: `${githubId}@MacBook`, fill: "#98c379" },
    { text: " ~ ", fill: "#61afef" },
    { text: "% ", fill: "#c5c8c6" }
  ];
}

function buildCommand(themeName, githubId) {
  if (themeName === "window") {
    return `Get-GHLanguages ${githubId}`;
  }

  if (themeName === "ubuntu") {
    return `gh repo list ${githubId}`;
  }

  return `gh api users/${githubId}/repos`;
}

export async function generateTopLanguageSvg(themeName, githubId, options = {}) {
  const theme = THEMES[themeName];
  if (!theme) {
    throw new Error(`Unknown theme: ${themeName}. Use one of: ${Object.keys(THEMES).join(", ")}`);
  }

  const top = clampTopN(options.topN ?? options.top);

  let profile = null;
  let repos = [];
  let languageRows = [];
  let partial = false;

  try {
    profile = await fetchJson(`${GITHUB_API_BASE}/users/${encodeURIComponent(githubId)}`);
  } catch {
    partial = true;
  }

  try {
    repos = await fetchAllRepos(githubId);
  } catch {
    partial = true;
  }

  try {
    if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
      const graphRepos = await fetchAllRepoLanguageEdges(githubId);
      languageRows = aggregateLanguageEdges(graphRepos).slice(0, top);
    } else {
      languageRows = aggregateLanguages(repos).slice(0, top);
    }
  } catch {
    partial = true;
    languageRows = aggregateLanguages(repos).slice(0, top);
  }

  const fallbackLogin = profile?.login || githubId;
  const displayName = profile?.name || fallbackLogin;

  const termX = 20;
  const termY = 20;
  const headerH = 40;
  const promptY = 86;
  const statsCardX = 44;
  const statsCardY = 152;
  const fetchLineY = promptY + 22;
  const successLineY = fetchLineY + 20;

  const rowHeight = 24;
  const statsCardH = cardHeightForTop(top);
  const bottomPromptY = statsCardY + statsCardH + 28;
  const termBottomPadding = 24;

  const promptParts = buildPrompt(themeName, githubId);
  const commandText = buildCommand(themeName, githubId);
  const promptW = promptPartsWidth(promptParts, 15);
  const commandW = textWidth(commandText, 15);
  const maxPromptCommandWidth = Math.max(
    ...["mac", "window", "ubuntu"].map((themeVariant) => {
      const promptPartsVariant = buildPrompt(themeVariant, githubId);
      const commandTextVariant = buildCommand(themeVariant, githubId);
      return promptPartsWidth(promptPartsVariant, 15) + 3 + textWidth(commandTextVariant, 15);
    })
  );
  const minWidthForPrompt = Math.ceil(44 + maxPromptCommandWidth + 60);
  const minWidthForCard = 620;
  const width = Math.max(minWidthForCard, minWidthForPrompt);

  const termW = width - 40;
  const statsCardW = width - 88;

  const termBodyTop = termY + headerH;
  const termH = bottomPromptY + termBottomPadding - termY;
  const height = termY + termH + 20;
  const outputScale = resolveOutputScale(options.scale);
  const outputWidth = Math.round(width * outputScale);
  const outputHeight = Math.round(height * outputScale);

  const paddingX = statsCardX + 24;
  const stackedBarX = paddingX;
  const stackedBarY = statsCardY + 68;
  const stackedBarW = statsCardW - 48;
  const rowStartY = statsCardY + 96;
  const leftColX = paddingX;
  const rightColX = statsCardX + Math.round((width - 88) * 0.52);

  const borderColor = "#30363d";
  const labelColor = "#8b949e";
  const valueColor = theme.text;
  const titleColor = "#58a6ff";
  const subtitle = partial
    ? `${escapeXml(displayName)} (${escapeXml(fallbackLogin)}) · limited API data`
    : `${escapeXml(displayName)} (${escapeXml(fallbackLogin)})`;

  const promptStartX = 44;
  const commandX = promptStartX + promptW + 3;
  const commandClipId = "toplang-command-typing-clip";
  const fetchClipId = "toplang-fetch-typing-clip";
  const fetchText = "Fetching data from GitHub API...";
  const fetchWidth = textWidth(fetchText, 13);

  const leftRows = languageRows.slice(0, Math.ceil(languageRows.length / 2));
  const rightRows = languageRows.slice(Math.ceil(languageRows.length / 2));
  const combinedBar = createCombinedLanguageBar({
    x: stackedBarX,
    y: stackedBarY,
    width: stackedBarW,
    rows: languageRows,
    emptyColor: borderColor
  });

  const controlsY = termY + 20;
  const controlsX = themeName === "mac"
    ? termX + 18
    : (themeName === "window" ? termX + termW - 74 : termX + termW - 62);

  const svg = [];
  svg.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  svg.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Top languages card for ${escapeXml(githubId)}">`);
  svg.push(`<title>${escapeXml(theme.title(githubId))}</title>`);
  svg.push(`<defs>`);
  svg.push(`<style>${createAnimationCss()}</style>`);
  svg.push(`<clipPath id="${commandClipId}"><rect x="${commandX}" y="${promptY - 16}" width="0" height="22"><animate attributeName="width" from="0" to="${commandW + 6}" dur="1.2s" begin="0s" fill="freeze" /></rect></clipPath>`);
  svg.push(`<clipPath id="${fetchClipId}"><rect x="${promptStartX}" y="${fetchLineY - 16}" width="0" height="20"><animate attributeName="width" from="0" to="${fetchWidth + 6}" dur="0.75s" begin="1.2s" fill="freeze" /></rect></clipPath>`);
  svg.push(`</defs>`);

  svg.push(`<rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.frameBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termBodyTop}" width="${termW - 2}" height="${termH - headerH - 1}" rx="0" fill="${theme.bodyBg}"/>`);
  svg.push(`<rect x="${termX + 1}" y="${termY + 1}" width="${termW - 2}" height="${headerH}" rx="8" fill="${theme.headerBg}"/>`);
  if (themeName === "window" && POWERSHELL_ICON_DATA_URI) {
    svg.push(`<image href="${POWERSHELL_ICON_DATA_URI}" x="${termX + 12}" y="${termY + 8}" width="24" height="24" />`);
  }
  svg.push(theme.controlsSvg(controlsX, controlsY));
  svg.push(`<text x="${termX + termW / 2}" y="${termY + 25}" font-size="13" font-family="Consolas, Menlo, monospace" fill="#a8a8a8" text-anchor="middle">${escapeXml(theme.title(githubId))}</text>`);

  svg.push(addTextSpans(promptParts, promptStartX, promptY, 15));
  svg.push(`<text x="${commandX}" y="${promptY}" fill="${theme.text}" font-size="15" font-family="Consolas, Menlo, monospace" clip-path="url(#${commandClipId})">${escapeXml(commandText)}</text>`);
  svg.push(`<text class="typing-cursor" x="${commandX}" y="${promptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█<animate attributeName="x" from="${commandX}" to="${commandX + commandW + 2}" dur="1.2s" begin="0s" fill="freeze" /></text>`);

  svg.push(`<g class="line-fetch">`);
  svg.push(`<text x="${promptStartX}" y="${fetchLineY}" fill="#8b949e" font-size="13" font-family="Consolas, Menlo, monospace" clip-path="url(#${fetchClipId})">${escapeXml(fetchText)}</text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-success">`);
  svg.push(`<text x="${promptStartX}" y="${successLineY}" font-size="13" font-family="Consolas, Menlo, monospace"><tspan fill="#98c379">\u2714 </tspan><tspan fill="${theme.text}">${escapeXml(`Success! Generated language card for '${githubId}'.`)}</tspan></text>`);
  svg.push(`</g>`);

  svg.push(`<g class="line-languages">`);
  svg.push(`<rect x="${statsCardX}" y="${statsCardY}" width="${statsCardW}" height="${statsCardH}" rx="12" fill="${theme.bodyBg}" stroke="${borderColor}"/>`);
  svg.push(`<text x="${paddingX}" y="${statsCardY + 34}" font-size="24" font-family="Segoe UI, Arial, sans-serif" fill="${titleColor}" font-weight="700">Top Languages</text>`);
  svg.push(`<text x="${paddingX}" y="${statsCardY + 58}" font-size="14" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}">${subtitle} · top ${top}</text>`);
  svg.push(`<rect x="${stackedBarX}" y="${stackedBarY - 1}" width="${combinedBar.width}" height="9" rx="2" fill="none" stroke="${borderColor}"/>`);
  svg.push(combinedBar.markup);

  if (languageRows.length === 0) {
    svg.push(`<text x="${paddingX}" y="${rowStartY + 10}" font-size="14" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}">No language data found</text>`);
  }

  for (let i = 0; i < leftRows.length; i += 1) {
    const row = leftRows[i];
    const y = rowStartY + (i * rowHeight);
    const langColor = getRowColor(row);
    svg.push(`<circle cx="${leftColX}" cy="${y - 5}" r="4" fill="${langColor}"/>`);
    svg.push(`<text x="${leftColX + 12}" y="${y}" font-size="13" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}">${escapeXml(row.language)}</text>`);
    svg.push(`<text x="${leftColX + 190}" y="${y}" font-size="14" font-family="Segoe UI, Arial, sans-serif" fill="${valueColor}" font-weight="700" text-anchor="end">${escapeXml(row.pct.toFixed(2))}%</text>`);
  }

  for (let i = 0; i < rightRows.length; i += 1) {
    const row = rightRows[i];
    const y = rowStartY + (i * rowHeight);
    const langColor = getRowColor(row);
    svg.push(`<circle cx="${rightColX}" cy="${y - 5}" r="4" fill="${langColor}"/>`);
    svg.push(`<text x="${rightColX + 12}" y="${y}" font-size="13" font-family="Segoe UI, Arial, sans-serif" fill="${labelColor}">${escapeXml(row.language)}</text>`);
    svg.push(`<text x="${rightColX + 190}" y="${y}" font-size="14" font-family="Segoe UI, Arial, sans-serif" fill="${valueColor}" font-weight="700" text-anchor="end">${escapeXml(row.pct.toFixed(2))}%</text>`);
  }
  svg.push(`</g>`);

  svg.push(`<g class="line-bottom">`);
  svg.push(addTextSpans(promptParts, promptStartX, bottomPromptY, 15));
  svg.push(`<text class="cursor" x="${promptStartX + promptPartsWidth(promptParts, 15)}" y="${bottomPromptY}" fill="#c5c8c6" font-size="15" font-family="Consolas, Menlo, monospace">█</text>`);
  svg.push(`</g>`);

  svg.push(`</svg>`);
  return svg.join("\n");
}
