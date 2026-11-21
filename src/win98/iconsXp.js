// Windows XP (Luna-style) icon set for the winxp skin: original vector drawings with soft
// gradients, in the spirit of the XP icons (no Microsoft artwork). Each icon is designed on a
// 32x32 grid and keeps the pixel-icon contract of kit.js ICONS: (x, y, px) draws a 16*px box.

const g = (x, y, px, body) => `<g transform="translate(${x} ${y}) scale(${px / 2})">${body}</g>`;
const shadow = (cy, rx) => `<ellipse cx="16" cy="${cy}" rx="${rx}" ry="2" fill="#000" opacity=".2"/>`;

export function xpIconDefs() {
  const lin = (id, stops, dir = 'x1="0" y1="0" x2="0" y2="1"') =>
    `<linearGradient id="${id}" ${dir}>${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
  return lin("xpi-case", [[0, "#f4f1e6"], [1, "#c9c2a8"]])
    + lin("xpi-screen", [[0, "#5aa0f2"], [1, "#1a4bb0"]], 'x1="0" y1="0" x2="1" y2="1"')
    + lin("xpi-folder", [[0, "#ffe68f"], [1, "#f2b934"]])
    + lin("xpi-paper", [[0, "#ffffff"], [1, "#dfe8f5"]])
    + lin("xpi-badge", [[0, "#6fd36f"], [1, "#2a9a2a"]])
    + lin("xpi-bin", [[0, "#bfe1ea"], [0.5, "#e6f5f8"], [1, "#9ccbd7"]], 'x1="0" y1="0" x2="1" y2="0"')
    + lin("xpi-red", [[0, "#ff8a6a"], [0.55, "#e2321a"], [1, "#a8170a"]], 'x1="0" y1="0" x2="1" y2="1"')
    + lin("xpi-metal", [[0, "#f2f2f2"], [0.5, "#c8cdd3"], [1, "#8d949c"]])
    + lin("xpi-rim", [[0, "#6fa6f6"], [1, "#1c4fbf"]], 'x1="0" y1="0" x2="1" y2="1"')
    + lin("xpi-dark", [[0, "#2d3a4a"], [1, "#0b121b"]], 'x1="0" y1="0" x2="1" y2="1"')
    + lin("xpi-wood", [[0, "#fbe3a8"], [1, "#e0a94f"]], 'x1="0" y1="0" x2="1" y2="1"');
}

function computer(x, y, px = 1) {
  return g(x, y, px, shadow(30, 12)
    + `<rect x="3.5" y="2.5" width="25" height="19" rx="2.5" fill="url(#xpi-case)" stroke="#7d7660"/>`
    + `<rect x="6" y="5" width="20" height="13.5" rx="1" fill="url(#xpi-screen)" stroke="#1f3f7a" stroke-width=".8"/>`
    + `<path d="M7 6H25L7 14Z" fill="#fff" opacity=".22"/>`
    + `<path d="M12 21.5H20L21.5 25.5H10.5Z" fill="url(#xpi-case)" stroke="#7d7660"/>`
    + `<rect x="7.5" y="25.5" width="17" height="3.5" rx="1.5" fill="url(#xpi-case)" stroke="#7d7660"/>`);
}

function folder(x, y, px = 1) {
  return g(x, y, px, shadow(29.5, 13)
    + `<path d="M2.5 8.5q0 -2 2 -2H11l2.5 2.5H27.5q2 0 2 2V26.5q0 1.5 -1.5 1.5H4q-1.5 0 -1.5 -1.5Z" fill="#e2a72e" stroke="#b07a14"/>`
    + `<rect x="6.5" y="9.5" width="19" height="12" fill="#fff" stroke="#b9b9b9"/>`
    + `<path d="M9 13H22M9 16H20" stroke="#9ab3d6"/>`
    + `<path d="M2.5 14.5q0 -1.5 1.5 -1.5H28q1.5 0 1.3 1.5L28 26.5q-.2 1.5 -1.7 1.5H4q-1.5 0 -1.5 -1.5Z" fill="url(#xpi-folder)" stroke="#b07a14"/>`);
}

function envelope(x, y, px = 1) {
  return g(x, y, px, shadow(28, 13)
    + `<rect x="2.5" y="7.5" width="27" height="18" rx="1.5" fill="url(#xpi-paper)" stroke="#5a7fb5"/>`
    + `<path d="M3 8.5L16 18L29 8.5" fill="none" stroke="#5a7fb5"/>`
    + `<path d="M3 25L12.5 15.5M29 25L19.5 15.5" stroke="#9fb6d8"/>`);
}

function document(x, y, px = 1) {
  return g(x, y, px, shadow(30, 10)
    + `<path d="M6.5 2.5H20L26.5 9V28.5q0 1 -1 1H7.5q-1 0 -1 -1Z" fill="url(#xpi-paper)" stroke="#6f86a8"/>`
    + `<path d="M20 2.5V8q0 1 1 1H26.5" fill="#cfdcef" stroke="#6f86a8"/>`
    + `<path d="M10 12.5H23M10 16.5H23M10 20.5H23M10 24.5H18" stroke="#7ea0d4" stroke-width="1.4"/>`);
}

function error(x, y, px = 1) {
  return g(x, y, px, shadow(30.5, 11)
    + `<circle cx="16" cy="15" r="13.5" fill="url(#xpi-red)" stroke="#8a1408"/>`
    + `<ellipse cx="13" cy="8.5" rx="8" ry="4.5" fill="#fff" opacity=".35"/>`
    + `<path d="M10.5 9.5L21.5 20.5M21.5 9.5L10.5 20.5" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/>`);
}

function drive(x, y, px = 1) {
  return g(x, y, px, shadow(27, 14)
    + `<path d="M4.5 12.5L8.5 7.5H27.5L27.5 12.5Z" fill="#e9ecef" stroke="#6b737c"/>`
    + `<rect x="2.5" y="12.5" width="25" height="11" rx="1.5" fill="url(#xpi-metal)" stroke="#6b737c"/>`
    + `<path d="M27.5 12.5L29.5 9.5V20.5L27.5 23.5Z" fill="#9aa1a9" stroke="#6b737c"/>`
    + `<path d="M5 16.5H18M5 19H16" stroke="#7f8790"/>`
    + `<circle cx="23" cy="18" r="2" fill="#38d438" stroke="#1d7a1d" stroke-width=".8"/>`);
}

function clock(x, y, px = 1) {
  return g(x, y, px, shadow(30.5, 11)
    + `<circle cx="16" cy="15" r="13.5" fill="url(#xpi-rim)" stroke="#123f9e"/>`
    + `<circle cx="16" cy="15" r="10.5" fill="#fff" stroke="#9fb6d8"/>`
    + [0, 90, 180, 270].map((a) => `<path d="M16 5.5V7.5" stroke="#2a4f9a" stroke-width="1.4" transform="rotate(${a} 16 15)"/>`).join("")
    + `<path d="M16 15V8.5M16 15L20.5 17.5" stroke="#1c2a44" stroke-width="1.6" stroke-linecap="round"/>`
    + `<circle cx="16" cy="15" r="1.3" fill="#d8381c"/>`);
}

// Title-bar icons for individual cards.
function chart(x, y, px = 1) {
  return g(x, y, px, shadow(30, 12)
    + `<rect x="3.5" y="3.5" width="25" height="24" rx="2" fill="url(#xpi-paper)" stroke="#5a7fb5"/>`
    + `<path d="M7 24.5H25" stroke="#7f8fa6"/>`
    + `<rect x="8" y="15" width="4" height="9.5" fill="#3b7de0"/><rect x="14" y="8" width="4" height="16.5" fill="#2fb34a"/><rect x="20" y="12" width="4" height="12.5" fill="#f08a1c"/>`);
}

function paint(x, y, px = 1) {
  return g(x, y, px, shadow(29.5, 12)
    + `<path d="M3 16C3 7 26 4.5 28.5 13C30.5 20 21 18.5 19.5 22.5C18 27.5 3 27.5 3 16Z" fill="url(#xpi-wood)" stroke="#a5701f"/>`
    + `<circle cx="9" cy="13" r="2.4" fill="#e2321a"/><circle cx="15" cy="10" r="2.4" fill="#2a5fdb"/><circle cx="21.5" cy="11.5" r="2.4" fill="#2fb34a"/><circle cx="9.5" cy="20" r="2.4" fill="#ffd21f"/>`
    + `<path d="M14 25L24 15" stroke="#7a4a16" stroke-width="2.4" stroke-linecap="round"/><path d="M24 15L27 12" stroke="#c9ccd1" stroke-width="2.4" stroke-linecap="round"/>`);
}

function defrag(x, y, px = 1) {
  const blocks = [["#2a5fdb", "#5aa0f2", "#fff", "#2a5fdb"], ["#5aa0f2", "#fff", "#2a5fdb", "#e2321a"]];
  return g(x, y, px, shadow(28, 14)
    + `<rect x="2.5" y="5.5" width="27" height="20" rx="2" fill="url(#xpi-metal)" stroke="#6b737c"/>`
    + `<rect x="5.5" y="8.5" width="21" height="14" fill="#fff" stroke="#8d949c"/>`
    + blocks.map((row, r) => row.map((fill, c) => `<rect x="${7 + c * 5}" y="${10 + r * 6}" width="4" height="5" fill="${fill}" stroke="#9fb6d8" stroke-width=".5"/>`).join("")).join(""));
}

function monitor(x, y, px = 1) {
  return g(x, y, px, shadow(30, 12)
    + `<rect x="3.5" y="2.5" width="25" height="19" rx="2.5" fill="url(#xpi-case)" stroke="#7d7660"/>`
    + `<rect x="6" y="5" width="20" height="13.5" rx="1" fill="url(#xpi-dark)" stroke="#1f2a38" stroke-width=".8"/>`
    + `<path d="M7.5 13.5h4l2.5 -5l3 7l2.5 -4h4.5" fill="none" stroke="#3cf05a" stroke-width="1.4" stroke-linejoin="round"/>`
    + `<path d="M12 21.5H20L21.5 25.5H10.5Z" fill="url(#xpi-case)" stroke="#7d7660"/>`
    + `<rect x="7.5" y="25.5" width="17" height="3.5" rx="1.5" fill="url(#xpi-case)" stroke="#7d7660"/>`);
}

function panel(x, y, px = 1) {
  return g(x, y, px, shadow(29.5, 13)
    + `<rect x="3.5" y="4.5" width="25" height="22" rx="2" fill="#fff" stroke="#3f66b8"/>`
    + `<path d="M3.5 9.5V6.5q0 -2 2 -2H26.5q2 0 2 2V9.5Z" fill="url(#xpi-rim)" stroke="#3f66b8"/>`
    + `<rect x="7" y="12.5" width="7" height="5.5" rx="1" fill="#e2321a"/><rect x="18" y="12.5" width="7" height="5.5" rx="1" fill="#2fb34a"/>`
    + `<rect x="7" y="20.5" width="7" height="3" rx="1" fill="#f0b21c"/><rect x="18" y="20.5" width="7" height="3" rx="1" fill="#3b7de0"/>`);
}

export const XP_ICONS = { computer, folder, envelope, document, error, drive, clock, chart, paint, defrag, monitor, panel };
