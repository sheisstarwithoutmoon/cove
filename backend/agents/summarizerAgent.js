import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function summarizerAgent(query, searchResults, pdfContext = "") {
  const summaries = [];
  const contextBlock = pdfContext
    ? `\n\nAdditional context from user PDF (supplementary, not a citation):\n${pdfContext.slice(0, 2000)}`
    : "";

  for (const result of searchResults) {
    if (!result.snippet) continue;
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a research summarizer. Extract 2-3 specific factual claims from the source relevant to the query.
Return ONLY a JSON array of strings. Example: ["Claim 1", "Claim 2"]`,
          },
          {
            role: "user",
            content: `Query: ${query}\nTitle: ${result.title}\nURL: ${result.url}\nContent: ${result.snippet}${contextBlock}`,
          },
        ],
        temperature: 0.2,
      });

      let text = response.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
      const claims = JSON.parse(text);
      summaries.push({ url: result.url, title: result.title, claims, snippet: result.snippet });
    } catch (e) {
      console.error(`Summarizer error for ${result.url}:`, e.message);
      summaries.push({
        url: result.url,
        title: result.title,
        claims: [result.snippet.substring(0, 200)],
        snippet: result.snippet,
      });
    }
  }
  return summaries;
}