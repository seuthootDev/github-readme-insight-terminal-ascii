// Profile photo for the editor cards. README images are sandboxed (an SVG shown through <img>
// cannot load other URLs), so the photo is fetched here, shrunk and embedded as a data URI.
import { Jimp } from "jimp";
import { esc } from "../win98/kit.js";

// Same size parameter as the ASCII avatar card, so both cards share one request URL (and cache).
export function sizedAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null;
  return `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}s=480`;
}

// Returns a JPEG data URI `size` px square, or null when the photo can't be loaded (the cards
// then fall back to initials rather than failing).
export async function avatarDataUri(url, size = 160) {
  if (!url) return null;
  try {
    const image = await Jimp.read(url);
    // JPEG has no alpha: put transparent avatars on white first.
    const canvas = new Jimp({ width: image.bitmap.width, height: image.bitmap.height, color: 0xffffffff });
    canvas.composite(image, 0, 0);
    canvas.cover({ w: size, h: size });
    return await canvas.getBase64("image/jpeg", { quality: 82 });
  } catch {
    return null;
  }
}

// <image> clipped to a circle or rounded square; initials on the accent colour when there is no photo.
export function avatarImage(dataUri, x, y, size, { id, round = true, radius = 6, fallbackText = "?", fallbackFill = "#0078d4" } = {}) {
  const clip = round
    ? `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}"/>`
    : `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}"/>`;
  if (!dataUri) {
    const shape = round
      ? `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fallbackFill}"/>`
      : `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${fallbackFill}"/>`;
    return `${shape}<text x="${x + size / 2}" y="${y + size / 2 + size * 0.14}" font-size="${Math.round(size * 0.38)}" font-weight="600" font-family="'Segoe UI', system-ui, sans-serif" fill="#ffffff" text-anchor="middle">${esc(fallbackText)}</text>`;
  }
  return `<clipPath id="${id}">${clip}</clipPath><image x="${x}" y="${y}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})" href="${dataUri}"/>`;
}
