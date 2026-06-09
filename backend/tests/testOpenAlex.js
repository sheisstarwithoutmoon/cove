import { openalexAgent } from "../retrieval/openalexAgent.js";

async function testOpenAlex() {
  console.log("=== Testing OpenAlex ===");
  const results = await openalexAgent("sparse autoencoders");
  console.log(`OpenAlex Result count: ${results.length}`);
  if (results.length > 0) {
    console.log(`First title: ${results[0].title}`);
  }
}

testOpenAlex().catch(console.error);
