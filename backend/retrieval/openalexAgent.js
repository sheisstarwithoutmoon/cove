import axios from "axios";
import { rewriteAcademicQuery } from "./queryRewriter.js";

function reconstructAbstract(invertedIndex) {
  if (!invertedIndex) return "";
  const words = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words[pos] = word;
    }
  }
  return words.join(" ").replace(/\s+/g, " ").trim();
}

export async function openalexAgent(query) {
  let url = "";
  try {
    const rewrittenQuery = await rewriteAcademicQuery(query);
    console.log("[Original Query]", query);
    console.log("[Rewritten Query]", rewrittenQuery);

    const searchQuery = encodeURIComponent(rewrittenQuery);
    url = `https://api.openalex.org/works?search=${searchQuery}&per_page=10`;
    console.log("[Final OpenAlex URL]", url);

    const { data } = await axios.get(url, { 
        timeout: 15000
    });

    const results = (data.results || []).map((r) => {
      const authors = (r.authorships || []).map(a => a.author?.display_name).filter(Boolean);
      const venue = r.primary_location?.source?.display_name || null;
      let concepts = [];
      if (r.concepts) {
          concepts = r.concepts.map(c => c.display_name);
      }

      return {
        title: r.display_name || "Untitled",
        authors,
        url: r.doi || r.ids?.mag || r.id,
        doi: r.doi,
        source_type: "academic",
        snippet: reconstructAbstract(r.abstract_inverted_index) || "No abstract available.",
        published_date: r.publication_date,
        citation_count: r.cited_by_count || 0,
        venue,
        concepts,
        relevance_score: r.relevance_score || 1.0,
      };
    });

    results.metadata = { provider: "openalex", status: "success" };
    results.failuresCount = 0;
    return results;
  } catch (e) {
    console.error("OpenAlex Status:", e.response?.status);
    console.error("OpenAlex Data:", e.response?.data);
    console.error("OpenAlex URL:", url);
    console.error("OpenAlex Error:", e.message);
    const results = [];
    results.metadata = { provider: "openalex", status: "failed" };
    results.failuresCount = 1;
    return results;
  }
}
