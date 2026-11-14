// Windows 98 error message box for the error card.
import { ICONS, button, svgDocument, text, windowFrame, fit, textWidth } from "./kit.js";

const WIDTH = 480;
const LINE_H = 16;
const MAX_LINES = 8;

function wrap(message, maxWidth, size = 12) {
  const raw = String(message ?? "").trim().split(/\s+/).filter(Boolean);
  // Split any single word that is wider than the line on its own (long URLs, hashes).
  const words = [];
  for (const word of raw) {
    let chunk = "";
    for (const ch of word) {
      if (chunk && textWidth(chunk + ch, size) > maxWidth) {
        words.push(chunk);
        chunk = "";
      }
      chunk += ch;
    }
    if (chunk) words.push(chunk);
  }
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length > MAX_LINES) {
    lines.length = MAX_LINES;
    lines[MAX_LINES - 1] = fit(`${lines[MAX_LINES - 1]}${" ".repeat(200)}`, maxWidth, size);
  }
  return lines.length > 0 ? lines.map((line) => fit(line, maxWidth, size)) : [""];
}

export function renderWin98Error({ user = "", type = "svg", message = "Something went wrong.", scale } = {}) {
  const x = 20, y = 20, w = WIDTH - 40;
  const textX = x + 72;
  const textW = x + w - 20 - textX;
  const lines = wrap(message, textW);
  const detail = wrap(`The ${type} card${user ? ` for ${user}` : ""} could not be created.`, textW);

  const textTop = y + 23 + 22;
  const blockH = (lines.length + 1 + detail.length) * LINE_H;
  const iconBlockH = 32;
  const contentBottom = textTop + Math.max(blockH, iconBlockH);
  const btnY = contentBottom + 18;
  const h = btnY + 23 + 14 - y;
  const HEIGHT = y + h + 20;

  const win = windowFrame(x, y, w, h, "github-cli", { controls: ["close"] });
  let body = win.svg;

  body += ICONS.error(x + 22, textTop - 6, 2);
  lines.forEach((line, i) => {
    body += text(textX, textTop + 9 + i * LINE_H, line);
  });
  detail.forEach((line, i) => {
    body += text(textX, textTop + 9 + (lines.length + 1 + i) * LINE_H, line);
  });

  const bw = 75;
  body += button(x + w / 2 - bw / 2, btnY, bw, 23, "OK", { isDefault: true });

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title: "github-cli",
    label: `Error generating ${type} card`,
    body
  });
}
