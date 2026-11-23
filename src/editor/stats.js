// Editor theme, stats card: the profile shown as an extension's details page.
import { avatarImage } from "./avatar.js";
import { button, editorWindow, fadeIn, fit, formatNumber, hline, palette, rect, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const WIDTH = 800;
const HEIGHT = 404;

function initials(login) {
  const chars = [...String(login ?? "?")];
  const upper = chars.slice(1).find((ch) => ch >= "A" && ch <= "Z");
  return `${chars[0] ?? "?"}${upper ?? chars[1] ?? ""}`;
}

// 0 stars = 1, ~3 = 2, ~9 = 3, ~20 = 4, 100+ = 5.
function rating(stars) {
  return Math.min(5, Math.max(1, Math.ceil(Math.log10(Number(stars ?? 0) + 1) * 3)));
}

export function renderEditorStats(data, { githubId, scale, scheme, avatar = null } = {}) {
  const p = palette(scheme);
  const user = data.login || githubId;
  const name = data.name || user;
  const now = new Date();
  const version = `v${now.getUTCFullYear()}.${now.getUTCMonth() + 1}`;
  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `Extension: ${user} — github`,
    active: "extensions",
    tabs: [{ label: `Extension: ${user}`, badge: "ext", active: true }],
    status: {
      left: [{ text: "⎇ main" }, { text: data.partial ? "⊗ 0  ⚠ 1" : "⊗ 0  ⚠ 0", color: data.partial ? p.warn : undefined }],
      right: [{ text: `★ ${formatNumber(data.totalStars)}` }, { text: "UTF-8" }, { text: "Markdown" }]
    }
  });
  const e = win.regions.editor;
  let body = win.svg;

  // Header: icon, name + version, publisher line, description, buttons.
  const ix = e.x + 24, iy = e.y + 18;
  // The extension icon is the profile photo.
  body += avatarImage(avatar, ix, iy, 96, { id: "ed-avatar", round: false, radius: 6, fallbackText: initials(user), fallbackFill: p.accent });

  const hx = ix + 96 + 20, hw = e.x + e.w - 24 - hx;
  const nameText = fit(user, hw - 90, 22);
  body += text(hx, iy + 22, nameText, { size: 22, fill: p.fg });
  const vx = hx + textWidth(nameText, 22) + 10;
  body += rect(vx, iy + 8, textWidth(version, 12) + 12, 18, p.chip, 'rx="3"');
  body += text(vx + 6, iy + 21, version, { size: 12, fill: p.dim });

  const filled = rating(data.totalStars);
  const sub = [
    { t: fit(name, 170, 13), fill: p.link },
    { t: `⬇ ${formatNumber(data.contributionsYear)} contributions`, fill: p.dim },
    { t: `${"★".repeat(filled)}${"☆".repeat(5 - filled)}`, fill: p.star, after: ` (${formatNumber(data.totalStars)})` },
    { t: `github.com/${user}`, fill: p.dim }
  ];
  // Star glyphs are much wider than the text estimate, so measure them separately.
  const partW = (part) => (part.after ? 5 * 13 * 0.98 + 2 + textWidth(part.after, 13) : textWidth(part.t, 13));
  let sx = hx;
  for (const part of sub) {
    if (sx + partW(part) > hx + hw) break;
    body += text(sx, iy + 46, part.t, { size: 13, fill: part.fill });
    if (part.after) body += text(sx + 5 * 13 * 0.98 + 2, iy + 46, part.after, { size: 13, fill: p.dim });
    sx += partW(part) + 18;
  }
  body += text(hx, iy + 68, fit(`GitHub activity of ${name}: pull requests, issues, stars and contributions.`, hw, 13), { size: 13, fill: p.fg });
  let bx = hx;
  for (const [label, ghost] of [["Follow", false], ["Repositories", true], ["⚙", true]]) {
    const b = button(p, bx, iy + 78, label, { ghost });
    body += b.svg;
    bx += b.w + 6;
  }

  // Page tabs.
  const ty = iy + 96 + 22;
  body += hline(e.x + 24, ty + 18, e.w - 48, p.line);
  let tx = e.x + 24;
  ["DETAILS", "FEATURES", "CHANGELOG"].forEach((label, i) => {
    body += text(tx, ty + 10, label, { size: 11, fill: i === 0 ? p.fg : p.dim, extra: 'letter-spacing="0.6"' });
    const tw = textWidth(label, 11) + label.length * 0.6;
    if (i === 0) body += rect(tx, ty + 17, tw, 1, p.accent);
    tx += tw + 26;
  });

  // Details: two columns of key/value rows, plus a "more info" aside.
  const asideW = 190;
  const kx = e.x + 24, ky = ty + 34, kw = e.w - 48 - asideW - 28;
  const colW = (kw - 24) / 2;
  const rows = [
    ["OSS Contribs", data.ossContribs], ["Total PRs", data.totalPRs], ["Total Issues", data.totalIssues],
    ["Total Stars", data.totalStars], ["Total Forks", data.totalForks], ["Contributions (1y)", data.contributionsYear]
  ];
  rows.forEach(([label, value], i) => {
    const cx = kx + (i < 3 ? 0 : colW + 24);
    const cy = ky + (i % 3) * 30;
    let row = text(cx, cy + 15, label, { size: 13, fill: p.dim });
    row += text(cx + colW, cy + 15, formatNumber(value), { size: 13, fill: p.fg, anchor: "end", family: "Consolas, Menlo, monospace" });
    row += hline(cx, cy + 24, colW, p.line);
    body += fadeIn(row, 0.05 + i * 0.05);
  });

  const ax = e.x + e.w - 24 - asideW;
  body += text(ax, ky + 4, "MORE INFO", { size: 11, weight: 600, fill: p.dim, extra: 'letter-spacing="0.5"' });
  [["Identifier", `github.${user}`], ["Published", "GitHub"], ["Last updated", now.toISOString().slice(0, 10)]].forEach(([k, v], i) => {
    const yy = ky + 24 + i * 20;
    body += text(ax, yy, k, { size: 12, fill: p.dim });
    body += text(ax + asideW, yy, fit(v, asideW - 80, 12), { size: 12, fill: p.fg, anchor: "end" });
  });
  body += text(ax, ky + 96, "Repository  ·  Issues  ·  Profile", { size: 12, fill: p.link });
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `Extension: ${user}`,
    label: `GitHub stats card for ${user}`,
    body
  });
}
