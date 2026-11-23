// Editor theme, avatar card: the profile photo open in the image preview, profile.json beside it.
import { avatarImage } from "./avatar.js";
import { codeBlock, editorWindow, fit, palette, rect, svgDocument, tabStrip, text, vline, windowEnd } from "./kit.js";

const PHOTO = 340;
const LEFT_W = 460;
const RIGHT_W = 320;
const WIDTH = 20 + 44 + LEFT_W + RIGHT_W + 20;

// Transparency checkerboard behind the image, as the image preview draws it.
function checkerboard(p, x, y, w, h) {
  const a = p.name === "light" ? "#f3f3f3" : "#252526";
  const b = p.name === "light" ? "#e8e8e8" : "#2d2d30";
  return `<defs><pattern id="ed-checker" width="16" height="16" patternUnits="userSpaceOnUse" x="${x}" y="${y}"><rect width="16" height="16" fill="${a}"/><rect width="8" height="8" fill="${b}"/><rect x="8" y="8" width="8" height="8" fill="${b}"/></pattern></defs>`
    + rect(x, y, w, h, "url(#ed-checker)");
}

export function renderEditorAscii(profile, photo, { githubId, scale, scheme } = {}) {
  const p = palette(scheme);
  const user = profile.login || githubId;
  const editorH = PHOTO + 48;
  const HEIGHT = 20 + 30 + 35 + editorH + 22 + 20;

  const win = editorWindow(p, {
    w: WIDTH - 40, h: HEIGHT - 40,
    title: `avatar.jpg — ${user}`,
    active: "explorer",
    tabs: [{ label: "avatar.jpg", badge: "img", active: true, maxW: 200 }],
    status: {
      left: [{ text: "⎇ main" }, { text: "⊗ 0  ⚠ 0" }],
      right: [{ text: "400 × 400" }, { text: "Image Preview" }, { text: "100%" }]
    }
  });
  const e = win.regions.editor;
  let body = win.svg;

  // Image preview, centred on the checkerboard.
  body += checkerboard(p, e.x, e.y, LEFT_W, e.h);
  const px = e.x + Math.round((LEFT_W - PHOTO) / 2), py = e.y + Math.round((e.h - PHOTO) / 2);
  body += `<g class="ed-in">${avatarImage(photo, px, py, PHOTO, { id: "ed-photo", round: false, radius: 0, fallbackText: user.slice(0, 2).toUpperCase(), fallbackFill: p.accent })}</g>`;
  body += `<rect x="${px - 0.5}" y="${py - 0.5}" width="${PHOTO + 1}" height="${PHOTO + 1}" fill="none" stroke="${p.line}"/>`;

  // Right editor group: profile.json.
  const rx = e.x + LEFT_W;
  body += tabStrip(p, rx, e.y - 35, RIGHT_W, [{ label: "profile.json", badge: "json", active: true }]);
  body += rect(rx, e.y, RIGHT_W, e.h, p.bg) + vline(rx, e.y - 35, e.h + 35, p.line);
  const json = [
    { tokens: [["{", "fg"]] },
    { tokens: [['  "login"', "prop"], [": ", "fg"], [`"${user}"`, "str"], [",", "fg"]] },
    { tokens: [['  "name"', "prop"], [": ", "fg"], [`"${profile.name || user}"`, "str"], [",", "fg"]] },
    { tokens: [['  "avatar"', "prop"], [": ", "fg"], ['"avatar.jpg"', "str"], [",", "fg"]] },
    { tokens: [['  "bio"', "prop"], [": ", "fg"], [profile.bio ? `"${fit(profile.bio.replace(/\s+/g, " ").trim(), 170, 13)}"` : "null", profile.bio ? "str" : "kw"]] },
    { tokens: [["}", "fg"]] }
  ];
  body += codeBlock(p, rx, e.y + 10, RIGHT_W, json, { size: 13, lineH: 21, gutter: 40 });
  body += text(rx + 20, e.y + e.h - 16, fit(`github.com/${user}`, RIGHT_W - 40, 12), { size: 12, fill: p.faint });
  body += windowEnd;

  return svgDocument({
    width: WIDTH, height: HEIGHT, scale,
    title: `avatar.jpg — ${user}`,
    label: `Avatar card for ${user}`,
    body
  });
}
