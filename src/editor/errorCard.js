// Editor theme, error card: a notification toast over a dimmed editor.
import { codeBlock, editorWindow, fit, palette, rect, svgDocument, text, textWidth, windowEnd } from "./kit.js";

const WIDTH = 760;
const TOAST_W = 440;

function wrap(message, maxWidth, size, maxLines = 4) {
  const words = String(message ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  while (words.length && lines.length < maxLines) {
    let line = "";
    while (words.length && textWidth(`${line} ${words[0]}`.trim(), size) <= maxWidth) line = `${line} ${words.shift()}`.trim();
    if (!line) line = fit(words.shift(), maxWidth, size);
    lines.push(line);
  }
  if (words.length) lines[lines.length - 1] = fit(`${lines[lines.length - 1]} ${words.join(" ")}`, maxWidth, size);
  return lines;
}

export function renderEditorError({ user, type, message, scale, scheme }) {
  const p = palette(scheme);
  const file = `${type || "card"}.svg`;
  const lines = wrap(message || "Something went wrong.", TOAST_W - 70, 13);
  const toastH = 22 + lines.length * 19 + 46;
  const editorH = Math.max(200, toastH + 40);
  const HEIGHT = 20 + 30 + 35 + editorH + 22 + 20;

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `${file} — github-cli`,
    active: "explorer",
    tabs: [{ label: file, badge: "svg", active: true }],
    status: {
      left: [{ text: "⎇ main" }, { text: "⊗ 1  ⚠ 0", color: p.err }],
      right: [{ text: "Ln 6, Col 43" }, { text: "🔔︎", color: p.fg }]
    }
  });
  const e = win.regions.editor;
  let body = win.svg;
  const login = user || "octocat";
  const code = [
    { tokens: [["const", "kw"], [" res = ", "fg"], ["await", "ctl"], [" ", "fg"], ["fetch", "fn"], ["(", "fg"], ['"https://api.github.com/graphql"', "str"], [", {", "fg"]] },
    { tokens: [["  method: ", "prop"], ['"POST"', "str"], [",", "fg"]] },
    { tokens: [["  headers: ", "prop"], ["{ authorization: ", "fg"], ["`bearer ${token}`", "str"], [" },", "fg"]] },
    { tokens: [["  body: ", "prop"], ["JSON.", "fg"], ["stringify", "fn"], ["({ query, variables: { login: ", "fg"], [`"${login}"`, "str"], [" } })", "fg"]] },
    { tokens: [["});", "fg"]] },
    { tokens: [["if", "ctl"], [" (!res.ok) ", "fg"], ["throw new", "kw"], [" ", "fg"], ["Error", "type"], ["(res.statusText);", "fg"]], bg: p.delBg },
    { tokens: [["return", "ctl"], [" ", "fg"], ["render", "fn"], ["(", "fg"], ["await", "ctl"], [" res.", "fg"], ["json", "fn"], ["());", "fg"]] }
  ];
  body += `<g opacity="0.5">${codeBlock(p, e.x, e.y + 10, e.w, code, { size: 13, lineH: 20 })}</g>`;

  // Toast in the bottom-right corner.
  const tx = e.x + e.w - TOAST_W - 16, ty = e.y + e.h - toastH - 14;
  body += `<rect x="${tx - 1}" y="${ty + 3}" width="${TOAST_W + 2}" height="${toastH + 2}" rx="5" fill="${p.shadow}"/>`;
  body += rect(tx, ty, TOAST_W, toastH, p.widget, `rx="4" stroke="${p.line}"`);
  body += `<circle cx="${tx + 22}" cy="${ty + 22}" r="8" fill="none" stroke="${p.err}" stroke-width="1.5"/><path d="M${tx + 18.5} ${ty + 18.5}l7 7M${tx + 25.5} ${ty + 18.5}l-7 7" stroke="${p.err}" stroke-width="1.5"/>`;
  lines.forEach((line, i) => {
    body += text(tx + 42, ty + 27 + i * 19, line, { size: 13, fill: p.fg });
  });
  body += text(tx + TOAST_W - 16, ty + 26, "×", { size: 15, fill: p.faint, anchor: "middle" });
  const ay = ty + toastH - 34;
  body += text(tx + 42, ay + 16, fit("Source: github-readme-insight", TOAST_W - 200, 12), { size: 12, fill: p.faint });
  const bw1 = 60, bw2 = 60;
  body += rect(tx + TOAST_W - 14 - bw2 - 6 - bw1, ay, bw1, 24, p.accent, 'rx="2"');
  body += text(tx + TOAST_W - 14 - bw2 - 6 - bw1 / 2, ay + 16, "Retry", { size: 12, fill: "#ffffff", anchor: "middle" });
  body += rect(tx + TOAST_W - 14 - bw2, ay, bw2, 24, p.chip, 'rx="2"');
  body += text(tx + TOAST_W - 14 - bw2 / 2, ay + 16, "Close", { size: 12, fill: p.fg, anchor: "middle" });
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `Error — ${file}`,
    label: `Error: ${message}`,
    body
  });
}
