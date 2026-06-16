import { getAuthorityScore } from "./authorityScores.js";
let pipeline = null;
let embedderPromise = null;

// Dynamically load the pipeline to avoid failures if not installed or running in a restricted node environment
async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      try {
        const transformers = await import("@xenova/transformers");
        pipeline = transformers.pipeline;
        const instance = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");
        console.log("[SemanticRanking] Loaded Xenova/bge-small-en-v1.5 model successfully.");
        return instance;
      } catch (err) {
        console.warn("[SemanticRanking] Could not load @xenova/transformers or bge-small-en model. Using fallback word-frequency vector similarity.", err.message);
        embedderPromise = null;
        return null;
      }
    })();
  }
  return embedderPromise;
}

export async function getLocalEmbedding(text) {
  const extractor = await getEmbedder();
  if (!extractor) return null;
  try {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data);
  } catch (err) {
    console.error("[LocalEmbedding] Failed to generate embedding:", err.message);
    return null;
  }
}

export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// Pure JS bag-of-words cosine similarity fallback
export function getFallbackSimilarity(text1, text2) {
  const words1 = text1.toLowerCase().match(/\b\w+\b/g) || [];
  const words2 = text2.toLowerCase().match(/\b\w+\b/g) || [];
  
  const freq1 = {};
  const freq2 = {};
  const allWords = new Set();
  
  for (const w of words1) {
    freq1[w] = (freq1[w] || 0) + 1;
    allWords.add(w);
  }
  for (const w of words2) {
    freq2[w] = (freq2[w] || 0) + 1;
    allWords.add(w);
  }
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (const w of allWords) {
    const val1 = freq1[w] || 0;
    const val2 = freq2[w] || 0;
    dotProduct += val1 * val2;
    mag1 += val1 * val1;
    mag2 += val2 * val2;
  }
  
  const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

export function normalizeTitle(title) {
  return (title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function deduplicateAcademicResults(results) {
  const seenUrls = new Set();
  const seenDois = new Set();
  const seenTitles = new Set();
  const deduped = [];
  
  let duplicateCount = 0;

  for (const item of results) {
    let isDuplicate = false;
    const normTitle = normalizeTitle(item.title);
    const doi = item.doi ? item.doi.toLowerCase() : null;

    if (item.url && seenUrls.has(item.url)) {
      isDuplicate = true;
    } else if (doi && seenDois.has(doi)) {
      isDuplicate = true;
    } else if (normTitle && normTitle.length > 10 && seenTitles.has(normTitle)) {
      isDuplicate = true;
    }

    if (isDuplicate) {
      duplicateCount++;
      const existing = deduped.find(d => 
        (item.url && d.url === item.url) || 
        (doi && d.doi && d.doi.toLowerCase() === doi) || 
        (normTitle && normTitle.length > 10 && normalizeTitle(d.title) === normTitle)
      );
      if (existing) {
        if ((item.citation_count || 0) > (existing.citation_count || 0)) {
          existing.citation_count = item.citation_count;
        }
        if (!existing.snippet || existing.snippet === "No abstract available." || existing.snippet.length < (item.snippet?.length || 0)) {
            existing.snippet = item.snippet || existing.snippet;
        }
        if (item.authors && item.authors.length > (existing.authors?.length || 0)) {
            existing.authors = item.authors;
        }
        if (item.venue && !existing.venue) existing.venue = item.venue;
        if (item.categories && (!existing.categories || existing.categories.length === 0)) existing.categories = item.categories;
        if (item.concepts && (!existing.concepts || existing.concepts.length === 0)) existing.concepts = item.concepts;
      }
      continue;
    }

    if (item.url) seenUrls.add(item.url);
    if (doi) seenDois.add(doi);
    if (normTitle && normTitle.length > 10) seenTitles.add(normTitle);
    
    deduped.push(item);
  }

  return { deduped, duplicateCount };
}

export async function computeAcademicRanking(results, query = "") {
  if (results.length === 0) return results;

  const currentYear = new Date().getFullYear();
  const maxCitations = Math.max(...results.map(r => r.citation_count || 0), 1);

  // Load extractor embedding model if available
  const extractor = await getEmbedder();
  let queryEmbedding = null;

  if (extractor && query) {
    try {
      const output = await extractor(query, { pooling: "mean", normalize: true });
      queryEmbedding = Array.from(output.data);
    } catch (err) {
      console.warn("[SemanticRanking] Query embedding failed. Using fallback similarity.", err.message);
    }
  }

  for (const item of results) {
    // 1. Semantic Score (0.60 weight)
    let semantic_score = 0;
    const documentText = `${item.title || ""} ${item.snippet || ""}`;

    if (queryEmbedding && extractor) {
      try {
        const output = await extractor(documentText, { pooling: "mean", normalize: true });
        const docEmbedding = Array.from(output.data);
        semantic_score = Math.max(0, cosineSimilarity(queryEmbedding, docEmbedding));
      } catch (err) {
        console.warn("[SemanticRanking] Doc embedding failed. Using fallback similarity for this item.", err.message);
        semantic_score = getFallbackSimilarity(query, documentText);
      }
    } else {
      semantic_score = getFallbackSimilarity(query, documentText);
    }

    // 2. Citation Score (0.25 weight)
    const citation_score = Math.log10(1 + (item.citation_count || 0)) / Math.log10(1 + maxCitations);

    // 3. Recency Score (0.15 weight)
    let recency_score = 0;
    if (item.published_date) {
      const pubYear = new Date(item.published_date).getFullYear();
      if (pubYear > 1900 && pubYear <= currentYear) {
         const age = currentYear - pubYear;
         recency_score = Math.max(0, (20 - age) / 20); // 1.0 for this year, down to 0 for 20+ years old
      }
    }
    let authority_score = getAuthorityScore(item.venue);
    
    
    const final_score = 0.45 * semantic_score + 0.20 * citation_score + 0.15 * recency_score + 0.20 * authority_score;

    item.ranking_metrics = {
      semantic_score,
      citation_score,
      recency_score,
      authority_score,
      final_score
    };
    item.relevance_score = final_score;
  }

  // Sort by final_score descending
  results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));

  return results;
}
