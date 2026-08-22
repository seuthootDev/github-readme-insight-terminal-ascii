import { generateAsciiAvatarSvg } from "./asciiAvatar.js";
import { generateGraphSvg } from "./graph.js";
import { generateNeofetchSvg } from "./neofetch.js";
import { generateStatsSvg } from "./stats.js";
import { generateStreakSvg } from "./streak.js";
import { generateTopLanguageSvg } from "./topLanguage.js";

const DEFAULT_RENDER_TYPE = "graph";

const RENDERERS = {
  graph: generateGraphSvg,
  stats: generateStatsSvg,
  "top-lang": generateTopLanguageSvg,
  ascii: generateAsciiAvatarSvg,
  neofetch: generateNeofetchSvg,
  streak: generateStreakSvg
};

function normalizeRenderType(type) {
  return String(type ?? DEFAULT_RENDER_TYPE).trim().toLowerCase();
}

export function getAvailableRenderTypes() {
  return Object.keys(RENDERERS);
}

function resolveGenerateOptions(input, githubIdFallback) {
  if (typeof input === "object" && input !== null) {
    return {
      type: normalizeRenderType(input.type),
      themeName: input.themeName,
      githubId: input.githubId,
      topN: input.topN,
      scale: input.scale,
      color: input.color,
      cols: input.cols
    };
  }

  return {
    type: DEFAULT_RENDER_TYPE,
    themeName: input,
    githubId: githubIdFallback,
    topN: undefined,
    scale: undefined,
    color: undefined,
    cols: undefined
  };
}

export async function generateSvg(input, githubIdFallback) {
  const { type, themeName, githubId, topN, scale, color, cols } = resolveGenerateOptions(input, githubIdFallback);
  const renderer = RENDERERS[type];

  if (!renderer) {
    throw new Error(`Unknown render type: ${type}. Use one of: ${getAvailableRenderTypes().join(", ")}`);
  }

  return renderer(themeName, githubId, { topN, scale, color, cols });
}
