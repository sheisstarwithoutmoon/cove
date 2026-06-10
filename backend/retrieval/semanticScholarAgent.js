import axios from "axios";
import { rewriteAcademicQuery } from "./queryRewriter.js";
import { globalMetrics } from "../utils/metrics.js";

export async function searchSemanticScholar(query) {

  let url = "";

  try {

    const rewrittenQuery =
      await rewriteAcademicQuery(query);

    const searchQuery =
      encodeURIComponent(rewrittenQuery);

    url =
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${searchQuery}&limit=10&fields=title,abstract,url,authors,venue,year,citationCount,influentialCitationCount,referenceCount`;

    const { data } = await axios.get(
      url,
      {
          timeout: 15000,
          headers: {
              "User-Agent": "Cove/1.0"
          }
      }
    );
    const results =
      (data.data || []).map((paper) => ({

        title:
          paper.title || "Untitled",

        authors:
          (paper.authors || [])
            .map(a => a.name),

        url:
          paper.url,

        source_type:
          "academic",

        snippet:
          paper.abstract ||
          "No abstract available.",

        published_date:
          paper.year
            ? `${paper.year}-01-01`
            : null,

        citation_count:
          paper.citationCount || 0,

        influential_citation_count:
          paper.influentialCitationCount || 0,

        reference_count:
          paper.referenceCount || 0,

        venue:
          paper.venue || null,

        relevance_score: 1.0

      }));

    results.metadata = {
      provider: "semantic_scholar",
      status: "success"
    };

    globalMetrics.semantic_scholar_hits += results.length;

    return results;

  }
  catch (err) {

    console.error(
      "[Semantic Scholar]",
      err.message
    );

    const results = [];

    results.metadata = {
      provider: "semantic_scholar",
      status: "failed"
    };

    return results;
  }
}