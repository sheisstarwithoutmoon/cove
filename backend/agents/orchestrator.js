import Groq from "groq-sdk";
import dotenv from "dotenv";
import { searchAgent } from "./searchAgent.js";
import { summarizerAgent } from "./summarizerAgent.js";
import { verifierAgent } from "./verifierAgent.js";
import { reportAgent } from "./reportAgent.js";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function planSubQuestions(query, pdfContext = "") {
  try {
    const contextBlock = pdfContext
      ? `\n\nAdditional context from user PDF:\n${pdfContext.slice(0, 2500)}`
      : "";

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Break the user's query into 3-4 specific sub-questions for comprehensive research.
Return ONLY a JSON array of strings. Example: ["What is X?", "How does X work?", "What are effects of X?"]`,
        },
        { role: "user", content: `Query: ${query}${contextBlock}` },
      ],
      temperature: 0.3,
    });
    let text = response.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
    return JSON.parse(text).slice(0, 4);
  } catch {
    return [query];
  }
}

export async function runResearchPipeline(query, onUpdate, options = {}) {
  const { pdfContext = "", pdfMeta = null } = options;

  // Step 1: Orchestrator plans
  onUpdate({ type: "agent_start", agent: "orchestrator", message: "Breaking down your query into research tasks..." });
  const subQuestions = await planSubQuestions(query, pdfContext);
  onUpdate({ type: "agent_done", agent: "orchestrator", message: `Created ${subQuestions.length} research tasks`, data: subQuestions });

  // Step 2: Search
  onUpdate({ type: "agent_start", agent: "search", message: "Searching the web for relevant sources..." });
  const allResults = [];
  for (const q of subQuestions) {
    const results = await searchAgent(q);
    allResults.push(...results);
  }
  // Deduplicate by URL
  const seen = new Set();
  const uniqueResults = allResults.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  onUpdate({ type: "agent_done", agent: "search", message: `Found ${uniqueResults.length} unique sources`, data: uniqueResults.map((r) => r.url) });

  // Step 3: Summarize
  onUpdate({ type: "agent_start", agent: "summarizer", message: "Reading and summarizing each source..." });
  const summaries = await summarizerAgent(query, uniqueResults, pdfContext);
  onUpdate({ type: "agent_done", agent: "summarizer", message: `Extracted key claims from ${summaries.length} sources` });

  // Step 4: Verify
  onUpdate({ type: "agent_start", agent: "verifier", message: "Verifying citations and checking for hallucinations..." });
  const verified = await verifierAgent(summaries);
  const high = verified.filter((v) => v.confidence !== "low").length;
  const low = verified.filter((v) => v.confidence === "low").length;
  onUpdate({ type: "agent_done", agent: "verifier", message: `✅ ${high} verified  ⚠️ ${low} flagged`, data: { verified: high, flagged: low } });

  // Step 5: Report
  onUpdate({ type: "agent_start", agent: "reporter", message: "Compiling final report..." });
  const report = await reportAgent(query, verified, pdfContext, pdfMeta);
  onUpdate({ type: "agent_done", agent: "reporter", message: "Report ready!" });

  return report;
}