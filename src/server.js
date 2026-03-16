import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
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
  // .env 파일 없으면 그냥 넘어감
}
import { THEMES } from "./themes.js";

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "8000", 10);

async function handleSvgRequest(req, res, forcedType = null) {
  const user = String(req.query.user ?? "").trim();
  const theme = String(req.query.theme ?? "mac").trim() || "mac";
  const renderType = String(forcedType ?? req.params.type ?? "grass").trim().toLowerCase();
  const topRaw = req.query.top;
  const topParsed = Number.parseInt(String(topRaw ?? ""), 10);
  const topN = Number.isNaN(topParsed) ? undefined : Math.min(12, Math.max(6, topParsed));
  const scaleRaw = req.query.scale;
  const scaleParsed = Number.parseFloat(String(scaleRaw ?? ""));
  const scale = Number.isFinite(scaleParsed) ? scaleParsed : undefined;

  if (!user) {
    res.status(400).type("text/plain").send("Query parameter 'user' is required.");
    return;
  }

  if (!THEMES[theme]) {
    res.status(400).type("text/plain").send(`Unknown theme: ${theme}. Use one of: ${Object.keys(THEMES).join(", ")}`);
    return;
  }

  if (!getAvailableRenderTypes().includes(renderType)) {
    res.status(400).type("text/plain").send(`Unknown render type: ${renderType}. Use one of: ${getAvailableRenderTypes().join(", ")}`);
    return;
  }

  try {
    const svg = await generateSvg({
      type: renderType,
      themeName: theme,
      githubId: user,
      topN,
      scale
    });
    res.set("Cache-Control", "public, max-age=1800");
    res.type("image/svg+xml").send(svg);
  } catch (error) {
    const message = String(error?.message ?? error);
    const isNotImplemented = message.toLowerCase().includes("not implemented");
    res.status(isNotImplemented ? 501 : 502).type("text/plain").send(message);
  }
}

app.get(["/", "/svg"], async (req, res) => {
  await handleSvgRequest(req, res, "grass");
});

app.get(["/:type", "/svg/:type"], async (req, res) => {
  await handleSvgRequest(req, res);
});

app.listen(PORT, () => {
  console.log(`github-grass-ascii-js API listening on http://127.0.0.1:${PORT}`);
});
