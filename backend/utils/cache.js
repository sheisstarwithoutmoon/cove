class RetrievalCache {
  constructor(ttlMs = 30 * 60 * 1000) {
    this.cache = new Map();
    this.ttl = ttlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.results;
  }

  set(key, results) {
    this.cache.set(key, {
      results,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }
}

export const retrievalCache = new RetrievalCache();
