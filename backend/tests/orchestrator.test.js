import { jest } from '@jest/globals';

process.env.GROQ_API_KEY = "dummy_key";

// Mock queryRewriter
jest.unstable_mockModule("../retrieval/queryRewriter.js", () => ({
  rewriteAcademicQuery: jest.fn().mockResolvedValue("mock query")
}));

// Mock unifiedSearch
jest.unstable_mockModule("../retrieval/unifiedSearch.js", () => ({
  unifiedSearch: jest.fn().mockResolvedValue({
    from: "search_agent",
    to: "orchestrator_agent",
    type: "SEARCH_RESULTS",
    payload: {
      results: [
        { url: "https://example.com/relevant", title: "Relevant Paper", snippet: "This paper is about sparse autoencoders." },
        { url: "https://example.com/irrelevant", title: "Irrelevant Paper", snippet: "This is a study on Quranic manuscripts." }
      ]
    }
  })
}));

// Mock groq-sdk with dynamic responses for relevance check, report generation, safety check, and ReAct decisions
const mockGroqCreate = jest.fn();
jest.unstable_mockModule("groq-sdk", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockGroqCreate
      }
    }
  }))
}));

// Mock Axios for search agents
jest.unstable_mockModule("axios", () => ({
  default: {
    get: jest.fn().mockResolvedValue({ data: { results: [] } })
  }
}));

// Mock Gemini AI to avoid real API calls
jest.unstable_mockModule("../utils/gemini.js", () => ({
  ai: {
    models: {
      generateContent: jest.fn(),
      embedContent: jest.fn().mockResolvedValue({
        embedding: { values: [0.1, 0.2, 0.3] }
      })
    }
  },
  default: {
    models: {
      generateContent: jest.fn(),
      embedContent: jest.fn().mockResolvedValue({
        embedding: { values: [0.1, 0.2, 0.3] }
      })
    }
  },
  FLASH_MODEL: 'gemini-3.1-flash-lite',
  EMBEDDING_MODEL: "gemini-embedding-001",
  __esModule: true
}));

// Mock pg vector store
jest.unstable_mockModule("../retrieval/vectorStore.js", () => ({
  storeDocumentInVectorDb: jest.fn(),
  retrieveTopChunks: jest.fn().mockResolvedValue([])
}));

const { runResearchPipeline, AgentMemory } = await import("../agents/orchestrator.js");

describe("Orchestrator Pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default implementation for groq.chat.completions.create
    mockGroqCreate.mockImplementation(async (config) => {
      const systemMsg = config.messages.find(m => m.role === 'system')?.content || '';
      const userMsg = config.messages.find(m => m.role === 'user')?.content || '';
      
      const isRelevanceCheck = systemMsg.includes("relevance auditor") || userMsg.includes("relevance auditor") || userMsg.includes("Paper ID:");
      const isReportGeneration = systemMsg.includes("report builder") || userMsg.includes("report builder") || userMsg.includes("Verified Sources:");
      const isSafetyCheck = systemMsg.includes("safety classifier") || userMsg.includes("safety guardrail");
      const isReAct = systemMsg.includes("Decide your next action:") || userMsg.includes("Decide your next action:");
      
      if (isSafetyCheck) {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  safe: true,
                  reason: ""
                })
              }
            }
          ]
        };
      }
      
      if (isReAct) {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  thought: "Let's finish the process.",
                  action: "finish",
                  report: "This is a mock report.",
                  title: "Mock Title",
                  executive_summary: "Mock summary",
                  safe: true,
                  reason: ""
                })
              }
            }
          ]
        };
      }
      
      if (isRelevanceCheck) {
        if (userMsg.includes("Paper ID:")) {
          return {
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    results: [
                      { id: 0, relevant: true, reason: "Matches topic" },
                      { id: 1, relevant: false, reason: "Completely off-topic" }
                    ]
                  })
                }
              }
            ]
          };
        }
        const isRelevant = userMsg.includes("Relevant Paper");
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  relevant: isRelevant,
                  reason: isRelevant ? "Matches topic" : "Completely off-topic"
                })
              }
            }
          ]
        };
      }

      if (isReportGeneration) {
        return {
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Mock Title",
                  executive_summary: "Mock summary of sparse autoencoders",
                  comprehensive_analysis: ["Analysis content"],
                  key_findings: [],
                  contradictions: [],
                  research_gaps: [],
                  evidence_graph: [],
                  conclusion: "Conclusion"
                })
              }
            }
          ]
        };
      }
      
      // Default response for claim verification
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                status: "SUPPORTED",
                confidence: "high",
                reason: "mock reason",
                evidence: "mock evidence"
              })
            }
          }
        ]
      };
    });
  });

  test("should initialize AgentMemory correctly", () => {
    const memory = new AgentMemory("test query");
    expect(memory.query).toBe("test query");
    expect(memory.steps).toEqual([]);
  });

  test("should run end-to-end research pipeline successfully", async () => {
    const onUpdate = jest.fn();
    const result = await runResearchPipeline("What is sparse autoencoder?", onUpdate);
    
    expect(onUpdate).toHaveBeenCalled();
    expect(result).toBeDefined();
    expect(mockGroqCreate).toHaveBeenCalled();
  }, 10000);

  test("should filter out irrelevant search results in search_query tool", async () => {
    const onUpdate = jest.fn();
    
    // Mock sequential ReAct decisions
    mockGroqCreate
      .mockImplementationOnce(async () => ({ // Input Safety Check
        choices: [{ message: { content: JSON.stringify({ safe: true, reason: "" }) } }]
      }))
      .mockImplementationOnce(async () => ({ // ReAct Step 1: search_query
        choices: [{
          message: {
            content: JSON.stringify({
              thought: "Let's search for sources first.",
              action: "search_query",
              params: { subQuery: "sparse autoencoder" }
            })
          }
        }]
      }))
      .mockImplementationOnce(async () => ({ // Batch Relevance Audit
        choices: [{
          message: {
            content: JSON.stringify({
              results: [
                { id: 0, relevant: true, reason: "Matches topic" },
                { id: 1, relevant: false, reason: "Completely off-topic" }
              ]
            })
          }
        }]
      }))
      .mockImplementationOnce(async () => ({ // ReAct Step 2: finish
        choices: [{
          message: {
            content: JSON.stringify({
              thought: "We found relevant sources. Now let's finish and write the report.",
              action: "finish"
            })
          }
        }]
      }))
      .mockImplementationOnce(async () => ({ // Report Builder
        choices: [{
          message: {
            content: JSON.stringify({
              title: "Mock Title",
              executive_summary: "Mock summary of sparse autoencoders",
              comprehensive_analysis: ["Analysis content"],
              key_findings: [],
              contradictions: [],
              research_gaps: [],
              evidence_graph: [],
              conclusion: "Conclusion"
            })
          }
        }]
      }));
      
    const result = await runResearchPipeline("What is sparse autoencoder?", onUpdate);
    expect(result).toBeDefined();
    
    // Verify that onUpdate was called with search updates
    const searchUpdates = onUpdate.mock.calls
      .map(call => call[0])
      .filter(u => u.agent === "search");
      
    // The search finished update should show 1 relevant source added (and 1 discarded)
    const finishedUpdate = searchUpdates.find(u => u.message && u.message.includes("Search finished"));
    expect(finishedUpdate).toBeDefined();
    expect(finishedUpdate.message).toContain("Added 1 relevant sources");
    expect(finishedUpdate.message).toContain("1 discarded");
  }, 10000);
});
