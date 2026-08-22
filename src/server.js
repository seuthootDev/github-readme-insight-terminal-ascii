import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { generateErrorSvg } from "./errorCard.js";
import { generateSvg, getAvailableRenderTypes } from "./renderer.js";

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

function sendErrorCard(res, { theme, user, type, message }) {
  const svg = generateErrorSvg(theme, { user, type, message });
  res.set("Cache-Control", "no-store");
  res.type("image/svg+xml").status(200).send(svg);
}

async function handleSvgRequest(req, res, forcedType = null) {
  const user = String(req.query.user ?? "").trim();
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

  const safeTheme = THEMES[theme] ? theme : "mac";

  if (!user) {
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

  try {
    const svg = await generateSvg({
      type: renderType,
      themeName: theme,
      githubId: user,
      topN,
      scale,
      color,
      cols
    });
    res.set("Cache-Control", "public, max-age=1800");
    res.type("image/svg+xml").send(svg);
  } catch (error) {
    const message = String(error?.message ?? error);
    sendErrorCard(res, { theme: safeTheme, user, type: renderType, message });
  }
}

app.get(["/", "/svg"], async (req, res) => {
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
