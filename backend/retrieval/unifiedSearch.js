import { retrievalRouter } from "./retrievalRouter.js";
import { arxivAgent } from "./arxivAgent.js";
import { openalexAgent } from "./openalexAgent.js";
import { searchAgent as tavilyAgent } from "./searchAgent.js";
import {
  deduplicateAcademicResults,
  computeAcademicRanking,
} from "../ranking/semanticRanking.js";
import { retrievalCache } from "../utils/cache.js";
import { globalMetrics, logRetrievalMetrics } from "../utils/metrics.js";

async function searchArxiv(query) {
  return arxivAgent(query);
}

async function searchOpenAlex(query) {
  return openalexAgent(query);
}

export async function unifiedSearch(query, onUpdate) {
  const startTime = Date.now();

  // 1. Cache Lookup
  const cachedResults = retrievalCache.get(query);
  if (cachedResults) {
    globalMetrics.cache_hits++;
    const latency = Date.now() - startTime;
    const academicCount = cachedResults.filter(r => r.source_type === "academic").length;
    const generalCount = cachedResults.filter(r => r.source_type !== "academic").length;

    const metricsLog = {
      query,
      route: "cached",
      latency_ms: latency,
      total_sources: cachedResults.length,
      academic_sources: academicCount,
      general_sources: generalCount,
      duplicates_removed: 0,
      parse_failures: globalMetrics.parse_failures,
      retries: 0,
      cache_hits: globalMetrics.cache_hits,
      cache_misses: globalMetrics.cache_misses
    };
    logRetrievalMetrics(metricsLog);
    
    if (onUpdate) {
      onUpdate({
        type: "agent_update",
        agent: "orchestrator",
        message: `Retrieved results from cache for "${query}"`,
      });
    }
    return cachedResults;
  }
  globalMetrics.cache_misses++;

  // 2. Query Routing
  const category = await retrievalRouter(query);

  if (onUpdate) {
    onUpdate({
      type: "agent_update",
      agent: "orchestrator",
      message: `Routing query to ${category} search engine...`,
    });
  }

  let academicResults = [];
  let generalResults = [];
  let duplicateCount = 0;
  let retryCount = 0;

  const runAcademic = category === "academic" || category === "hybrid";
  const runGeneral = category === "general" || category === "hybrid";

  // 3. Academic Retrieval (Parallelized)
  if (runAcademic) {
    const startTimeAcademic = Date.now();
    try {
      const [arxivResults, openAlexResults] = await Promise.all([
        searchArxiv(query),
        searchOpenAlex(query),
      ]);

      const academicLatency = Date.now() - startTimeAcademic;
      retryCount = arxivResults.retryCount || 0;

      console.log(
        `[UnifiedSearch] arXiv returned ${arxivResults.length} results (status: ${arxivResults.metadata?.status})`
      );
      console.log(
        `[UnifiedSearch] OpenAlex returned ${openAlexResults.length} results (status: ${openAlexResults.metadata?.status})`
      );

      academicResults.push(...arxivResults);
      academicResults.push(...openAlexResults);

      // Deduplicate academic results
      const dedupInfo = deduplicateAcademicResults(academicResults);
      academicResults = dedupInfo.deduped;
      duplicateCount = dedupInfo.duplicateCount;

      // Semantic Ranking
      academicResults = await computeAcademicRanking(academicResults, query);

    } catch (err) {
      console.error(
        "[UnifiedSearch] Academic search critical error:",
        err.message
      );
    }
  }

  // 4. General Web Search (Tavily)
  if (runGeneral) {
    try {
      generalResults = await tavilyAgent(query);
      console.log(
        `[UnifiedSearch] Tavily returned ${generalResults.length} results`
      );
    } catch (err) {
      console.error("[UnifiedSearch] Tavily failed:", err.message);
    }
  }

  generalResults.sort(
    (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
  );

  // 5. Final Assembly & Global Deduplication
  let results = [...academicResults, ...generalResults];
  const finalSeen = new Set();

  results = results.filter((r) => {
    if (!r.url) return true;
    if (finalSeen.has(r.url)) return false;
    finalSeen.add(r.url);
    return true;
  });

  results.sort(
    (a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)
  );

  const latency = Date.now() - startTime;

  // 6. Log Retrieval Metrics
  const metricsLog = {
    query,
    route: category,
    latency_ms: latency,
    total_sources: results.length,
    academic_sources: academicResults.length,
    general_sources: generalResults.length,
    duplicates_removed: duplicateCount,
    parse_failures: globalMetrics.parse_failures,
    retries: retryCount,
    cache_hits: globalMetrics.cache_hits,
    cache_misses: globalMetrics.cache_misses
  };
  logRetrievalMetrics(metricsLog);

  // 7. Store in Cache
  retrievalCache.set(query, results);

  return results;
}
