// Editor theme, neofetch card: neofetch running in the editor's integrated terminal panel.
import { MONO, codeBlock, codeTokens, editorWindow, esc, fadeIn, fit, formatNumber, palette, rect, svgDocument, text, windowEnd } from "./kit.js";

const FONT = 12.5;
const CHAR_W = FONT * 0.6;
const LINE_H = 16;

function uptime(createdAt) {
  if (!createdAt) return "unknown";
  const start = new Date(createdAt);
  const now = new Date();
  let months = (now.getUTCFullYear() - start.getUTCFullYear()) * 12 + (now.getUTCMonth() - start.getUTCMonth());
  if (now.getUTCDate() < start.getUTCDate()) months -= 1;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} year${years === 1 ? "" : "s"}` : "", rest ? `${rest} month${rest === 1 ? "" : "s"}` : ""].filter(Boolean).join(", ") || "less than a month";
}

// Same-colour runs of the logo, each pinned to its column with textLength.
function renderLogo(logo, colors, mono, x, y) {
  let out = "";
  logo.lines.forEach((parts, row) => {
    let col = 0;
    for (const part of parts) {
      const fill = mono ?? colors[(part.c ?? 1) - 1] ?? colors[0];
      const value = part.t;
      const lead = value.length - value.trimStart().length;
      const trimmed = value.trim();
      if (trimmed) {
        out += `<text x="${(x + (col + lead) * CHAR_W).toFixed(1)}" y="${y + row * LINE_H}" font-size="${FONT}" font-family="${MONO}" fill="${fill}" textLength="${(trimmed.length * CHAR_W).toFixed(1)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${esc(trimmed)}</text>`;
      }
      col += value.length;
    }
  });
  return out;
}

export function renderEditorNeofetch(data, { githubId, scale, scheme, color = false, logo } = {}) {
  const p = palette(scheme);
  const user = data.login || githubId;
  const languages = data.languages?.length ? data.languages.join(", ") : "—";
  const info = [
    ["Name", data.name || user],
    ["Platform", "GitHub"],
    ["Joined", data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 10) : "unknown"],
    ["Uptime", uptime(data.createdAt)],
    ["Repos", formatNumber(data.publicRepos)],
    ["Followers", formatNumber(data.followers)],
    ["Following", formatNumber(data.following)],
    ["Stars", formatNumber(data.totalStars)],
    ["Contributions", `${formatNumber(data.contributionsYear)} (1y)`],
    ["Languages", languages],
    ...(data.company ? [["Company", data.company]] : []),
    ...(data.location ? [["Location", data.location]] : []),
    ...(data.blog ? [["Website", data.blog.replace(/^https?:\/\//, "")]] : []),
    ...(data.bio ? [["Bio", data.bio.replace(/\s+/g, " ").trim()]] : [])
  ];
  // Width follows the content: logo, label column and the longest value (capped).
  const logoCols = logo ? Math.max(...logo.lines.map((parts) => parts.reduce((n, part) => n + part.t.length, 0))) : 0;
  const valueCols = Math.min(48, Math.max(`${user}@github`.length - 15, ...info.map(([, value]) => [...String(value)].length)));
  const WIDTH = Math.max(700, Math.ceil(20 + 44 + 20 + (logoCols + 4 + 15 + valueCols) * CHAR_W + 40 + 20));
  const logoRows = logo?.lines?.length ?? 0;
  const contentRows = Math.max(logoRows, info.length + 3);
  const panelH = 36 + 14 + LINE_H + 10 + contentRows * LINE_H + 18 + 24 + LINE_H;
  const editorH = 92;
  const HEIGHT = 20 + 30 + 35 + editorH + panelH + 22 + 20;

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `README.md — ${user}`,
    active: "explorer",
    tabs: [{ label: "README.md", badge: "md", active: true }],
    panel: panelH,
    panelTabs: ["PROBLEMS", "OUTPUT", "DEBUG CONSOLE", "*TERMINAL"],
    status: {
      left: [{ text: "⎇ main" }, { text: "⊗ 0  ⚠ 0" }],
      right: [{ text: "bash" }, { text: "UTF-8" }, { text: "Markdown" }]
    }
  });
  const e = win.regions.editor;
  const t = win.regions.panel;
  let body = win.svg;

  const readme = [
    { tokens: [["# ", "kw"], [`Hi, I'm ${data.name || user}`, "kw"]] },
    { tokens: [] },
    { tokens: [[fit(data.bio ? data.bio.replace(/\s+/g, " ").trim() : `Welcome to @${user}'s GitHub profile.`, e.w - 120, 13), "fg"]] }
  ];
  body += codeBlock(p, e.x, e.y + 8, e.w, readme, { size: 13, lineH: 22 });

  // Terminal: prompt, logo + info side by side, colour blocks, prompt.
  const x = t.x + 20;
  let y = t.y + 14;
  const prompt = (py, command = "") => codeTokens(p, x, py, [[`${user}@github`, "ok"], [":", "fg"], ["~", "link"], ["$ ", "fg"], [command, command === "█" ? "dim" : "fg"]], { size: FONT });
  body += prompt(y, "neofetch");
  y += LINE_H + 10;

  const logoColors = [p.fg, p.link, p.dim];
  if (logo) body += fadeIn(renderLogo(logo, logoColors, color ? null : p.fg, x, y), 0.1);
  const ix = x + (logoCols + 4) * CHAR_W;
  const valueX = ix + 15 * CHAR_W;
  const maxValueW = t.x + t.w - 20 - valueX;
  const title = `${user}@github`;
  let lines = text(ix, y, title, { size: FONT, fill: p.link, family: MONO, weight: 700 });
  lines += text(ix, y + LINE_H, "-".repeat(title.length), { size: FONT, fill: p.dim, family: MONO });
  info.forEach(([label, value], i) => {
    const ly = y + (i + 2) * LINE_H;
    lines += text(ix, ly, `${label}:`, { size: FONT, fill: p.link, family: MONO, weight: 700 });
    lines += text(valueX, ly, fit(value, maxValueW, FONT), { size: FONT, fill: p.fg, family: MONO });
  });
  if (data.partial) lines += text(ix, y + (info.length + 2) * LINE_H, "(some fields limited by API)", { size: FONT, fill: p.dim, family: MONO });
  body += fadeIn(lines, 0.25);

  // Colour blocks under the info column.
  const by = y + contentRows * LINE_H + 2;
  const blocks = [p.bg, p.err, p.ok, p.warn, p.kw, p.ctl, p.type, p.fg];
  blocks.forEach((fill, i) => {
    body += rect(ix + i * 24, by, 22, 14, fill, i === 0 ? `stroke="${p.line}"` : "");
  });

  const py = by + 18 + 24;
  body += prompt(py, "█");
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `neofetch — ${user}`,
    label: `Neofetch card for ${user}`,
    body
  });
}
