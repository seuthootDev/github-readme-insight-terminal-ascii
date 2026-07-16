import { generateGrassSvg } from "./grass.js";
import { generateStatsSvg } from "./stats.js";
import { generateTopLanguageSvg } from "./topLanguage.js";

const DEFAULT_RENDER_TYPE = "grass";

const RENDERERS = {
  grass: generateGrassSvg,
  stats: generateStatsSvg,
  "top-lang": generateTopLanguageSvg
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
      scale: input.scale
    };
  }

  return {
    type: DEFAULT_RENDER_TYPE,
    themeName: input,
    githubId: githubIdFallback,
    topN: undefined,
    scale: undefined
  };
}

export async function generateSvg(input, githubIdFallback) {
  const { type, themeName, githubId, topN, scale } = resolveGenerateOptions(input, githubIdFallback);
  const renderer = RENDERERS[type];

  if (!renderer) {
    throw new Error(`Unknown render type: ${type}. Use one of: ${getAvailableRenderTypes().join(", ")}`);
  }

  return renderer(themeName, githubId, { topN, scale });
}
