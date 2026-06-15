import { jest } from '@jest/globals';

process.env.GROQ_API_KEY = "dummy_key";

// Mock queryRewriter
jest.unstable_mockModule("../retrieval/queryRewriter.js", () => ({
  rewriteAcademicQuery: jest.fn().mockResolvedValue("mock query")
}));

// Mock groq-sdk
jest.unstable_mockModule("groq-sdk", () => ({
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  category: "hybrid",
                  reasoning: "mock reasoning",
                  confidence: 0.9,
                  title: "Mock Title",
                  executive_summary: "Mock summary"
                })
              }
            }
          ]
        })
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
      generateContent: jest.fn().mockResolvedValue({
        text: JSON.stringify({
          action: "finish",
          report: "This is a mock report.",
          title: "Mock Title",
          executive_summary: "Mock summary",
          safe: true,
          reason: ""
        })
      }),
      embedContent: jest.fn().mockResolvedValue({
        embedding: { values: [0.1, 0.2, 0.3] }
      })
    }
  },
  default: {
    models: {
      generateContent: jest.fn().mockResolvedValue({
        text: JSON.stringify({
          action: "finish",
          report: "This is a mock report.",
          title: "Mock Title",
          executive_summary: "Mock summary",
          safe: true,
          reason: ""
        })
      }),
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
const gemini = await import("../utils/gemini.js");

describe("Orchestrator Pipeline", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(gemini.ai.models.generateContent).toHaveBeenCalled();
  }, 10000); 
});
