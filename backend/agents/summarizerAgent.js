import { ai } from "../utils/gemini.js";
import { safeJsonParse } from "../utils/safeJsonParse.js";

export async function summarizerAgent(
  queryOrMessage,
  searchResultsLegacy,
  pdfContextLegacy = ""
) {
  const startTime = Date.now();
  let query, searchResults, pdfContext;
  let isEnvelope = false;

  if (queryOrMessage && queryOrMessage.payload && typeof queryOrMessage.payload === "object") {
    query = queryOrMessage.payload.query;
    searchResults = queryOrMessage.payload.searchResults || [];
    pdfContext = queryOrMessage.payload.pdfContext || "";
    isEnvelope = true;
  } else {
    query = queryOrMessage;
    searchResults = searchResultsLegacy || [];
    pdfContext = pdfContextLegacy;
  }

  const contextBlock = pdfContext
    ? `\n\nAdditional context from user PDF (supplementary, not a citation):\n${pdfContext.slice(0, 2000)}`
    : "";

  const batchSize = 8;
  const batches = [];

  for (let i = 0; i < searchResults.length; i += batchSize) {
    batches.push(searchResults.slice(i, i + batchSize));
  }

  const batchPromises = batches.map(async (batch) => {
    const localSummaries = [];

    const validSources = batch.filter(
      (s) => s && s.snippet
    );

    if (validSources.length === 0) {
      return localSummaries;
    }

    const sourcesPromptBlock = validSources
      .map(
        (s, idx) =>
          `Source ${idx + 1}:\nURL: ${s.url}\nTitle: ${s.title}\nContent: ${s.snippet}`
      )
      .join("\n\n");

    try {
      const response =
        await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Query: ${query}\n\nSources:\n${sourcesPromptBlock}${contextBlock}`,
          config: {
            systemInstruction: `You are a research summarizer.

Extract 2-3 factual claims relevant to the query.

Return ONLY JSON:
{
"url1":["claim1","claim2"],
"url2":["claim3","claim4"]
}`,
            temperature: 0.2,
            responseMimeType: "application/json",
          }
        });

      const text =
        response.text;

      const batchClaims =
        safeJsonParse(text, {});

      for (const result of validSources) {

        const claims =
          batchClaims[result.url] ||
          [result.snippet.substring(0, 200)];

        const structuredClaims =
          (Array.isArray(claims)
            ? claims
            : [String(claims)]
          ).map((claim, index) => ({
            id: `${result.url}-${index}`,
            text: claim,
            status: "UNKNOWN"
          }));

        localSummaries.push({
          url: result.url,
          title: result.title,
          claims: structuredClaims,
          snippet: result.snippet,
          source_type: result.source_type,
          published_date: result.published_date,
          relevance_score: result.relevance_score
        });
      }

      return localSummaries;
    }
    catch (e) {

      console.error(
        "[Summarizer batch]",
        e.message
      );

      for (const result of validSources) {

        localSummaries.push({
          url: result.url,
          title: result.title,

          claims: [
            {
              id: `${result.url}-0`,
              text: result.snippet.substring(0, 200),
              status: "UNKNOWN"
            }
          ],

          snippet: result.snippet,
          source_type: result.source_type,
          published_date: result.published_date,
          relevance_score: result.relevance_score
        });
      }

      return localSummaries;
    }
  });

  const batchResults =
    await Promise.all(batchPromises);

  const results = batchResults.flat();

  if (isEnvelope) {
    return {
      from: "summarizer_agent",
      to: "orchestrator_agent",
      type: "SUMMARIZATION_RESULTS",
      payload: {
        summaries: results
      },
      metadata: {
        timestamp: new Date().toISOString(),
        latency_ms: Date.now() - startTime
      }
    };
  }

  return results;
}