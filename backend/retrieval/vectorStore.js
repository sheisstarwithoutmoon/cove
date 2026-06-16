import { db } from '../db/index.js';
import { documentChunks } from '../db/schema.js';
import { sql } from 'drizzle-orm';
import { fetchAndExtractText, chunkText } from './scraper.js';

let pipeline = null;
let embedderPromise = null;

async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = (async () => {
      try {
        const transformers = await import("@xenova/transformers");
        pipeline = transformers.pipeline;
        const instance = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5");
        console.log("[VectorStore] Loaded Xenova/bge-small-en-v1.5 model successfully.");
        return instance;
      } catch (err) {
        console.error("[VectorStore] Failed to load embedding model:", err.message);
        embedderPromise = null; // Reset so next calls can retry
        throw err;
      }
    })();
  }
  return embedderPromise;
}

export async function storeDocumentInVectorDb(url) {
  console.log(`[VectorStore] Downloading and parsing ${url}...`);
  const text = await fetchAndExtractText(url);
  
  if (!text || text.length < 100) {
    console.warn(`[VectorStore] Skipped ${url} (no extractable text).`);
    return 0; 
  }

  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;

  console.log(`[VectorStore] Embedding ${chunks.length} chunks for ${url}...`);
  const extractor = await getEmbedder();
  
  const chunkRows = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunkTextStr = chunks[i];
    const output = await extractor(chunkTextStr, { pooling: "mean", normalize: true });
    const embedding = Array.from(output.data);
    
    chunkRows.push({
      url,
      chunkIndex: i,
      text: chunkTextStr,
      embedding
    });
  }
  
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunkRows.length; i += BATCH_SIZE) {
    const batch = chunkRows.slice(i, i + BATCH_SIZE);
    await db.insert(documentChunks).values(batch);
  }
  
  console.log(`[VectorStore] Successfully stored ${chunkRows.length} chunks for ${url}.`);
  return chunkRows.length;
}

export async function retrieveTopChunks(query, k = 10) {
  const extractor = await getEmbedder();
  const output = await extractor(query, { pooling: "mean", normalize: true });
  const queryEmbedding = Array.from(output.data);
  const embeddingString = `[${queryEmbedding.join(',')}]`;

  const querySql = sql`
    SELECT 
      c.id, 
      c.url, 
      c.text, 
      c.chunk_index as "chunkIndex",
      1 - (c.embedding <=> ${embeddingString}::vector) as similarity
    FROM document_chunks c
    ORDER BY c.embedding <=> ${embeddingString}::vector
    LIMIT ${k};
  `;
  
  const results = await db.execute(querySql);
  return Array.isArray(results) ? results : (results.rows || []);
}
