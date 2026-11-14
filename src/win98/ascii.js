// Windows 98 "Paint" window for the ascii avatar card: the portrait sits on the bitmap canvas.
import { C, fit, menuBar, raised, sunken, svgDocument, statusBar, text, windowFrame } from "./kit.js";

const ART_W = 520; // target width of the portrait on the canvas
const TOOL = 25; // tool button size
const SWATCH = 16;

// Paint's default 28-colour palette, top row then bottom row.
const PAINT_PALETTE = [
  ["#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080", "#808040", "#004040", "#0080ff", "#004080", "#8000ff", "#804000"],
  ["#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffff80", "#00ff80", "#80ffff", "#8080ff", "#ff0080", "#ff8040"]
];

// On a white canvas the mono portrait is drawn in black, so density is inverted.
const INVERT = { " ": "█", "░": "▓", "▒": "▒", "▓": "░", "█": " " };

const K = C.dark;
const line = (d, extra = "") => `<path d="${d}" stroke="${K}" fill="none"${extra}/>`;

// 16x16 tool glyphs, drawn at (x, y). Simple originals in the spirit of the classic tool box.
const TOOL_GLYPHS = [
  // free-form select
  (x, y) => line(`M${x + 3.5} ${y + 6.5}L${x + 8.5} ${y + 2.5}L${x + 13.5} ${y + 5.5}L${x + 11.5} ${y + 12.5}L${x + 4.5} ${y + 13.5}Z`, ` stroke-dasharray="2 1"`),
  // rectangle select
  (x, y) => `<rect x="${x + 2.5}" y="${y + 3.5}" width="11" height="9" fill="none" stroke="${K}" stroke-dasharray="2 1"/>`,
  // eraser
  (x, y) => `<path d="M${x + 2.5} ${y + 10.5}L${x + 8.5} ${y + 4.5}H${x + 13.5}L${x + 7.5} ${y + 10.5}Z" fill="#ffffff" stroke="${K}"/><path d="M${x + 2.5} ${y + 10.5}V${y + 13.5}H${x + 7.5}L${x + 13.5} ${y + 7.5}V${y + 4.5}" fill="#ffff80" stroke="${K}"/>`,
  // fill bucket
  (x, y) => `<path d="M${x + 3.5} ${y + 8.5}L${x + 8.5} ${y + 3.5}L${x + 13.5} ${y + 8.5}L${x + 8.5} ${y + 13.5}Z" fill="#c0c0c0" stroke="${K}"/><path d="M${x + 13} ${y + 9}v4" stroke="#0000ff" stroke-width="2"/>`,
  // pick colour (dropper)
  (x, y) => `<path d="M${x + 3} ${y + 13}L${x + 10} ${y + 6}" stroke="${K}" stroke-width="2"/><rect x="${x + 9.5}" y="${y + 2.5}" width="4" height="4" fill="${K}" transform="rotate(45 ${x + 11.5} ${y + 4.5})"/>`,
  // magnifier
  (x, y) => `<rect x="${x + 2.5}" y="${y + 2.5}" width="7" height="7" fill="#80ffff" stroke="${K}"/><path d="M${x + 9} ${y + 9}L${x + 14} ${y + 14}" stroke="${K}" stroke-width="2"/>`,
  // pencil
  (x, y) => `<path d="M${x + 3.5} ${y + 12.5}L${x + 11.5} ${y + 4.5}L${x + 13.5} ${y + 6.5}L${x + 5.5} ${y + 14.5}H${x + 3.5}Z" fill="#ffff00" stroke="${K}"/><path d="M${x + 3.5} ${y + 12.5}L${x + 5.5} ${y + 14.5}" stroke="${K}"/>`,
  // brush
  (x, y) => `<path d="M${x + 13} ${y + 2}L${x + 7} ${y + 9}" stroke="#804000" stroke-width="2"/><path d="M${x + 4.5} ${y + 9.5}H${x + 8.5}V${y + 13.5}H${x + 2.5}Z" fill="${K}"/>`,
  // airbrush
  (x, y) => `<rect x="${x + 7.5}" y="${y + 6.5}" width="4" height="8" fill="#c0c0c0" stroke="${K}"/><path d="M${x + 9.5} ${y + 6}V${y + 4}" stroke="${K}"/>`
    + [[2, 2], [4, 4], [1, 5], [3, 7], [5, 1], [2, 9]].map(([dx, dy]) => `<rect x="${x + dx}" y="${y + dy}" width="1" height="1" fill="${K}"/>`).join(""),
  // text
  (x, y) => text(x + 8, y + 13, "A", { size: 13, weight: 700, anchor: "middle", family: "'Times New Roman', Times, serif" }),
  // line
  (x, y) => line(`M${x + 2} ${y + 14}L${x + 14} ${y + 2}`),
  // curve
  (x, y) => line(`M${x + 2} ${y + 13}C${x + 4} ${y + 2} ${x + 10} ${y + 15} ${x + 14} ${y + 3}`),
  // rectangle
  (x, y) => `<rect x="${x + 2.5}" y="${y + 3.5}" width="11" height="9" fill="none" stroke="${K}"/>`,
  // polygon
  (x, y) => line(`M${x + 2.5} ${y + 13.5}L${x + 5.5} ${y + 3.5}H${x + 13.5}L${x + 9.5} ${y + 8.5}L${x + 13.5} ${y + 13.5}Z`),
  // ellipse
  (x, y) => `<ellipse cx="${x + 8}" cy="${y + 8}" rx="6" ry="4.5" fill="none" stroke="${K}"/>`,
  // chamfered rectangle (stands in for "rounded rectangle")
  (x, y) => line(`M${x + 4.5} ${y + 3.5}H${x + 11.5}L${x + 13.5} ${y + 5.5}V${y + 10.5}L${x + 11.5} ${y + 12.5}H${x + 4.5}L${x + 2.5} ${y + 10.5}V${y + 5.5}Z`)
];
const ACTIVE_TOOL = 6; // pencil

