import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import { rewriteAcademicQuery } from "./queryRewriter.js";

export async function arxivAgent(query) {
  let url = "";
  let retryCount = 0;
  let failuresCount = 0;
  try {
    const rewrittenQuery = await rewriteAcademicQuery(query);
    console.log("[arXiv Original]", query);
    console.log("[arXiv Rewritten]", rewrittenQuery);

    const searchQuery = encodeURIComponent(`all:${rewrittenQuery}`);
    url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=10&sortBy=relevance&sortOrder=descending`;
    console.log("[Final arXiv URL]", url);

    let data;
    let success = false;
    let attempts = 0;
    const maxRetries = 3;
    const timeout = 5000;
    let delay = 500;

    while (attempts <= maxRetries) {
      try {
        attempts++;
        const response = await axios.get(url, { timeout });
        data = response.data;
        success = true;
        break;
      } catch (err) {
        failuresCount++;
        if (attempts <= maxRetries) {
          retryCount++;
          console.warn(`[arXiv] Attempt ${attempts} failed: ${err.message}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[arXiv] All ${attempts} attempts failed. Last error: ${err.message}`);
        }
      }
    }

    if (!success) {
      const results = [];
      results.metadata = { provider: "arxiv", status: "failed" };
      results.retryCount = retryCount;
      results.failuresCount = failuresCount;
      return results;
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const parsed = parser.parse(data);
    
    let entries = parsed.feed.entry || [];
    if (!Array.isArray(entries)) {
        entries = [entries];
    }

    const results = entries.map((entry) => {
      let authors = [];
      if (entry.author) {
        if (Array.isArray(entry.author)) {
          authors = entry.author.map(a => a.name);
        } else {
          authors = [entry.author.name];
        }
      }

      let categories = [];
      if (entry.category) {
        if (Array.isArray(entry.category)) {
          categories = entry.category.map(c => c["@_term"]);
        } else {
          categories = [entry.category["@_term"]];
        }
      }

      return {
        title: (entry.title || "").replace(/\n/g, " ").trim(),
        authors,
        url: entry.id,
        doi: entry["arxiv:doi"] || null,
        source_type: "academic",
        snippet: (entry.summary || "").replace(/\n/g, " ").trim(),
        published_date: entry.published,
        categories,
        relevance_score: 1.0, 
      };
    });

    results.metadata = { provider: "arxiv", status: "success" };
    results.retryCount = retryCount;
    results.failuresCount = failuresCount;
    return results;
  } catch (e) {
    console.error("Arxiv agent error:", e.message);
    const results = [];
    results.metadata = { provider: "arxiv", status: "failed" };
    results.retryCount = retryCount;
    results.failuresCount = failuresCount === 0 ? 1 : failuresCount;
    return results;
  }
}
