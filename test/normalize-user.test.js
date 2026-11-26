// user= / --user accept the handle, "@handle" or a GitHub profile URL.
import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeUser } from "../src/constants.js";

test("normalizeUser strips @, GitHub profile URLs and whitespace", () => {
  for (const input of [
    "@torvalds",
    "https://github.com/torvalds",
    "http://github.com/torvalds",
    "HTTPS://GitHub.com/torvalds",
    "github.com/torvalds/",
    " torvalds ",
    " https://github.com/torvalds/ "
  ]) {
    assert.equal(normalizeUser(input), "torvalds", JSON.stringify(input));
  }
});

test("normalizeUser leaves a plain username alone", () => {
  assert.equal(normalizeUser("torvalds"), "torvalds");
  assert.equal(normalizeUser("Some-User"), "Some-User");
});

test("normalizeUser turns missing input into an empty string", () => {
  assert.equal(normalizeUser(undefined), "");
  assert.equal(normalizeUser(null), "");
  assert.equal(normalizeUser("   "), "");
});
