import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Resolve directory path to load local .env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Redirect console.log to console.error to protect the MCP stdio transport channel from corruption
console.log = (...args) => {
  console.error(...args);
};

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { runResearchPipeline } from "./agents/orchestrator.js";
import { unifiedSearch } from "./retrieval/unifiedSearch.js";
import { fetchAndExtractText } from "./retrieval/scraper.js";
import { storeDocumentInVectorDb, retrieveTopChunks } from "./retrieval/vectorStore.js";

// Initialize MCP Server
const server = new McpServer({
  name: "cove-research-server",
  version: "1.0.0",
});

// 1. run_research Tool
server.tool(
  "run_research",
  "Runs the complete Cove multi-agent research pipeline (safety check -> academic/web search -> semantic claim extraction -> claim verification -> report generation). Compiles a detailed, source-cited markdown report on the research query.",
  {
    query: z.string().describe("The research topic or query to investigate."),
    pdfContext: z.string().optional().describe("Optional context extracted from a PDF to guide the research."),
    deepResearch: z.boolean().optional().describe("If true, performs deep research by scraping and vectorizing full retrieved web pages/PDFs into a database (requires local postgres + pgvector running)."),
  },
  async ({ query, pdfContext = "", deepResearch = false }) => {
    try {
      console.error(`[Cove MCP] Starting research pipeline for: "${query}"...`);
      
      const onUpdate = (update) => {
        // Write agent progress messages to stderr so that they print in the user's terminal/logs
        console.error(`[Cove Agent - ${update.agent || 'system'}]: ${update.message || ''}`);
      };

      const report = await runResearchPipeline(query, onUpdate, {
        pdfContext,
        deepResearch,
        pdfMeta: null
      });

      return {
        content: [{ type: "text", text: report }],
      };
    } catch (error) {
      console.error("[Cove MCP] Error running research pipeline:", error);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// 2. unified_search Tool
server.tool(
  "unified_search",
  "Performs a search query across general web search (Tavily) and academic sources (arXiv, OpenAlex). Cleans, deduplicates, and ranks search results semantically.",
  {
    query: z.string().describe("The search query string to run."),
  },
  async ({ query }) => {
    try {
      console.error(`[Cove MCP] Running unified search for: "${query}"...`);
      
      const onUpdate = (update) => {
        console.error(`[Cove Search - ${update.agent || 'system'}]: ${update.message || ''}`);
      };

      const results = await unifiedSearch(query, onUpdate);
      
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (error) {
      console.error("[Cove MCP] Error running search:", error);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// 3. scrape_url Tool
server.tool(
  "scrape_url",
  "Downloads a URL (HTML or PDF) and extracts clean readability text, stripping away menus, headers, and footer boilerplates.",
  {
    url: z.string().url().describe("The URL of the webpage or PDF to scrape."),
  },
  async ({ url }) => {
    try {
      console.error(`[Cove MCP] Scraping URL: ${url}...`);
      const text = await fetchAndExtractText(url);
      
      if (!text) {
        throw new Error("Failed to extract text from URL or URL returned no content.");
      }

      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      console.error("[Cove MCP] Scrape error:", error);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// 4. store_document Tool
server.tool(
  "store_document",
  "Scrapes a URL (web page or PDF), breaks it into semantic text chunks, generates vector embeddings, and stores them in the local pgvector database for RAG context retrieval.",
  {
    url: z.string().url().describe("The URL of the web document to scrape and index."),
  },
  async ({ url }) => {
    try {
      console.error(`[Cove MCP] Embedding and indexing URL: ${url}...`);
      const chunksStored = await storeDocumentInVectorDb(url);
      
      return {
        content: [{ type: "text", text: `Successfully scraped and stored ${chunksStored} document chunks in database for ${url}.` }],
      };
    } catch (error) {
      console.error("[Cove MCP] Database store error:", error);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// 5. query_knowledge_base Tool
server.tool(
  "query_knowledge_base",
  "Queries the pgvector database for semantically similar document chunks based on computed embeddings.",
  {
    query: z.string().describe("The query to search for semantically."),
    k: z.number().int().positive().optional().default(10).describe("The number of matching chunks to retrieve."),
  },
  async ({ query, k }) => {
    try {
      console.error(`[Cove MCP] Querying knowledge base for: "${query}" (k=${k})...`);
      const results = await retrieveTopChunks(query, k);
      
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (error) {
      console.error("[Cove MCP] Knowledge base query error:", error);
      return {
        isError: true,
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  }
);

// Start Server with Stdio Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cove MCP server running on stdio");
}


main().catch((error) => {
  console.error("Fatal error starting Cove MCP server:", error);
  process.exit(1);
});
