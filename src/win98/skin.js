// Runs a win98 renderer with the window skin that belongs to the theme (win98 or winxp).
import { setSkin } from "./kit.js";
import { XP_SKIN } from "./skinXp.js";

const SKINS = { win98: null, winxp: XP_SKIN };

export function withSkin(themeName, render) {
  setSkin(SKINS[themeName] ?? null);
  try {
    return render();
  } finally {
    setSkin(null);
  }
}
