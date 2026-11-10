import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { generateErrorSvg } from "./errorCard.js";
import { generateSvg, getAvailableRenderTypes } from "./renderer.js";
import { createTtlCache } from "./cache.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, "..", ".env");
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !(key in process.env)) process.env[key] = val;
  }
} catch {
}
import { THEMES } from "./themes.js";

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "8000", 10);

function envInt(name, fallback) {
  const parsed = Number.parseInt(String(process.env[name] ?? ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const CACHE_TTL_SECONDS = Math.max(0, envInt("CACHE_TTL_SECONDS", 1800));
const CACHE_MAX_ENTRIES = Math.max(0, envInt("CACHE_MAX_ENTRIES", 500));
// Browsers/camo use max-age; s-maxage lets Vercel's CDN serve repeats without invoking the function,
// and stale-while-revalidate keeps cards up while a refresh happens in the background.
const SUCCESS_CACHE_CONTROL = CACHE_TTL_SECONDS > 0
  ? `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=86400`
  : "no-store";
const svgCache = createTtlCache({ ttlMs: CACHE_TTL_SECONDS * 1000, maxEntries: CACHE_MAX_ENTRIES });

function sendErrorCard(res, { theme, user, type, message }) {
  const svg = generateErrorSvg(theme, { user, type, message });
  res.set("Cache-Control", "no-store");
  res.type("image/svg+xml").status(200).send(svg);
}

async function handleSvgRequest(req, res, forcedType = null) {
  const repo = String(req.query.repo ?? "").trim() || undefined;
  // The repo card can take everything from repo=owner/name, so user becomes optional there.
  const user = String(req.query.user ?? "").trim() || (repo?.includes("/") ? repo.split("/")[0] : "");
  const theme = String(req.query.theme ?? "mac").trim() || "mac";
  const renderType = String(forcedType ?? req.params.type ?? "graph").trim().toLowerCase();
  const topRaw = req.query.top;
  const topParsed = Number.parseInt(String(topRaw ?? ""), 10);
  const topN = Number.isNaN(topParsed) ? undefined : Math.min(12, Math.max(6, topParsed));
  const scaleRaw = req.query.scale;
  const scaleParsed = Number.parseFloat(String(scaleRaw ?? ""));
  const scale = Number.isFinite(scaleParsed) ? scaleParsed : undefined;
  const colorRaw = String(req.query.color ?? req.query.mode ?? "").trim().toLowerCase();
  const color = colorRaw
    ? ["1", "true", "yes", "on", "color"].includes(colorRaw)
    : undefined;
  const colsRaw = req.query.cols ?? req.query.size;
  const colsParsed = Number.parseInt(String(colsRaw ?? ""), 10);
  const cols = Number.isNaN(colsParsed) ? undefined : colsParsed;
  const linesParsed = Number.parseInt(String(req.query.lines ?? ""), 10);
  const lines = Number.isNaN(linesParsed) ? undefined : linesParsed;
  const yearsParsed = Number.parseInt(String(req.query.years ?? ""), 10);
  const years = Number.isNaN(yearsParsed) ? undefined : yearsParsed;

  const iconsRaw = String(req.query.i ?? req.query.icons ?? "").trim();
  const icons = iconsRaw || undefined;
  const perlineParsed = Number.parseInt(String(req.query.perline ?? ""), 10);
  const perline = Number.isNaN(perlineParsed) ? undefined : perlineParsed;
  const labelsRaw = String(req.query.labels ?? "").trim().toLowerCase();
  const labels = labelsRaw ? !["0", "false", "no", "off"].includes(labelsRaw) : undefined;

  const safeTheme = THEMES[theme] ? theme : "mac";

  // The skills card is driven by the icon list, not a GitHub account.
  if (!user && renderType !== "skills") {
    sendErrorCard(res, { theme: safeTheme, user: "", type: renderType, message: "Query parameter 'user' is required." });
    return;
  }

  if (!THEMES[theme]) {
    sendErrorCard(res, { theme: safeTheme, user, type: renderType, message: `Unknown theme: ${theme}. Use one of: ${Object.keys(THEMES).join(", ")}` });
    return;
  }

  if (!getAvailableRenderTypes().includes(renderType)) {
    sendErrorCard(res, { theme: safeTheme, user, type: renderType, message: `Unknown render type: ${renderType}. Use one of: ${getAvailableRenderTypes().join(", ")}` });
    return;
  }

  const options = {
    type: renderType,
    themeName: theme,
    githubId: user,
    topN,
    scale,
    color,
    cols,
    lines,
    repo,
    years,
    icons,
    perline,
    labels
  };

  try {
    const { value: svg, hit } = await svgCache.getOrCompute(JSON.stringify(options), () => generateSvg(options));
    res.set("Cache-Control", SUCCESS_CACHE_CONTROL);
    res.set("X-Cache", hit ? "HIT" : "MISS");
    res.type("image/svg+xml").send(svg);
  } catch (error) {
    const message = String(error?.message ?? error);
    sendErrorCard(res, { theme: safeTheme, user, type: renderType, message });
  }
}

app.get(["/", "/svg"], async (req, res) => {
  // People opening the bare site in a browser should land on the project, not an error card.
  if (req.path === "/" && !req.query.user && !req.query.repo) {
    res.redirect(302, "https://github.com/seuthootDev/github-readme-insight-terminal-ascii");
    return;
  }
  await handleSvgRequest(req, res, "graph");
});

app.get(["/:type", "/svg/:type"], async (req, res) => {
  await handleSvgRequest(req, res);
});

// Local/dev: listen. Vercel: use the exported app as the serverless entrypoint.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`github-graph-ascii-js API listening on http://127.0.0.1:${PORT}`);
  });
}

export default app;
