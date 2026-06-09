import Groq from "groq-sdk";
import dotenv from "dotenv";
import { safeJsonParse } from "../utils/safeJsonParse.js";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function summarizerAgent(query, searchResults, pdfContext = "") {
  const summaries = [];
  const contextBlock = pdfContext
    ? `\n\nAdditional context from user PDF (supplementary, not a citation):\n${pdfContext.slice(0, 2000)}`
    : "";

  // Group sources into batches of 8 (between 5 and 10)
  const batchSize = 8;
  const batches = [];
  for (let i = 0; i < searchResults.length; i += batchSize) {
    batches.push(searchResults.slice(i, i + batchSize));
  }

  const batchPromises = batches.map(async (batch) => {
    // Check if any source in the batch has a snippet
    const validSources = batch.filter(s => s.snippet);
    if (validSources.length === 0) return [];

    // Build the batch prompt text
    const sourcesPromptBlock = validSources
      .map((s, idx) => `Source ${idx + 1}:\nURL: ${s.url}\nTitle: ${s.title}\nContent: ${s.snippet}`)
      .join("\n\n");

    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a research summarizer. Extract 2-3 specific factual claims relevant to the query for each of the provided sources.
Return ONLY a JSON object where the keys are the source URLs and the values are arrays of strings (the factual claims).
Example:
{
  "https://example.com/source1": ["Claim 1", "Claim 2"],
  "https://example.com/source2": ["Claim 3", "Claim 4"]
}`,
          },
          {
            role: "user",
            content: `Query: ${query}\n\nSources to summarize:\n${sourcesPromptBlock}${contextBlock}`,
          },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      });

      const text = response.choices[0].message.content;
      const batchClaims = safeJsonParse(text, {});

      for (const result of validSources) {
        const claims = batchClaims[result.url] || [result.snippet.substring(0, 200)];
        const structuredClaims =
          (Array.isArray(claims) ? claims : [String(claims)])
          .map((claim,index)=>({
              id:`${result.url}-${index}`,
              text:claim,
              status:"UNKNOWN"
          }));
        summaries.push({ 
          url: result.url, 
          title: result.title, 
          claims: structuredClaims, 
          snippet: result.snippet,
          source_type: result.source_type,
          published_date: result.published_date,
          relevance_score: result.relevance_score
        });
      }
    } catch (e) {
      console.error(`Summarizer batch error:`, e.message);
      // Fallback for all sources in the batch
      for (const result of validSources) {
        summaries.push({
          url: result.url,
          title: result.title,
          claims: [result.snippet.substring(0, 200)],
          snippet: result.snippet,
          source_type: result.source_type,
          published_date: result.published_date,
          relevance_score: result.relevance_score
        });
      }
    }
  });
  const batchResults = await Promise.all(batchPromises);
  return batchResults.flat();
}