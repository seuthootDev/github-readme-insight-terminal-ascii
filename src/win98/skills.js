// Windows 98 "Control Panel" in Large Icons view for the skills card: each skill is an applet icon.
import { C, ICONS, etchedH, fit, menuBar, raised, statusBar, sunken, svgDocument, text, textWidth, windowFrame } from "./kit.js";

const CELL_W = 104;
const ICON_PX = 2;            // 20x20 bitmaps -> 40px icons
const ICON = 20 * ICON_PX;
const MIN_WIDTH = 520;

function luminance(hex) {
  const n = Number.parseInt(hex, 16);
  return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

// Word-wrap a caption into at most two centred lines, like Explorer's icon labels.
function captionLines(title, maxWidth) {
  if (textWidth(title, 11) <= maxWidth) return [title];
  const words = title.split(" ");
  let first = "";
  while (words.length > 1 && textWidth(`${first} ${words[0]}`.trim(), 11) <= maxWidth) {
    first = `${first} ${words.shift()}`.trim();
  }
  if (!first) return [fit(title, maxWidth, 11)];
  return [first, fit(words.join(" "), maxWidth, 11)];
}

// Brand bitmap at 40px. Light brand colours get a 1px black outline (offset copies) so they read on white.
function iconSvg(icon, x, y) {
  const d = icon.path;
  const fill = `#${icon.hex}`;
  let out = "";
  if (luminance(icon.hex) > 0.6) {
    const o = 1 / ICON_PX;
    for (const [dx, dy] of [[-o, 0], [o, 0], [0, -o], [0, o]]) {
      out += `<path transform="translate(${x} ${y}) scale(${ICON_PX}) translate(${dx} ${dy})" shape-rendering="crispEdges" fill="${C.dark}" d="${d}"/>`;
    }
  }
  out += `<path transform="translate(${x} ${y}) scale(${ICON_PX})" shape-rendering="crispEdges" fill="${fill}" d="${d}"/>`;
  return out;
}

// Small 16px control-panel glyph for the title/address bar (original drawing: a window with a gear-ish dot grid).
function panelIcon(x, y) {
  return `<rect x="${x + 1.5}" y="${y + 2.5}" width="13" height="11" fill="${C.white}" stroke="${C.dark}"/>`
    + `<rect x="${x + 2}" y="${y + 3}" width="12" height="2" fill="${C.navy}"/>`
    + `<rect x="${x + 4}" y="${y + 7}" width="3" height="3" fill="#ff0000"/><rect x="${x + 9}" y="${y + 7}" width="3" height="3" fill="#008000"/>`
    + `<rect x="${x + 4}" y="${y + 11}" width="8" height="1" fill="${C.shadow}"/>`;
}

export function renderWin98Skills(data, { githubId, scale, perline, labels } = {}) {
  const icons = Array.isArray(data.icons) ? data.icons : [];
  const missing = Array.isArray(data.missing) ? data.missing : [];
  const user = githubId || "dev";
  const perLine = Math.max(1, perline ?? 6);
  const showLabels = labels !== false;
  const rows = Math.max(1, Math.ceil(icons.length / perLine));
  const cellH = showLabels ? ICON + 40 : ICON + 16;

  const gridW = perLine * CELL_W;
  const WIDTH = Math.max(MIN_WIDTH, gridW + 40 + 8 + 8);
  const x = 20, y = 20, w = WIDTH - 40;
  // title(18) + menu(20) + etched + address(26) + view + status(20)
  const viewH = rows * cellH + 16;
  const h = 3 + 18 + 2 + 20 + 2 + 28 + viewH + 2 + 20 + 4;
  const HEIGHT = y + h + 20;

  const title = `Skills (@${user})`;
  const win = windowFrame(x, y, w, h, title, { icon: panelIcon, controls: ["min", "max", "close"] });
  const { client } = win;
  let body = win.svg;

  // Menu bar.
  body += menuBar(client.x, client.y, ["File", "Edit", "View", "Go", "Favorites", "Help"], { size: 11 });
  let cy = client.y + 20;
  body += etchedH(client.x, cy, client.w);
  cy += 2;

  // Address bar band.
  body += raised(client.x, cy, client.w, 28, { thick: false });
  body += `<path d="M${client.x + 4.5} ${cy + 4}V${cy + 24}" stroke="${C.white}"/><path d="M${client.x + 5.5} ${cy + 4}V${cy + 24}" stroke="${C.shadow}"/>`;
  body += text(client.x + 12, cy + 18, "Address", { size: 11 });
  const fieldX = client.x + 62, fieldW = client.w - 62 - 6;
  body += sunken(fieldX, cy + 4, fieldW, 20);
  body += panelIcon(fieldX + 3, cy + 6);
  body += text(fieldX + 23, cy + 18, fit(`Control Panel\\Skills (@${user})`, fieldW - 30, 11), { size: 11 });
  cy += 28;

  // Large Icons view.
  const viewX = client.x, viewY = cy, viewW = client.w;
  body += sunken(viewX, viewY, viewW, viewH);
  const gridX = viewX + 8; // Explorer packs icons from the top-left.
  if (icons.length === 0) {
    body += text(viewX + 12, viewY + 22, "This folder is empty.", { size: 11, fill: C.shadow });
  }
  icons.forEach((icon, i) => {
    const cx = gridX + (i % perLine) * CELL_W;
    const ty = viewY + 10 + Math.floor(i / perLine) * cellH;
    const ix = cx + (CELL_W - ICON) / 2;
    body += `<g class="w98-in" style="animation-delay:${(0.1 + i * 0.05).toFixed(2)}s">`;
    body += iconSvg(icon, ix, ty);
    if (showLabels) {
      const lines = captionLines(icon.title, CELL_W - 10);
      const selected = i === 0;
      if (selected) {
        const lw = Math.min(CELL_W - 4, Math.max(...lines.map((l) => textWidth(l, 11))) + 6);
        body += `<rect x="${cx + (CELL_W - lw) / 2}" y="${ty + ICON + 4}" width="${lw}" height="${lines.length * 13 + 3}" fill="${C.select}"/>`;
        body += `<rect x="${cx + (CELL_W - lw) / 2 + 0.5}" y="${ty + ICON + 4.5}" width="${lw - 1}" height="${lines.length * 13 + 2}" fill="none" stroke="#ffff80" stroke-dasharray="1 1"/>`;
      }
      lines.forEach((line, j) => {
        body += text(cx + CELL_W / 2, ty + ICON + 15 + j * 13, line, { size: 11, anchor: "middle", fill: selected ? C.selectText : C.text });
      });
    }
    body += "</g>";
  });

  // Status bar.
  const statusY = viewY + viewH + 2;
  const count = `${icons.length} object(s)`;
  body += statusBar(client.x, statusY, client.w, [
    { text: count, w: Math.max(110, Math.round(textWidth(count, 11) + 20)) },
    { text: missing.length ? `not found: ${missing.join(", ")}` : "Control Panel" }
  ]);

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title,
    label: `Skills: ${icons.map((i) => i.title).join(", ")}`,
    body
  });
}
