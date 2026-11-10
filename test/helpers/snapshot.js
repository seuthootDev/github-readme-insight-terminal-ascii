// Minimal file snapshots (works on every Node version we support, no flags).
//   UPDATE_SNAPSHOTS=1 npm test  -> rewrites snapshots after an intentional visual change
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SNAPSHOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "__snapshots__");

export function matchSnapshot(name, actual) {
  const file = join(SNAPSHOT_DIR, `${name}.svg`);
  if (process.env.CI && !existsSync(file)) {
    assert.fail(`Missing snapshot ${name}.svg. Generate it locally with npm test and commit it.`);
  }
  if (process.env.UPDATE_SNAPSHOTS === "1" || process.env.RECORD_FIXTURES === "1" || !existsSync(file)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    writeFileSync(file, actual);
    return;
  }
  const expected = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  assert.equal(
    actual.replace(/\r\n/g, "\n"),
    expected,
    `Snapshot ${name}.svg changed. If intentional, run UPDATE_SNAPSHOTS=1 npm test and review the SVG diff.`
  );
}
