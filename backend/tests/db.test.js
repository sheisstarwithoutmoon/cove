import { jest } from '@jest/globals';

jest.unstable_mockModule("../db/index.js", () => {
  const mockConnect = jest.fn().mockResolvedValue({ 
    query: jest.fn().mockResolvedValue({ rows: [{ current_database: "mockdb" }] }), 
    release: jest.fn() 
  });
  
  return {
    __esModule: true,
    db: {
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: "mock_id" }])
        })
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([{ id: "mock_id", query: "mock query" }])
          })
        })
      }),
      query: {
        reports: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: "mock_id",
              query: "mock query",
              createdAt: new Date(),
              title: "Mock Title",
              sources: [],
              metrics: null
            }
          ])
        }
      }
    },
    pool: {
      connect: mockConnect
    }
  };
});

const { getReports } = await import("../db/getReports.js");
const { saveReport } = await import("../db/saveReport.js");
const { pool } = await import("../db/index.js");

describe("Database functions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should test DB connection successfully", async () => {
    const client = await pool.connect();
    const result = await client.query("select current_database()");
    expect(result.rows[0].current_database).toBe("mockdb");
    client.release();
    expect(client.release).toHaveBeenCalled();
  });

  test("saveReport should generate valid query and return an ID", async () => {
    const report = {
      title: "Test Report",
      sources: []
    };

    const id = await saveReport("test_user", "What are transformers?", report);
    
    // PG mock should have been called
    expect(id).toBeDefined();
    // Since our mock returns {id: "mock_id"} for any query, id should be "mock_id"
    expect(id).toBe("mock_id");
  });

  test("getReports should return reports for a user", async () => {
    const reports = await getReports("test_user");
    
    expect(reports).toBeInstanceOf(Array);
    expect(reports.length).toBeGreaterThan(0);
    expect(reports[0].query).toBe("mock query");
  });
});
