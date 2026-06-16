import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";

// Resolve directory path to load local .env variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

// Setup file logger
const logFilePath = path.resolve(__dirname, "cove-mcp.log");
const logStream = fs.createWriteStream(logFilePath, { flags: "a" });

function writeToLog(type, ...args) {
  const timestamp = new Date().toISOString();
  const message = args.map(arg => {
    if (arg instanceof Error) {
      return `${arg.message}\nStack: ${arg.stack}`;
    }
    return typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg);
  }).join(' ');
  const logLine = `[${timestamp}] [${type}] ${message}\n`;
  logStream.write(logLine);
}

// Redirect console.log and console.error
console.log = (...args) => {
  writeToLog("LOG", ...args);
};

console.error = (...args) => {
  writeToLog("ERROR", ...args);
  // Write to actual stderr so client receives process info if needed
  process.stderr.write(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ') + '\n');
};

// Listen for uncaught exceptions & unhandled promise rejections
process.on("uncaughtException", (error) => {
  writeToLog("CRITICAL_UNCAUGHT", error);
  process.stderr.write(`Uncaught Exception: ${error.message}\nStack: ${error.stack}\n`);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  writeToLog("CRITICAL_REJECTION", reason instanceof Error ? reason : new Error(String(reason)));
  process.stderr.write(`Unhandled Promise Rejection: ${reason?.message || reason}\n`);
});

writeToLog("SYSTEM", "Cove MCP server initializing...");

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { runResearchPipeline } from "./agents/orchestrator.js";
import { unifiedSearch } from "./retrieval/unifiedSearch.js";
import { fetchAndExtractText } from "./retrieval/scraper.js";
import { storeDocumentInVectorDb, retrieveTopChunks } from "./retrieval/vectorStore.js";

// Helper function to format JSON report to structured Markdown
function formatReportToMarkdown(report) {
  let md = `# ${report.title || "Research Report"}\n\n`;
  if (report.query) {
    md += `**Research Query:** ${report.query}\n`;
  }
  md += `**Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n---\n\n`;

  if (report.executive_summary) {
    md += `## Executive Summary\n${report.executive_summary}\n\n`;
  }

  if (report.comprehensive_analysis && Array.isArray(report.comprehensive_analysis)) {
    md += `## Detailed Analysis\n`;
    report.comprehensive_analysis.forEach(p => {
      md += `${p}\n\n`;
    });
  }

  if (report.key_findings && Array.isArray(report.key_findings) && report.key_findings.length > 0) {
    md += `## Key Findings\n`;
    report.key_findings.forEach((kf, idx) => {
      md += `### ${idx + 1}. ${kf.finding}\n`;
      if (kf.evidence) {
        md += `> "${kf.evidence}"\n\n`;
      }
      if (kf.source_title) {
        md += `*Source: [${kf.source_title}](${kf.source_url || '#'})*\n\n`;
      }
    });
  }

  if (report.contradictions && Array.isArray(report.contradictions) && report.contradictions.length > 0) {
    md += `## Contradiction Detection\n\n`;
    report.contradictions.forEach((c, idx) => {
      md += `### Contradiction #${idx + 1}: ${c.topic}\n`;
      if (c.consensus) {
        md += `**Consensus Status:** ${c.consensus}\n\n`;
      }
      
      md += `#### Supporting Views:\n`;
      if (c.supporting_views && Array.isArray(c.supporting_views) && c.supporting_views.length > 0) {
        c.supporting_views.forEach(v => {
          md += `- ${v.view} (Source indices: ${v.source_indices?.join(', ') || 'N/A'})\n`;
        });
      } else {
        md += `- None listed\n`;
      }
      md += `\n`;

      md += `#### Opposing Views:\n`;
      if (c.opposing_views && Array.isArray(c.opposing_views) && c.opposing_views.length > 0) {
        c.opposing_views.forEach(v => {
          md += `- ${v.view} (Source indices: ${v.source_indices?.join(', ') || 'N/A'})\n`;
        });
      } else {
        md += `- None listed\n`;
      }
      md += `\n`;

      if (c.unresolved_questions) {
        md += `**Unresolved Questions:** ${c.unresolved_questions}\n\n`;
      }
    });
  }

  if (report.research_gaps && Array.isArray(report.research_gaps) && report.research_gaps.length > 0) {
    md += `## Research Gap Discovery\n\n`;
    report.research_gaps.forEach((g, idx) => {
      md += `### ${idx + 1}. ${g.gap}\n`;
      if (g.details) {
        md += `${g.details}\n\n`;
      }
    });
  }

  if (report.evidence_graph && Array.isArray(report.evidence_graph) && report.evidence_graph.length > 0) {
    md += `## Evidence Graph\n\n`;
    report.evidence_graph.forEach((eg, idx) => {
      md += `### Claim #${idx + 1}: ${eg.claim}\n`;
      md += `**Confidence Score:** \`${Math.round((eg.confidence || 0) * 100)}%\`\n\n`;
      
      md += `**Supporting Papers:**\n`;
      if (eg.supporting_sources && eg.supporting_sources.length > 0) {
        eg.supporting_sources.forEach(src => {
          md += `- [${src.title || src.url}](${src.url || '#'})\n`;
        });
      } else {
        md += `- None cited\n`;
      }
      md += `\n`;

      md += `**Opposing Papers:**\n`;
      if (eg.opposing_sources && eg.opposing_sources.length > 0) {
        eg.opposing_sources.forEach(src => {
          md += `- [${src.title || src.url}](${src.url || '#'})\n`;
        });
      } else {
        md += `- None cited\n`;
      }
      md += `\n`;
    });
  }

  if (report.conclusion) {
    md += `## Conclusion\n${report.conclusion}\n\n`;
  }

  if (report.sources && Array.isArray(report.sources) && report.sources.length > 0) {
    md += `## Sources & Citations\n`;
    report.sources.forEach((src, idx) => {
      md += `- [${idx + 1}] [${src.title || src.url}](${src.url}) (Confidence: ${src.confidence || 'N/A'})\n`;
    });
  }

  return md;
}

// Initialize MCP Server
const server = new McpServer({
  name: "cove-research-server",
  version: "1.0.0",
});

// 1. run_research Tool
server.tool(
  "run_research",
  "Researches a topic using recent academic papers and web sources and produces a source-cited report. Use when the user asks for literature reviews, surveys, comparisons, trends, or research gaps.",
  {
    query: z.string().describe("The research topic or query to investigate."),
    pdfContext: z.string().optional().describe("Optional context extracted from a PDF to guide the research."),
    deepResearch: z.boolean().optional().describe("If true, performs deep research by scraping and vectorizing full retrieved web pages/PDFs into a database (requires local postgres + pgvector running)."),
  },
  async ({ query, pdfContext = "", deepResearch = false }) => {
    writeToLog("TOOL_CALL", `run_research started with query="${query}", deepResearch=${deepResearch}`);
    try {
      const onUpdate = (update) => {
        writeToLog("RESEARCH_PROGRESS", `[${update.agent || 'system'}] ${update.message || ''}`);
        console.error(`[Cove Agent - ${update.agent || 'system'}]: ${update.message || ''}`);
      };

      const report = await runResearchPipeline(query, onUpdate, {
        pdfContext,
        deepResearch,
        pdfMeta: null
      });

      // Format report object to structured Markdown
      const formattedReport = formatReportToMarkdown(report);

      writeToLog("TOOL_SUCCESS", `run_research completed successfully for query="${query}"`);
      return {
        content: [{ type: "text", text: formattedReport }],
      };
    } catch (error) {
      writeToLog("TOOL_ERROR", `run_research failed for query="${query}":`, error);
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
    writeToLog("TOOL_CALL", `unified_search started with query="${query}"`);
    try {
      const onUpdate = (update) => {
        writeToLog("SEARCH_PROGRESS", `[${update.agent || 'system'}] ${update.message || ''}`);
        console.error(`[Cove Search - ${update.agent || 'system'}]: ${update.message || ''}`);
      };

      const results = await unifiedSearch(query, onUpdate);
      
      writeToLog("TOOL_SUCCESS", `unified_search completed successfully for query="${query}"`);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (error) {
      writeToLog("TOOL_ERROR", `unified_search failed for query="${query}":`, error);
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
    writeToLog("TOOL_CALL", `scrape_url started with url="${url}"`);
    try {
      const text = await fetchAndExtractText(url);
      
      if (!text) {
        throw new Error("Failed to extract text from URL or URL returned no content.");
      }

      writeToLog("TOOL_SUCCESS", `scrape_url completed successfully for url="${url}" (extracted ${text.length} chars)`);
      return {
        content: [{ type: "text", text }],
      };
    } catch (error) {
      writeToLog("TOOL_ERROR", `scrape_url failed for url="${url}":`, error);
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
    writeToLog("TOOL_CALL", `store_document started with url="${url}"`);
    try {
      const chunksStored = await storeDocumentInVectorDb(url);
      
      writeToLog("TOOL_SUCCESS", `store_document completed successfully for url="${url}" (stored ${chunksStored} chunks)`);
      return {
        content: [{ type: "text", text: `Successfully scraped and stored ${chunksStored} document chunks in database for ${url}.` }],
      };
    } catch (error) {
      writeToLog("TOOL_ERROR", `store_document failed for url="${url}":`, error);
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
    writeToLog("TOOL_CALL", `query_knowledge_base started with query="${query}", k=${k}`);
    try {
      const results = await retrieveTopChunks(query, k);
      
      writeToLog("TOOL_SUCCESS", `query_knowledge_base completed successfully for query="${query}"`);
      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    } catch (error) {
      writeToLog("TOOL_ERROR", `query_knowledge_base failed for query="${query}":`, error);
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
  writeToLog("SYSTEM", "Cove MCP server connected to stdio transport and running.");
  console.error("Cove MCP server running on stdio");
}

main().catch((error) => {
  writeToLog("SYSTEM_FATAL", "Fatal error starting Cove MCP server:", error);
  console.error("Fatal error starting Cove MCP server:", error);
  process.exit(1);
});
