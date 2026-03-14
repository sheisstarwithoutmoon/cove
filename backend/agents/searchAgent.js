import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

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
        snippet: r.content || "",
    }));
    } catch (e) {
    console.error("Search agent error:", e.message);
    return [];
    }
}