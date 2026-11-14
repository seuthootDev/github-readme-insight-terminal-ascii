// Turns the avatar into a small low-colour bitmap for the win98 Paint window, the way a
// photo looked once saved as a 16-colour .bmp: resized, then Floyd–Steinberg dithered to a
// fixed palette. Embedded as a PNG data URI so the SVG stays a single small file.
import { Jimp } from "jimp";

// Mono: the four Windows 98 greys. Color: Paint's default 28-colour palette.
const GREYS = ["#000000", "#808080", "#c0c0c0", "#ffffff"];
export const PAINT_COLORS = [
  "#000000", "#808080", "#800000", "#808000", "#008000", "#008080", "#000080", "#800080", "#808040", "#004040", "#0080ff", "#004080", "#8000ff", "#804000",
  "#ffffff", "#c0c0c0", "#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ffff80", "#00ff80", "#80ffff", "#8080ff", "#ff0080", "#ff8040"
];

const DAMPING = 0.75;

const toRgb = (hex) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

export function bitmapSize(cols) {
  return Math.min(160, Math.max(64, Math.round(Number(cols ?? 50) * 2)));
}

function nearest(palette, r, g, b) {
  let best = palette[0];
  let bestDist = Infinity;
  for (const p of palette) {
    // Weighted RGB distance keeps skin tones and greys from jumping to saturated colours.
    const dr = r - p[0], dg = g - p[1], db = b - p[2];
    const dist = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (dist < bestDist) { bestDist = dist; best = p; }
  }
  return best;
}

export async function avatarToPaintBitmap(imageSource, { cols, color = false } = {}) {
  const size = bitmapSize(cols);
  const image = await Jimp.read(imageSource);
  image.cover({ w: size, h: size });

  const palette = (color ? PAINT_COLORS : GREYS).map(toRgb);
  const w = size, h = size;
  const buf = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const rgba = image.getPixelColor(x, y);
      let r = (rgba >>> 24) & 255, g = (rgba >>> 16) & 255, b = (rgba >>> 8) & 255;
      const a = (rgba & 255) / 255;
      // Transparent avatars sit on the white canvas.
      r = r * a + 255 * (1 - a); g = g * a + 255 * (1 - a); b = b * a + 255 * (1 - a);
      if (!color) {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = g = b = l;
      }
      const i = (y * w + x) * 3;
      buf[i] = r; buf[i + 1] = g; buf[i + 2] = b;
    }
  }

  // Floyd–Steinberg error diffusion, left to right.
  const spread = (x, y, er, eg, eb, f) => {
    if (x < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 3;
    buf[i] += er * f; buf[i + 1] += eg * f; buf[i + 2] += eb * f;
  };
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 3;
      const r = Math.min(255, Math.max(0, buf[i]));
      const g = Math.min(255, Math.max(0, buf[i + 1]));
      const b = Math.min(255, Math.max(0, buf[i + 2]));
      const [pr, pg, pb] = nearest(palette, r, g, b);
      // Diffuse only part of the error: full diffusion speckles dark, flat areas with
      // stray bright pixels; damping keeps them calm while edges still dither.
      const er = (r - pr) * DAMPING, eg = (g - pg) * DAMPING, eb = (b - pb) * DAMPING;
      spread(x + 1, y, er, eg, eb, 7 / 16);
      spread(x - 1, y + 1, er, eg, eb, 3 / 16);
      spread(x, y + 1, er, eg, eb, 5 / 16);
      spread(x + 1, y + 1, er, eg, eb, 1 / 16);
      image.setPixelColor(((pr << 24) | (pg << 16) | (pb << 8) | 255) >>> 0, x, y);
    }
  }

  const png = await image.getBuffer("image/png");
  return { size, dataUri: `data:image/png;base64,${Buffer.from(png).toString("base64")}`, colors: palette.length };
}
