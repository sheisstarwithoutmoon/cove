import axios from "axios";
import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

export async function searchAgent(query) {
    try {
    const { data } = await axios.post(
        "https://api.tavily.com/search",
        {
            api_key: process.env.TAVILY_API_KEY,
            query,
            search_depth: "advanced",
            max_results: 4,
            include_raw_content: false,
        },
        { timeout: 15000 }
    );
    return (data.results || []).map((r) => ({
        url: r.url || "",
        title: r.title || "",
        source_type: "general",
        snippet: r.content || "",
        published_date: r.published_date || new Date().toISOString(),
        relevance_score: r.score || 1.0,
    }));
    } catch (e) {
    console.error("Search agent error:", e.message);
    return [];
    }
}
