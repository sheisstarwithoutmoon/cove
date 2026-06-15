import { jest } from '@jest/globals';

// Mock queryRewriter
jest.unstable_mockModule("../retrieval/queryRewriter.js", () => ({
  rewriteAcademicQuery: jest.fn().mockResolvedValue("mock query")
}));

jest.unstable_mockModule("axios", () => ({
  default: {
    get: jest.fn()
  }
}));

const { openalexAgent } = await import("../retrieval/openalexAgent.js");
const axios = (await import("axios")).default;

describe("openalexAgent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should fetch and parse OpenAlex results successfully", async () => {
    const mockResponse = {
      data: {
        results: [
          {
            display_name: "Mock OpenAlex Paper",
            id: "https://openalex.org/W12345",
            publication_year: 2022,
            cited_by_count: 42,
            authorships: [
              { author: { display_name: "Jane Smith" } }
            ],
            primary_location: {
              source: { display_name: "Mock Journal" }
            },
            abstract_inverted_index: {
              "This": [0],
              "is": [1],
              "a": [2],
              "mock": [3],
              "abstract": [4]
            },
            concepts: [
              { display_name: "Computer Science" }
            ]
          }
        ]
      }
    };

    axios.get.mockResolvedValueOnce(mockResponse);

    const results = await openalexAgent("mock query");

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Mock OpenAlex Paper");
    expect(results[0].url).toBe("https://openalex.org/W12345");
    expect(results[0].authors[0]).toBe("Jane Smith");
    expect(results[0].citation_count).toBe(42);
    expect(results[0].source_type).toBe("academic");
    // OpenAlex parsing rebuilds the abstract from the inverted index roughly
    expect(results[0].snippet).toBeDefined();
  });

  test("should handle OpenAlex errors gracefully", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network Error"));

    const results = await openalexAgent("mock query");
    expect(results.length).toBe(0); 
    expect(results.metadata.status).toBe("failed"); 
  });
});