function paintIcon(x, y) {
  // A small palette board with three paint dots and a brush.
  return `<path d="M${x + 1.5} ${y + 8.5}C${x + 1.5} ${y + 3.5} ${x + 13.5} ${y + 2.5} ${x + 14.5} ${y + 7.5}C${x + 15.5} ${y + 11.5} ${x + 10.5} ${y + 10.5} ${x + 9.5} ${y + 12.5}C${x + 8.5} ${y + 15.5} ${x + 1.5} ${y + 14.5} ${x + 1.5} ${y + 8.5}Z" fill="#ffff80" stroke="${K}"/>`
    + `<rect x="${x + 4}" y="${y + 6}" width="2" height="2" fill="#ff0000"/><rect x="${x + 7}" y="${y + 5}" width="2" height="2" fill="#0000ff"/><rect x="${x + 10}" y="${y + 6}" width="2" height="2" fill="#008000"/>`
    + `<path d="M${x + 5} ${y + 12}L${x + 8} ${y + 9}" stroke="#804000" stroke-width="1.5"/>`;
}

// Each glyph's ink density, used to draw the shade blocks as crisp 1-bit dithers (mono) or as
// colour at that density over a black bitmap (color). Fonts can't then leave gaps between cells.
const DENSITY = { "░": 1, "▒": 2, "▓": 3, "█": 4 };
const OPACITY = [0, 0.25, 0.5, 0.75, 1];

function ditherDefs() {
  const dot = (x, y) => `<rect x="${x}" y="${y}" width="2" height="2" fill="${K}"/>`;
  const tiles = [
    dot(0, 0),
    dot(0, 0) + dot(2, 2),
    dot(0, 0) + dot(2, 2) + dot(2, 0)
  ];
  return tiles.map((inner, i) => `<pattern id="w98-ink${i + 1}" width="4" height="4" patternUnits="userSpaceOnUse">${inner}</pattern>`).join("");
}

