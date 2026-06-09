import { saveReport } from "../db/saveReport.js";
import { getReports } from "../db/getReports.js";

const report = {
  title: "Test Report",
  sources: [
    {
      title: "Attention Is All You Need",
      url: "https://arxiv.org/abs/1706.03762",
      confidence: "high",
      source_type: "academic",
      claims: [
        {
          id: "claim_1",
          text: "Transformers rely on self-attention.",
          status: "SUPPORTED",
          confidence: "high",
          evidence: "The Transformer uses self-attention mechanisms."
        }
      ]
    }
  ]
};

const reportId = await saveReport(
  "test_user",
  "What are transformers?",
  report
);

console.log("Saved:", reportId);

const reports = await getReports("test_user");

console.log(JSON.stringify(reports, null, 2));