// Windows 98 "Properties" dialog for the stats card.
import { C, ICONS, button, fit, formatNumber, groupBox, progressBlocks, sunken, svgDocument, tabPage, tabs, text, windowFrame } from "./kit.js";

const WIDTH = 770;
const HEIGHT = 354;

export function renderWin98Stats(data, { githubId, scale } = {}) {
  const user = data.login || githubId;
  const x = 20, y = 20, w = WIDTH - 40, h = HEIGHT - 40;
  const win = windowFrame(x, y, w, h, `GitHub Properties - ${user}`, { icon: ICONS.computer, controls: ["help", "close"] });
  const { client } = win;
  let body = win.svg;

  const strip = tabs(client.x + 6, client.y + 6, ["Stats", "Languages", "Streak", "Activity"], 0);
  const pageX = client.x + 6, pageY = strip.bodyY, pageW = client.w - 12, pageH = 206;
  body += tabPage(pageX, pageY, pageW, pageH, strip.activeX, strip.activeW);
  body += strip.svg;

  // Left: teal icon panel.
  const panelX = pageX + 14, panelY = pageY + 16, panelW = 160, panelH = 170;
  body += sunken(panelX, panelY, panelW, panelH, { fill: C.desktop });
  body += ICONS.computer(panelX + 48, panelY + 22, 4);
  body += text(panelX + panelW / 2, panelY + 108, "GITHUB STATS", { size: 12, weight: 700, anchor: "middle", fill: C.white });
  body += text(panelX + panelW / 2, panelY + 132, fit(`@${user}`, panelW - 16), { anchor: "middle", fill: C.white });

  // Right: statistics group box with sunken value fields.
  const gx = panelX + panelW + 16, gy = panelY + 6, gw = pageX + pageW - 14 - gx, gh = 112;
  body += groupBox(gx, gy, gw, gh, "GitHub Statistics");
  const rows = [
    ["OSS Contribs", data.ossContribs], ["Total PRs", data.totalPRs], ["Total Issues", data.totalIssues],
    ["Total Stars", data.totalStars], ["Total Forks", data.totalForks], ["Contributions (1y)", data.contributionsYear]
  ];
  const colW = (gw - 24) / 2;
  rows.forEach(([label, value], i) => {
    const cx = gx + 12 + (i < 3 ? 0 : colW + 12);
    const cy = gy + 18 + (i % 3) * 30;
    const fieldW = 86;
    body += text(cx, cy + 14, `${label}:`);
    body += sunken(cx + colW - fieldW - 6, cy, fieldW, 21);
    body += text(cx + colW - 12, cy + 15, formatNumber(value), { anchor: "end" });
  });

  // Activity progress: share of a "busy" year (365 contributions fills the bar).
  const barY = gy + gh + 18;
  body += text(gx, barY + 13, "Activity:");
  const barX = gx + 60, barW = gw - 60 - 130;
  body += progressBlocks(barX, barY, barW, 19, Math.min(1, Number(data.contributionsYear ?? 0) / 365), { delay: 0.1 });
  body += text(barX + barW + 10, barY + 14, fit(`${formatNumber(data.contributionsYear)} this year`, 120));

  // Dialog buttons.
  const by = pageY + pageH + 10;
  const bw = 75, bh = 23;
  const right = pageX + pageW;
  body += button(right - bw * 3 - 12, by, bw, bh, "OK", { isDefault: true });
  body += button(right - bw * 2 - 6, by, bw, bh, "Cancel");
  body += button(right - bw, by, bw, bh, "Apply", { disabled: true });

  return svgDocument({
    width: WIDTH,
    height: HEIGHT,
    scale,
    title: `GitHub Properties - ${user}`,
    label: `GitHub stats card for ${user}`,
    body
  });
}
