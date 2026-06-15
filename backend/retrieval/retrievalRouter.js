import Groq from "groq-sdk";
import dotenv from "dotenv";
import { safeJsonParse } from "../utils/safeJsonParse.js";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function retrievalRouter(query) {
  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{
        role: "system",
        content: `You are a research query classifier. Classify queries into:
- "academic": needs peer-reviewed papers, citations, research methodology
- "general": needs news, blogs, current events, practical guides  
- "hybrid": needs both academic depth AND current real-world context

Few-shot examples:
Query: "What is the mathematical proof behind transformers?"
Reasoning: This asks for theoretical foundations requiring academic papers.
Category: academic

Query: "What did OpenAI announce at their 2025 developer conference?"
Reasoning: This is a recent news event, no academic papers would cover it.
Category: general

Query: "What are the latest advancements in RAG for production systems?"
Reasoning: Needs both research papers on RAG techniques AND industry blog posts on production use.
Category: hybrid

Query: "How does backpropagation work?"
Reasoning: Foundational ML concept best explained by academic/educational sources.
Category: academic

Query: "Best practices for deploying LLMs in 2025?"
Reasoning: Practical industry knowledge, mostly blogs and guides, some papers.
Category: hybrid

Now classify the user's query step by step:
1. What is the user actually trying to learn?
2. Would academic papers help? Would web sources help?
3. Choose the category.

Return JSON: { "category": "academic|general|hybrid", "reasoning": "...", "confidence": 0.0-1.0 }`
      }, {
        role: "user",
        content: `Query: "${query}"`
      }],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const parsed = safeJsonParse(
      response.choices[0].message.content, 
      { category: "hybrid" }
    );
    const cat = parsed.category?.toLowerCase() || "hybrid";

    console.log(`[Router] "${query}" → ${cat} (${parsed.confidence}) — ${parsed.reasoning}`);

    return ["academic", "general", "hybrid"].includes(cat) ? cat : "hybrid";
  } catch (error) {
    console.error("[Retrieval Router Error]:", error.message);
    return "hybrid";
  }
}
