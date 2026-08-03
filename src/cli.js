#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  DAY_LABELS,
  GRAPH_COLORS,
  NUM_WEEKS,
  addDays,
  buildMonthLine,
  getGraphRange,
  levelFromCount,
  toIsoDate
} from "./constants.js";
import { fetchContributions, sumContributions } from "./githubContributions.js";
import { generateSvg } from "./renderer.js";
import { THEMES } from "./themes.js";

function parseArgs(argv) {
  const args = { theme: "mac" };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--user") {
      args.user = argv[i + 1];
      i += 1;
    } else if (token === "--theme") {
      args.theme = argv[i + 1] ?? "mac";
      i += 1;
    } else if (token === "--output") {
      args.output = argv[i + 1];
      i += 1;
    } else if (token === "--help" || token === "-h") {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log("GitHub graph ASCII art generator (Node.js)");
  console.log("Usage: node src/cli.js --user YOUR_GITHUB_ID [--theme mac] [--output file.svg]");
  console.log(`Themes: ${Object.keys(THEMES).join(", ")}`);
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  };
}

function colorBlock(hex) {
  const { r, g, b } = hexToRgb(hex);
  return `\x1b[38;2;${r};${g};${b}m■\x1b[0m`;
}

function printGrid(contributions) {
  const { firstSunday, today } = getGraphRange();
  const monthLine = buildMonthLine(firstSunday);

  console.log(`    ${monthLine}`);
  for (let row = 0; row < DAY_LABELS.length; row += 1) {
    let line = `${DAY_LABELS[row].padEnd(3)} `;
    for (let col = 0; col < NUM_WEEKS; col += 1) {
      const date = addDays(firstSunday, col * 7 + row);
      const count = date > today ? 0 : (contributions[toIsoDate(date)] ?? 0);
      const level = levelFromCount(count);
      line += `${colorBlock(GRAPH_COLORS[level])} `;
    }
    console.log(line);
  }

  const total = sumContributions(contributions);
  const left = `${toIsoDate(firstSunday)} ~ ${toIsoDate(today)}`;
  const legend = `Less ${GRAPH_COLORS.map(colorBlock).join(" ")} More`;
  console.log(`  ${left}`);
  console.log(`  ${total} contribution${total === 1 ? "" : "s"} in the last year  ${legend}`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }

  if (!args.user) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  if (!THEMES[args.theme]) {
    console.error(`Unknown theme: ${args.theme}`);
    console.error(`Use one of: ${Object.keys(THEMES).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  try {
    const contributions = await fetchContributions(args.user);
    printGrid(contributions);

    const svg = await generateSvg(args.theme, args.user);
    const output = args.output ?? `${args.theme}_style.svg`;
    await fs.writeFile(output, svg, "utf-8");

    const cwd = path.dirname(fileURLToPath(import.meta.url));
    console.log(`\nSaved SVG: ${path.resolve(cwd, "..", output)}`);
  } catch (error) {
    console.error(String(error?.message ?? error));
    process.exitCode = 1;
  }
}

main();
