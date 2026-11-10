// Small in-memory TTL + LRU cache for rendered cards.
// Serverless instances are reused between requests, so this saves GitHub API calls
// for popular cards; identical requests that arrive while one is rendering share it.
export function createTtlCache({ ttlMs, maxEntries, now = () => Date.now() }) {
  const entries = new Map(); // key -> { value, expiresAt }, insertion order = LRU order
  const inflight = new Map(); // key -> Promise

  function get(key) {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    // Refresh LRU position.
    entries.delete(key);
    entries.set(key, entry);
    return entry.value;
  }

  function set(key, value) {
    if (ttlMs <= 0 || maxEntries <= 0) return;
    entries.delete(key);
    entries.set(key, { value, expiresAt: now() + ttlMs });
    while (entries.size > maxEntries) {
      entries.delete(entries.keys().next().value);
    }
  }

  // Returns { value, hit }. Failed computations are not cached, so errors retry next time.
  async function getOrCompute(key, compute) {
    const cached = get(key);
    if (cached !== undefined) return { value: cached, hit: true };

    const pending = inflight.get(key);
    if (pending) return { value: await pending, hit: true };

    const promise = (async () => {
      try {
        const value = await compute();
        set(key, value);
        return value;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, promise);
    return { value: await promise, hit: false };
  }

  return {
    get,
    set,
    getOrCompute,
    clear() {
      entries.clear();
      inflight.clear();
    },
    get size() {
      return entries.size;
    }
  };
}
