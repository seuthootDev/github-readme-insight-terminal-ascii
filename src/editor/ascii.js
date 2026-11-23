// Editor theme, ASCII avatar: avatar.txt open with a minimap, profile.json split beside it.
import { MONO, codeBlock, editorWindow, esc, fit, palette, rect, svgDocument, tabStrip, text, vline, windowEnd } from "./kit.js";

const ART_W = 360;
const RIGHT_W = 320;
const MINIMAP_W = 56;

// Glyph runs of one colour, pinned to their columns so any fallback font keeps the shape.
function artRuns(rows, { charW, lineH, fontSize, monoFill }) {
  let out = "";
  rows.forEach((cells, row) => {
    const y = (row + 0.8) * lineH;
    let run = "", fill = null, start = 0;
    const flush = (col) => {
      if (run) {
        out += `<text x="${(start * charW).toFixed(2)}" y="${y.toFixed(2)}" fill="${fill}" textLength="${(run.length * charW).toFixed(2)}" lengthAdjust="spacingAndGlyphs">${esc(run)}</text>`;
      }
      run = "";
      fill = null;
      start = col;
    };
    cells.forEach((cell, col) => {
      if (cell.ch === " ") { flush(col + 1); return; }
      const f = cell.fill ?? monoFill;
      if (fill !== null && f !== fill) flush(col);
      if (!run) start = col;
      fill = f;
      run += cell.ch;
    });
    flush(cells.length);
  });
  return `<g font-size="${fontSize.toFixed(2)}" font-family="${MONO}">${out}</g>`;
}

export function renderEditorAscii(profile, rows, { githubId, scale, scheme, color = false } = {}) {
  const p = palette(scheme);
  const user = profile.login || githubId;
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const charW = ART_W / cols;
  // Same proportions as the terminal card: glyphs at their natural width and a 1.25em line, so
  // the block glyphs of neighbouring rows never overlap into stripes.
  const fontSize = charW / 0.6;
  const lineH = fontSize * 1.25;
  const artH = lineH * rows.length;

  const gutter = 46;
  const leftW = gutter + ART_W + 18 + MINIMAP_W + 8;
  const WIDTH = 20 + 44 + leftW + RIGHT_W + 20;
  const editorH = Math.round(artH + 24);
  const HEIGHT = 20 + 30 + 35 + editorH + 22 + 20;

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `avatar.txt — ${user}`,
    active: "explorer",
    tabs: [{ label: "avatar.txt", badge: "txt", active: true, maxW: 200 }],
    status: {
      left: [{ text: "⎇ main" }, { text: "⊗ 0  ⚠ 0" }],
      right: [{ text: `Ln ${rows.length}, Col ${cols}` }, { text: color ? "RGB" : "Plain Text" }, { text: "UTF-8" }]
    }
  });
  const e = win.regions.editor;
  let body = win.svg;

  // Right editor group: its own tab strip over the shared one.
  const rx = e.x + leftW;
  body += tabStrip(p, rx, e.y - 35, RIGHT_W, [{ label: "profile.json", badge: "json", active: true }]);
  body += rect(rx, e.y, RIGHT_W, e.h, p.bg) + vline(rx, e.y - 35, e.h + 35, p.line);

  // Art (defined once, drawn full size and again as the minimap).
  const art = artRuns(rows, { charW, lineH, fontSize, monoFill: p.fg });
  const ax = e.x + gutter, ay = e.y + 12;
  body += `<defs><g id="ed-art">${art}</g></defs>`;
  body += `<use href="#ed-art" x="${ax}" y="${ay}"/>`;
  const step = Math.max(1, Math.ceil(12 / lineH));
  for (let i = 0; i < rows.length; i += step) {
    body += text(e.x + gutter - 12, ay + (i + 0.8) * lineH, String(i + 1), { size: Math.min(11, Math.max(8, lineH * 0.8)), fill: p.faint, anchor: "end", family: MONO });
  }
  const mx = e.x + gutter + ART_W + 18;
  const ms = MINIMAP_W / ART_W;
  body += vline(mx - 6, e.y, e.h, p.line);
  body += rect(mx - 4, e.y + 8, MINIMAP_W + 6, ART_W * ms * 0.55, p.hover);
  body += `<use href="#ed-art" transform="translate(${mx} ${e.y + 10}) scale(${ms.toFixed(4)})"/>`;

  // profile.json.
  const json = [
    { tokens: [["{", "fg"]] },
    { tokens: [['  "login"', "prop"], [": ", "fg"], [`"${user}"`, "str"], [",", "fg"]] },
    { tokens: [['  "name"', "prop"], [": ", "fg"], [`"${profile.name || user}"`, "str"], [",", "fg"]] },
    { tokens: [['  "avatar"', "prop"], [": ", "fg"], ['"avatar.txt"', "str"], [",", "fg"]] },
    { tokens: [['  "size"', "prop"], [": ", "fg"], [`[${cols}, ${rows.length}]`, "num"], [",", "fg"]] },
    { tokens: [['  "color"', "prop"], [": ", "fg"], [color ? "true" : "false", "kw"], [",", "fg"]] },
    { tokens: [['  "bio"', "prop"], [": ", "fg"], [profile.bio ? `"${fit(profile.bio.replace(/\s+/g, " ").trim(), 170, 13)}"` : "null", profile.bio ? "str" : "kw"]] },
    { tokens: [["}", "fg"]] }
  ];
  body += codeBlock(p, rx, e.y + 10, RIGHT_W, json, { size: 13, lineH: 21, gutter: 40 });
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `avatar.txt — ${user}`,
    label: `ASCII avatar card for ${user}`,
    body
  });
}
