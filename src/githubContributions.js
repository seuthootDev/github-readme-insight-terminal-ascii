import { toIsoDate } from "./constants.js";

export async function fetchContributions(username) {
  if (!username || !username.trim()) {
    throw new Error("GitHub username is required.");
  }

  const url = `https://github.com/users/${encodeURIComponent(username.trim())}/contributions`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "github-readme-insight-terminal-ascii",
      Accept: "text/html"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch contributions: HTTP ${response.status}`);
  }

  const html = await response.text();
  const contributions = {};

  const pattern = /data-date="([^"]+)"[^>]*>[\s\S]*?<tool-tip[^>]*>([^<]+)<\/tool-tip>/g;
  for (const match of html.matchAll(pattern)) {
    const date = match[1];
    const tip = match[2].trim();

    let count = 0;
    if (!tip.includes("No contributions")) {
      const countMatch = tip.match(/^(\d+)\s+contribution/i);
      count = countMatch ? Number(countMatch[1]) : 0;
    }
    contributions[date] = count;
  }

  if (Object.keys(contributions).length === 0) {
    throw new Error("Could not parse contribution data. User may not exist or GitHub response format changed.");
  }

  return contributions;
}

export function sumContributions(contributions) {
  return Object.values(contributions).reduce((acc, value) => acc + value, 0);
}

export function contributionCountForDate(contributions, date) {
  return contributions[toIsoDate(date)] ?? 0;
}
