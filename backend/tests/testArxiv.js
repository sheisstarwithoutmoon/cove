import { arxivAgent } from "../retrieval/arxivAgent.js";

async function testArxiv() {
  console.log("=== Testing arXiv ===");
  const results = await arxivAgent("sparse autoencoders");
  console.log(`arXiv Result count: ${results.length}`);
  if (results.length > 0) {
    console.log(`First title: ${results[0].title}`);
  }
}

testArxiv().catch(console.error);
