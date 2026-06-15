import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { unifiedSearch } from "../retrieval/unifiedSearch.js";
import { summarizerAgent } from "./summarizerAgent.js";
import { verifierAgent } from "../verification/verifierAgent.js";
import { reportAgent } from "./reportAgent.js";
import { safeJsonParse } from "../utils/safeJsonParse.js";

// Load .env relative to this module so Gemini has the API key when tests run from subfolders
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });
if (!process.env.GEMINI_API_KEY) {
  console.warn("[orchestrator] GEMINI_API_KEY not found after loading .env (path:", resolve(__dirname, "../.env"), ")");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function planSubQuestions(query, pdfContext = "") {
  try {
    const contextBlock = pdfContext
      ? `\n\nAdditional context from user PDF:\n${pdfContext.slice(0, 2500)}`
      : "";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Query: ${query}${contextBlock}`,
      config: {
        systemInstruction: `Break the user's query into at most four NON-OVERLAPPING research questions.

Avoid asking the same thing twice.

Try to cover:
- concepts
- mechanisms
- comparisons
- applications

Each question should explore a different aspect.`,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "STRING"
          }
        }
      }
    });
    
    const text = response.text;
    const parsed = safeJsonParse(text, [query]);
    
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 4);
    }
    
    // Look for any array inside the parsed object if it returned an object wrapper
    if (parsed && typeof parsed === "object") {
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val)) {
          return val.slice(0, 4);
        }
      }
    }
    
    return [query];
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

  // Step 2: Search (Parallel execution of all subquestions)
  onUpdate({ type: "agent_start", agent: "search", message: "Coordinating multi-source retrieval..." });
  
  const searchPromises = subQuestions.map((q) => unifiedSearch(q, onUpdate));
  const resultsArrays = await Promise.all(searchPromises);
  const allResults = resultsArrays.flat();

  // Deduplicate by URL
  const seen = new Set();
  const uniqueResults = allResults.filter((r) => {
    if (!r.url || seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  onUpdate({ type: "agent_done", agent: "search", message: `Found ${uniqueResults.length} unique sources across academic & web`, data: uniqueResults.map((r) => r.url) });

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