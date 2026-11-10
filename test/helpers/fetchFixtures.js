// Records GitHub responses once and replays them in tests, so snapshot tests run offline
// and don't depend on anyone's live activity.
//   RECORD_FIXTURES=1 npm test   -> hits the network and rewrites the fixture file
//   npm test                     -> replays only; unknown requests fail loudly
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const KEPT_HEADERS = ["content-type", "x-ratelimit-remaining", "x-ratelimit-reset", "link"];

function requestKey(input, init = {}) {
  const url = typeof input === "string" ? input : input.url;
  const method = (init.method ?? "GET").toUpperCase();
  const body = typeof init.body === "string" ? init.body : "";
  return `${method} ${url}${body ? ` ${body}` : ""}`;
}

function isText(contentType = "") {
  return /json|text|xml|html/.test(contentType);
}

function toResponse(entry) {
  const body = entry.encoding === "base64" ? Buffer.from(entry.body, "base64") : entry.body;
  return new Response(entry.status === 204 ? null : body, {
    status: entry.status,
    headers: entry.headers
  });
}

export function installFetchFixtures(fixturePath) {
  const recording = process.env.RECORD_FIXTURES === "1";
  const realFetch = globalThis.fetch;
  const store = !recording && existsSync(fixturePath)
    ? JSON.parse(readFileSync(fixturePath, "utf8"))
    : { recordedAt: new Date().toISOString(), responses: {} };

  globalThis.fetch = async (input, init) => {
    const key = requestKey(input, init);
    if (!recording) {
      const entry = store.responses[key];
      if (!entry) {
        throw new Error(`No recorded fixture for: ${key}\nRun RECORD_FIXTURES=1 npm test to refresh fixtures.`);
      }
      return toResponse(entry);
    }

    const response = await realFetch(input, init);
    const buffer = Buffer.from(await response.arrayBuffer());
    const headers = {};
    for (const name of KEPT_HEADERS) {
      const value = response.headers.get(name);
      if (value !== null) headers[name] = value;
    }
    const entry = isText(headers["content-type"])
      ? { status: response.status, headers, body: buffer.toString("utf8") }
      : { status: response.status, headers, encoding: "base64", body: buffer.toString("base64") };
    store.responses[key] = entry;
    return toResponse(entry);
  };

  return {
    recording,
    recordedAt: store.recordedAt,
    save() {
      if (!recording) return;
      mkdirSync(dirname(fixturePath), { recursive: true });
      writeFileSync(fixturePath, `${JSON.stringify(store, null, 1)}\n`);
    },
    restore() {
      globalThis.fetch = realFetch;
    }
  };
}
