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

/**
 * Tracks the agent's research actions, search results, summarizations, and verifications.
 */
export class AgentMemory {
  constructor(query, pdfContext = "") {
    this.query = query;
    this.pdfContext = pdfContext;
    this.steps = [];             // list of { thought, action, params, observation }
    this.sources = [];           // raw unique sources: { url, title, snippet, source_type, ... }
    this.summaries = [];         // claims: { url, title, claims, snippet, ... }
    this.verifiedSources = [];   // verified results: { url, title, urlAlive, claims, confidence, ... }
    this.searchHistory = [];     // record of queries searched
  }

  addStep(thought, action, params, observation) {
    this.steps.push({ thought, action, params, observation });
  }

  getScratchpad() {
    if (this.steps.length === 0) return "No steps taken yet.";
    return this.steps.map((step, idx) => {
      let observationStr = typeof step.observation === 'object'
        ? JSON.stringify(step.observation)
        : String(step.observation);
      
      // Truncate overly long observations to avoid flooding context window
      if (observationStr.length > 600) {
        observationStr = observationStr.slice(0, 600) + "... (truncated)";
      }
      
      return `Step ${idx + 1}:
Thought: ${step.thought}
Action: ${step.action}(${JSON.stringify(step.params || {})})
Observation: ${observationStr}`;
    }).join("\n\n");
  }
}

// Define the schema for the ReAct step decision
const reactDecisionSchema = {
  type: "OBJECT",
  properties: {
    thought: {
      type: "STRING",
      description: "Analyze what info is missing, what tool is best to run next, or if we have enough info to finish."
    },
    action: {
      type: "STRING",
      enum: ["search_query", "summarize_sources", "verify_claims", "finish"],
      description: "The name of the tool to execute. Select 'finish' when you have gathered enough verified claims to write the final report."
    },
    params: {
      type: "OBJECT",
      properties: {
        subQuery: {
          type: "STRING",
          description: "The research search query string to run."
        }
      },
      description: "Parameters for the action. Required for 'search_query'."
    }
  },
  required: ["thought", "action"]
};

