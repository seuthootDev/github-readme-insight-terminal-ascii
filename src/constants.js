export const NUM_WEEKS = 52;
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const GRASS_COLORS = ["#2d333b", "#0e4429", "#26a641", "#39d353"];

export function levelFromCount(count) {
  if (count <= 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  return 3;
}

export function getGrassRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const jsDay = today.getDay();
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - jsDay);

  const firstSunday = new Date(lastSunday);
  firstSunday.setDate(lastSunday.getDate() - (NUM_WEEKS - 1) * 7);

  return { firstSunday, lastSunday, today };
}

export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function buildMonthLine(firstSunday) {
  const monthChars = Array(NUM_WEEKS * 2).fill(" ");
  const lastDay = addDays(firstSunday, NUM_WEEKS * 7 - 1);

  let current = new Date(firstSunday.getFullYear(), firstSunday.getMonth(), 1);
  while (current < firstSunday) {
    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  let lastEnd = -2;
  while (current <= lastDay) {
    let column = Math.floor((current - firstSunday) / (1000 * 60 * 60 * 24 * 7));
    column = Math.max(0, Math.min(NUM_WEEKS - 1, column));

    let start = column * 2;
    if (start <= lastEnd) start = lastEnd + 1;

    const abbr = current.toLocaleString("en-US", { month: "short" });
    if (start + abbr.length <= monthChars.length) {
      for (let i = 0; i < abbr.length; i += 1) monthChars[start + i] = abbr[i];
      lastEnd = start + abbr.length - 1;
    }

    current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
  }

  return monthChars.join("");
}
