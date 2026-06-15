import { jest } from '@jest/globals';

// Mock queryRewriter
jest.unstable_mockModule("../retrieval/queryRewriter.js", () => ({
  rewriteAcademicQuery: jest.fn().mockResolvedValue("mock query")
}));

// Mock axios BEFORE importing the module under test
jest.unstable_mockModule("axios", () => ({
  default: {
    get: jest.fn()
  }
}));

const { arxivAgent } = await import("../retrieval/arxivAgent.js");
const axios = (await import("axios")).default;

describe("arxivAgent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should fetch and parse arXiv results successfully", async () => {
    // Fake XML response from arXiv
    const mockXml = `
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Mock ArXiv Paper</title>
          <id>http://arxiv.org/abs/2101.00001</id>
          <summary>This is a mock abstract.</summary>
          <author><name>John Doe</name></author>
          <published>2021-01-01T00:00:00Z</published>
        </entry>
      </feed>
    `;

    axios.get.mockResolvedValueOnce({ data: mockXml });

    const results = await arxivAgent("mock query");

    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBe(1);
    expect(results[0].title).toBe("Mock ArXiv Paper");
    expect(results[0].url).toBe("http://arxiv.org/abs/2101.00001");
    expect(results[0].authors[0]).toBe("John Doe");
    expect(results[0].source_type).toBe("academic");
  });

  test("should handle arXiv errors gracefully", async () => {
    axios.get.mockRejectedValueOnce(new Error("Network Error"));

    const results = await arxivAgent("mock query");
    expect(results.length).toBe(0);
    expect(results.metadata.status).toBe("failed");
  });
});