function renderArt(rows, { x, y, charW, lineH, color }) {
  const out = [];
  rows.forEach((cells, row) => {
    let start = 0;
    let key = null;
    let paint = null;
    const flush = (end) => {
      if (paint) {
        // Snap to whole units so neighbouring cells meet without hairline seams.
        const x0 = Math.round(x + start * charW), x1 = Math.round(x + end * charW);
        const y0 = Math.round(y + row * lineH), y1 = Math.round(y + (row + 1) * lineH);
        out.push(`<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" ${paint}/>`);
      }
    };
    cells.forEach((cell, col) => {
      const ch = color ? cell.ch : (INVERT[cell.ch] ?? cell.ch);
      const density = DENSITY[ch] ?? 0;
      let nextKey = null;
      let nextPaint = null;
      if (density > 0) {
        if (color) {
          const fill = cell.fill ?? C.white;
          nextKey = `${fill}/${density}`;
          nextPaint = `fill="${fill}"${density < 4 ? ` fill-opacity="${OPACITY[density]}"` : ""}`;
        } else {
          nextKey = String(density);
          nextPaint = `fill="${density === 4 ? K : `url(#w98-ink${density})`}"`;
        }
      }
      if (nextKey !== key) {
        flush(col);
        start = col;
        key = nextKey;
        paint = nextPaint;
      }
    });
    flush(cells.length);
  });
  return out.join("");
}

export function renderWin98Ascii(profile, rows, { githubId, scale, cols, color = false } = {}) {
  const user = profile.login || githubId;
  const gridCols = Math.max(1, cols ?? rows[0]?.length ?? 1);
  const gridRows = Math.max(1, rows.length);
  // Keep the bitmap square like the avatar: rows already compensate for glyph aspect.
  const charW = ART_W / gridCols;
  const lineH = ART_W / gridRows;
  const artW = ART_W, artH = ART_W;
  const pad = 8;
  const canvasW = artW + pad * 2, canvasH = artH + pad * 2;

  const toolboxW = TOOL * 2 + 6;
  const workW = canvasW + 4 + 12; // canvas + left gap + room for the resize handles
  const workH = canvasH + 4 + 12;
  const paletteH = SWATCH * 2 + 10;
  const statusH = 20;

  const clientW = 2 + toolboxW + 2 + workW + 4 + 2;
  const clientH = 22 + workH + 4 + 2 + paletteH + 4 + statusH + 2;
  const winW = clientW + 8, winH = clientH + 18 + 9;
  const WIDTH = winW + 40, HEIGHT = winH + 40;

  const title = `${user}.bmp - Paint`;
  const win = windowFrame(20, 20, winW, winH, title, { icon: paintIcon });
  const { client } = win;
  let body = win.svg;

  // Menu bar.
  body += menuBar(client.x, client.y + 1, ["File", "Edit", "View", "Image", "Colors", "Help"]);
  const top = client.y + 22;

  // Tool box: 2 columns x 8 rows of small raised buttons, the pencil pressed in.
  const tbX = client.x + 2;
  body += `<path d="M${tbX + 0.5} ${top + workH}V${top + 0.5}H${tbX + toolboxW}" stroke="${C.white}" fill="none"/>`;
  TOOL_GLYPHS.forEach((glyph, i) => {
    const bx = tbX + 3 + (i % 2) * TOOL;
    const by = top + 4 + Math.floor(i / 2) * TOOL;
    if (i === ACTIVE_TOOL) {
      body += sunken(bx, by, TOOL, TOOL, { fill: C.white });
      body += `<rect x="${bx + 2}" y="${by + 2}" width="${TOOL - 4}" height="${TOOL - 4}" fill="url(#w98-dither)"/>`;
      body += glyph(bx + 5, by + 5);
    } else {
      body += raised(bx, by, TOOL, TOOL, { thick: false });
      body += glyph(bx + 4, by + 4);
    }
  });
  // Tool options box (line widths for the pencil).
  const obY = top + 4 + 8 * TOOL + 6;
  body += sunken(tbX + 7, obY, TOOL * 2 - 8, 66, { fill: C.face });
  [1, 2, 3, 4, 5].forEach((wd, i) => {
    const ly = obY + 10 + i * 11;
    if (i === 0) body += `<rect x="${tbX + 11}" y="${ly - 4}" width="${TOOL * 2 - 16}" height="9" fill="${C.select}"/>`;
    body += `<rect x="${tbX + 15}" y="${ly - wd / 2}" width="${TOOL * 2 - 24}" height="${wd}" fill="${i === 0 ? C.white : K}"/>`;
  });

  // Work area: dark grey backdrop, white canvas with the portrait, resize handles.
  const waX = tbX + toolboxW + 2;
  body += sunken(waX, top, workW, workH, { fill: C.shadow });
  const cx = waX + 4, cy = top + 4;
  body += `<rect x="${cx}" y="${cy}" width="${canvasW}" height="${canvasH}" fill="${C.white}"/>`;
  if (color) {
    body += `<rect x="${cx + pad}" y="${cy + pad}" width="${artW}" height="${artH}" fill="${K}"/>`;
  }
  body += `<g class="w98-fade" shape-rendering="crispEdges">${renderArt(rows, { x: cx + pad, y: cy + pad, charW, lineH, color })}</g>`;
  const handle = (hx, hy) => `<rect x="${hx}" y="${hy}" width="3" height="3" fill="${C.select}"/>`;
  body += handle(cx + canvasW, cy + canvasH / 2 - 1) + handle(cx + canvasW / 2 - 1, cy + canvasH) + handle(cx + canvasW, cy + canvasH);

  // Colour box: current foreground/background swatch, then the 28 colours.
  const pY = top + workH + 6;
  const pX = client.x + 2;
  body += sunken(pX, pY, paletteH, paletteH, { fill: C.face });
  body += `<rect x="${pX + 15.5}" y="${pY + 15.5}" width="13" height="13" fill="${C.white}" stroke="${C.shadow}"/>`;
  body += `<rect x="${pX + 7.5}" y="${pY + 7.5}" width="13" height="13" fill="${K}" stroke="${C.light}"/>`;
  PAINT_PALETTE.forEach((rowColors, r) => {
    rowColors.forEach((fill, i) => {
      body += sunken(pX + paletteH + 2 + i * SWATCH, pY + 3 + r * SWATCH, SWATCH, SWATCH, { fill });
    });
  });
  const infoX = pX + paletteH + 2 + 14 * SWATCH + 12;
  const infoW = client.x + client.w - 6 - infoX;
  if (infoW > 60) {
    body += text(infoX, pY + 16, fit(profile.name || user, infoW, 12, true), { weight: 700 });
    body += text(infoX, pY + 33, fit(`@${user}`, infoW, 11), { size: 11, fill: C.disabled });
  }

  // Status bar.
  const sY = client.y + client.h - statusH - 1;
  const help = profile.bio ? profile.bio.replace(/\s+/g, " ").trim() : "For Help, click Help Topics on the Help Menu.";
  const sizeLabel = `${gridCols}x${gridRows}`;
  const modeLabel = color ? "color" : "mono";
  const smallW = 86;
  body += statusBar(client.x, sY, client.w, [
    { text: help, w: client.w - smallW * 2 - 4 },
    { text: sizeLabel, w: smallW },
    { text: modeLabel }
  ]);

  const defs = `<pattern id="w98-dither" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="2" height="2" fill="${C.white}"/><rect width="1" height="1" fill="${C.face}"/><rect x="1" y="1" width="1" height="1" fill="${C.face}"/></pattern>${ditherDefs()}`;

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title,
    label: `ASCII avatar for ${user}`,
    body,
    defs
  });
}
