// Windows 98 "System Properties" (General tab) for the neofetch card.
import { C, ICONS, MONO, button, fit, formatNumber, svgDocument, tabPage, tabs, text, windowFrame } from "./kit.js";

const WIDTH = 700;
const HEIGHT = 480;

// The 16 colours of the standard VGA palette stand in for neofetch's colour bars.
const VGA = [
  "#000000", "#800000", "#008000", "#808000", "#000080", "#800080", "#008080", "#c0c0c0",
  "#808080", "#ff0000", "#00ff00", "#ffff00", "#0000ff", "#ff00ff", "#00ffff", "#ffffff"
];

// Logo colours on the grey dialog face: outline / eyes / shading.
const LOGO_COLORS = [C.navy, "#ff0000", C.desktop];

function joined(createdAt) {
  return String(createdAt ?? "").slice(0, 10) || "unknown";
}

function renderLogo(logo, color, x, y, { size = 11, charW = 6.6, lineH = 13 } = {}) {
  let out = "";
  logo.lines.forEach((parts, row) => {
    let col = 0;
    for (const part of parts) {
      const fill = color ? (LOGO_COLORS[(part.c ?? 1) - 1] ?? LOGO_COLORS[0]) : C.dark;
      // Emit each non-blank run separately so collapsed spaces can't shift the art.
      for (const match of part.t.matchAll(/\S+/g)) {
        const cx = x + (col + match.index) * charW;
        out += text(cx.toFixed(1), y + row * lineH, match[0], {
          size,
          family: MONO,
          fill,
          weight: 700,
          extra: `textLength="${(match[0].length * charW).toFixed(1)}" lengthAdjust="spacingAndGlyphs"`
        });
      }
      col += part.t.length;
    }
  });
  return out;
}

export function renderWin98Neofetch(data, { githubId, scale, color = false, logo } = {}) {
  const user = data.login || githubId;
  const x = 20, y = 20, w = WIDTH - 40, h = HEIGHT - 40;
  const win = windowFrame(x, y, w, h, "System Properties", { icon: ICONS.computer, controls: ["help", "close"] });
  const { client } = win;
  let body = win.svg;

  const strip = tabs(client.x + 6, client.y + 6, ["General", "Device Manager", "Hardware Profiles", "Performance"], 0);
  const pageX = client.x + 6, pageY = strip.bodyY, pageW = client.w - 12, pageH = 340;
  body += tabPage(pageX, pageY, pageW, pageH, strip.activeX, strip.activeW);
  body += strip.svg;

  // Left: the octocat art where the dialog shows its system logo.
  const leftW = 250;
  if (logo) {
    const charW = 7.4, lineH = 13.5;
    const cols = Math.max(...logo.lines.map((parts) => parts.reduce((n, p) => n + p.t.length, 0)));
    const artW = cols * charW;
    const artX = pageX + (leftW - artW) / 2 + 8;
    body += `<g class="w98-fade">${renderLogo(logo, color, artX, pageY + 34, { size: 12.5, charW, lineH })}</g>`;
  }

  // Colour swatches under the art (neofetch's colour bars).
  const sw = 14, gap = 2;
  const swX = pageX + (leftW - (8 * sw + 7 * gap)) / 2 + 8;
  const swY = pageY + 298;
  VGA.forEach((fill, i) => {
    const sx = swX + (i % 8) * (sw + gap);
    const sy = swY + Math.floor(i / 8) * (sw + gap);
    body += `<rect x="${sx + 0.5}" y="${sy + 0.5}" width="${sw - 1}" height="${sw - 1}" fill="${fill}" stroke="${C.shadow}"/>`;
  });

  // Right: the classic System / Registered to / Computer blocks.
  const tx = pageX + leftW + 22;
  const vx = tx + 16;
  const maxW = pageX + pageW - 14 - vx;
  const languages = data.languages?.length ? data.languages.join(", ") : "—";
  const website = data.blog ? data.blog.replace(/^https?:\/\//, "") : "";

  const blocks = [
    ["System:", ["GitHub", "github.com", `Joined ${joined(data.createdAt)}`]],
    ["Registered to:", [data.name, `@${user}`, data.company, data.location, data.bio].filter(Boolean)],
    ["Computer:", [
      `${formatNumber(data.publicRepos)} public repositories`,
      `${formatNumber(data.totalStars)} stars earned`,
      `${formatNumber(data.followers)} followers, ${formatNumber(data.following)} following`,
      `${formatNumber(data.contributionsYear)} contributions (1y)`,
      `Languages: ${languages}`,
      website
    ].filter(Boolean)]
  ];

  const lineH = 16;
  const maxLines = 19;
  let ly = pageY + 30;
  let used = 0;
  for (const [label, lines] of blocks) {
    if (used >= maxLines) break;
    body += text(tx, ly, label);
    ly += lineH + 2;
    used += 1;
    for (const line of lines) {
      if (used >= maxLines) break;
      body += text(vx, ly, fit(line, maxW));
      ly += lineH;
      used += 1;
    }
    ly += lineH - 4;
  }
  if (data.partial) {
    body += text(tx, pageY + pageH - 14, fit("(some fields limited by API)", pageX + pageW - 14 - tx, 11), { size: 11, fill: C.disabled });
  }

  // Dialog buttons.
  const by = pageY + pageH + 10;
  const bw = 75, bh = 23;
  const right = pageX + pageW;
  body += button(right - bw * 2 - 6, by, bw, bh, "OK", { isDefault: true });
  body += button(right - bw, by, bw, bh, "Cancel");

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title: `System Properties - ${user}`,
    label: `GitHub neofetch card for ${user}`,
    body
  });
}
