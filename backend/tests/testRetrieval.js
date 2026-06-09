import { unifiedSearch } from "../retrieval/unifiedSearch.js";

async function runTests() {
  const testQueries = [
    "Sparse Autoencoders",
    "Agentic AI",
    "Retrieval Augmented Generation",
    "Graph Neural Networks"
  ];

  for (const query of testQueries) {
    console.log(`\n\n=== Testing Query: "${query}" ===`);
    const results = await unifiedSearch(query, (msg) => console.log("   ->", msg.message));
    
    console.log(`Returned ${results.length} total results.`);
    const academic = results.filter(r => r.source_type === "academic");
    
    if (academic.length > 0) {
        console.log(`Top 2 Academic Results out of ${academic.length}:`);
        academic.slice(0, 2).forEach((r, i) => {
           console.log(`  [${i+1}] Title: ${r.title}`);
           console.log(`      Authors: ${(r.authors || []).join(", ") || "None"}`);
           console.log(`      Citation Count: ${r.citation_count || 0}`);
           console.log(`      Relevance Score: ${r.relevance_score?.toFixed(3)}`);
           console.log(`      Categories/Concepts: ${(r.categories || []).join(", ")} | ${(r.concepts || []).join(", ")}`);
        });
    } else {
        console.log("No academic results returned.");
    }
  }
}

runTests().catch(console.error);
