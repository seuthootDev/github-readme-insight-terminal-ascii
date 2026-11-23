// Editor theme, neofetch card: neofetch running in the editor's integrated terminal panel, with the
// GitHub mark drawn as a vector where neofetch would print its distro logo.
import { MONO, codeBlock, codeTokens, editorWindow, fadeIn, fit, formatNumber, palette, rect, svgDocument, text, windowEnd } from "./kit.js";

const FONT = 12.5;
const CHAR_W = FONT * 0.6;
const LINE_H = 16;
const LOGO = 200;

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

export function renderEditorNeofetch(data, { githubId, scale, scheme, ide, logoPath = null } = {}) {
  const p = palette(scheme, ide);
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
  const valueCols = Math.min(48, Math.max(`${user}@github`.length - 15, ...info.map(([, value]) => [...String(value)].length)));
  const WIDTH = Math.max(700, Math.ceil(20 + 44 + 20 + LOGO + 28 + (15 + valueCols) * CHAR_W + 40 + 20));
  const infoRows = info.length + 2 + (data.partial ? 1 : 0);
  const contentH = Math.max(LOGO, 12 + infoRows * LINE_H + 18);
  const panelH = 36 + 14 + 10 + contentH + 30 + 8;
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
  const promptY = t.y + 14;
  const prompt = (py, command = "") => codeTokens(p, x, py, [[`${user}@github`, "ok"], [":", "fg"], ["~", "link"], ["$ ", "fg"], [command, command === "█" ? "dim" : "fg"]], { size: FONT });
  body += prompt(promptY, "neofetch");
  const y = promptY + 10;

  // The mark is a 24-unit simple-icons path; it fills the logo box with a small margin.
  const markSize = LOGO - 24;
  const logo = logoPath
    ? `<path transform="translate(${x + 12} ${y + 12}) scale(${markSize / 24})" fill="${p.fg}" d="${logoPath}"/>`
    : text(x + LOGO / 2, y + LOGO / 2 + 16, "GitHub", { size: 44, weight: 700, fill: p.fg, anchor: "middle" });
  body += fadeIn(logo, 0.1);
  const ix = x + LOGO + 28;
  const valueX = ix + 15 * CHAR_W;
  const maxValueW = t.x + t.w - 20 - valueX;
  const ty = y + 12;
  const title = `${user}@github`;
  let lines = text(ix, ty, title, { size: FONT, fill: p.link, family: MONO, weight: 700 });
  lines += text(ix, ty + LINE_H, "-".repeat(title.length), { size: FONT, fill: p.dim, family: MONO });
  info.forEach(([label, value], i) => {
    const ly = ty + (i + 2) * LINE_H;
    lines += text(ix, ly, `${label}:`, { size: FONT, fill: p.link, family: MONO, weight: 700 });
    lines += text(valueX, ly, fit(value, maxValueW, FONT), { size: FONT, fill: p.fg, family: MONO });
  });
  if (data.partial) lines += text(ix, ty + (info.length + 2) * LINE_H, "(some fields limited by API)", { size: FONT, fill: p.dim, family: MONO });
  body += fadeIn(lines, 0.25);

  // Colour blocks under the info column.
  const by = ty + infoRows * LINE_H - 4;
  [p.bg, p.err, p.ok, p.warn, p.kw, p.ctl, p.type, p.fg].forEach((fill, i) => {
    body += rect(ix + i * 24, by, 22, 14, fill, i === 0 ? `stroke="${p.line}"` : "");
  });

  body += prompt(y + contentH + 26, "█");
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `neofetch — ${user}`,
    label: `Neofetch card for ${user}`,
    body
  });
}
