import { runResearchPipeline } from "../agents/orchestrator.js";

async function testReAct() {
  const query = "What are the latest advancements in Sparse Autoencoders (SAEs) for LLM interpretability?";
  console.log(`=== Starting E2E ReAct Test for query: "${query}" ===\n`);

  const onUpdate = (update) => {
    switch (update.type) {
      case "agent_start":
        console.log(`\n\x1b[36m[START - ${update.agent.toUpperCase()}]\x1b[0m ${update.message}`);
        break;
      case "agent_done":
        console.log(`\x1b[32m[DONE - ${update.agent.toUpperCase()}]\x1b[0m ${update.message}`);
        if (update.data) {
          console.log(`   Data:`, JSON.stringify(update.data).slice(0, 300));
        }
        break;
      case "agent_thought":
        console.log(`\n\x1b[35m[THOUGHT]\x1b[0m ${update.message}`);
        break;
      case "agent_action":
        console.log(`\x1b[33m[ACTION]\x1b[0m ${update.message}`);
        break;
      default:
        console.log(`[UPDATE - ${update.agent}] ${update.message}`);
    }
  };

  try {
    const report = await runResearchPipeline(query, onUpdate);
    console.log("\n=================================");
    console.log("=== FINAL COMPILED REPORT ===");
    console.log("=================================");
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

testReAct();