// Keep legacy planSubQuestions export to maintain full compatibility if other files import it
export async function planSubQuestions(query, pdfContext = "") {
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

/**
 * Runs the dynamic ReAct research pipeline.
 */
export async function runResearchPipeline(query, onUpdate, options = {}) {
  const { pdfContext = "", pdfMeta = null } = options;

  // Initialize Memory
  const memory = new AgentMemory(query, pdfContext);

  // Define Tool Registry
  const tools = {
    search_query: async (params) => {
      const { subQuery } = params;
      if (!subQuery) {
        return "Error: subQuery parameter is required for search_query tool.";
      }
      
      memory.searchHistory.push(subQuery);
      
      onUpdate({
        type: "agent_start",
        agent: "search",
        message: `Coordinating retrieval for: "${subQuery}"...`
      });
      
      const results = await unifiedSearch(subQuery, onUpdate);
      
      // Deduplicate by URL and store raw results
      let newCount = 0;
      results.forEach(res => {
        if (res.url && !memory.sources.some(s => s.url === res.url)) {
          memory.sources.push(res);
          newCount++;
        }
      });
      
      onUpdate({
        type: "agent_done",
        agent: "search",
        message: `Search finished. Found ${results.length} total results. Added ${newCount} new sources.`
      });
      
      return `Search completed. Found ${results.length} total results. Added ${newCount} new unique sources. Total unique sources now: ${memory.sources.length}.`;
    },
    
    summarize_sources: async () => {
      // Find sources that have not been summarized yet
      const unsummarized = memory.sources.filter(
        src => !memory.summaries.some(sum => sum.url === src.url)
      );
      
      if (unsummarized.length === 0) {
        return "No new unsummarized sources in memory. Run search_query with a new query first.";
      }
      
      onUpdate({
        type: "agent_start",
        agent: "summarizer",
        message: `Reading and extracting claims from ${unsummarized.length} sources...`
      });
      
      const newSummaries = await summarizerAgent(query, unsummarized, pdfContext);
      
      // Add to summaries memory
      memory.summaries.push(...newSummaries);
      
      onUpdate({
        type: "agent_done",
        agent: "summarizer",
        message: `Extracted key claims from ${unsummarized.length} sources.`
      });
      
      return `Summarization completed. Summarized ${unsummarized.length} sources. Total summarized sources: ${memory.summaries.length}.`;
    },
    
    verify_claims: async () => {
      // Find summaries that have not been verified yet
      const unverified = memory.summaries.filter(
        sum => !memory.verifiedSources.some(v => v.url === sum.url)
      );
      
      if (unverified.length === 0) {
        if (memory.summaries.length === 0) {
          return "No claims exist to verify. You must run summarize_sources first.";
        }
        return "All claims in memory have already been verified.";
      }
      
      onUpdate({
        type: "agent_start",
        agent: "verifier",
        message: `Verifying claims for ${unverified.length} sources...`
      });
      
      const verified = await verifierAgent(unverified);
      
      // Add to verified memory
      memory.verifiedSources.push(...verified);
      
      const high = verified.filter(v => v.confidence !== "low").length;
      const low = verified.filter(v => v.confidence === "low").length;
      
      onUpdate({
        type: "agent_done",
        agent: "verifier",
        message: `${high} verified, ${low} flagged`
      });
      
      return `Verification completed. Verified claims for ${unverified.length} sources. Results: ${high} high-confidence, ${low} low-confidence. Total verified sources: ${memory.verifiedSources.length}.`;
    }
  };

  const maxSteps = 5;
  let step = 0;
  
  onUpdate({ 
    type: "agent_start", 
    agent: "orchestrator", 
    message: "Initializing ReAct dynamic research loop..." 
  });

  while (step < maxSteps) {
    step++;
    
    onUpdate({
      type: "agent_start",
      agent: "orchestrator",
      message: `Step ${step}/${maxSteps}: Deciding next action...`
    });
    
    const systemInstruction = `You are a logical AI researcher orchestrating search, claim summarization, and claim verification in a ReAct loop. Always reason carefully before choosing actions.
Follow this workflow:
1. Start by calling 'search_query' to fetch raw sources for a sub-topic.
2. Call 'summarize_sources' to read those raw sources and extract key claims.
3. Call 'verify_claims' to perform double-checking and cross-verification of those claims.
4. Only call 'finish' after you have completed searching, summarizing, and verifying. Do not call 'finish' prematurely without verified claims in your memory.
5. If you need more information, you can run another 'search_query' with a different query.`;

    const prompt = `You are researching: "${query}"

Here is the additional context from the user's uploaded PDF:
${pdfContext ? pdfContext.slice(0, 3000) : "No PDF uploaded."}

Below is your scratchpad memory of all past actions and their results. 

Scratchpad:
${memory.getScratchpad()}

Current Statistics:
- Unique raw sources gathered: ${memory.sources.length}
- Sources summarized: ${memory.summaries.length}
- Sources verified: ${memory.verifiedSources.length}

Decide your next action:`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.1,
          responseMimeType: "application/json",
          responseSchema: reactDecisionSchema
        }
      });
      
      const decision = safeJsonParse(response.text, null);
      if (!decision || !decision.action) {
        throw new Error("Failed to parse agent decision or action is missing.");
      }
      
      const { thought, action, params } = decision;
      
      // Stream the agent's thought process
      onUpdate({
        type: "agent_thought",
        agent: "orchestrator",
        message: thought
      });
      
      if (action === "finish") {
        onUpdate({
          type: "agent_done",
          agent: "orchestrator",
          message: `ReAct process completed in ${step} steps. Preparing report.`
        });
        break;
      }
      
      const tool = tools[action];
      if (!tool) {
        throw new Error(`Chosen tool action "${action}" is not registered.`);
      }
      
      // Execute the tool and capture observation
      const observation = await tool(params || {});
      
      // Record step to memory
      memory.addStep(thought, action, params, observation);
      
    } catch (e) {
      console.error(`[Orchestrator ReAct Step ${step} Error]:`, e.message);
      onUpdate({
        type: "agent_done",
        agent: "orchestrator",
        message: `Error during step execution: ${e.message}. Retrying.`
      });
      memory.addStep(`Error encountered: ${e.message}`, "retry", {}, e.message);
    }
  }

  // Compile report
  onUpdate({ type: "agent_start", agent: "reporter", message: "Compiling final report..." });
  const report = await reportAgent(query, memory.verifiedSources, pdfContext, pdfMeta);
  onUpdate({ type: "agent_done", agent: "reporter", message: "Report ready!" });

  return report;
}