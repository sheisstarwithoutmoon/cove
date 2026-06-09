import { jsonParseMetrics } from "./safeJsonParse.js";

export const globalMetrics = {
  cache_hits: 0,
  cache_misses: 0,

  recovered_parses: 0,

  retrieval_latency: 0,
  verification_latency: 0,
  generation_latency: 0,

  source_count: 0,
  verified_source_count: 0,

  claim_count: 0,
  supported_claim_count: 0,

  citation_coverage: 0,

  tokens_in: 0,
  tokens_out: 0,

  llm_calls: 0,

  get token_usage() {
    return this.tokens_in + this.tokens_out;
  },

  get parse_failures() {
    return jsonParseMetrics.parseFailures;
  }
};

export function logRetrievalMetrics(metricsObj) {
  console.log("[Retrieval Metrics Log]", JSON.stringify(metricsObj, null, 2));
}
