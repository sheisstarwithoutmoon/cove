import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import pdfParse from "pdf-parse";
import axios from "axios";
import { authMiddleware } from "./middleware/auth.js";
import { runResearchPipeline } from "./agents/orchestrator.js";
import { saveReport, getReports, getUserProfile, saveUserProfile } from "./firebase.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function extractTag(entry, tag) {
  const match = entry.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return (match?.[1] || "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function parseArxiv(xml = "") {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

  return entries.slice(0, 8).map((entry) => ({
    title: extractTag(entry, "title"),
    summary: extractTag(entry, "summary"),
    published: extractTag(entry, "published"),
    link: extractTag(entry, "id"),
    source: "arXiv",
  }));
}

function buildArxivQuery(interests = []) {
  const base = "(cat:cs.AI OR cat:cs.LG OR cat:cs.CL)";
  if (!Array.isArray(interests) || interests.length === 0) return base;

  const cleaned = interests
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 5);

  if (!cleaned.length) return base;
  const interestQuery = cleaned.map((item) => `all:\"${item}\"`).join(" OR ");
  return `${base} AND (${interestQuery})`;
}

app.get("/", (req, res) => {
  res.json({ status: "Cove API running ✅" });
});

app.get("/profile", authMiddleware, async (req, res) => {
  try {
    const profile = await getUserProfile(req.user.uid);
    res.json(profile);
  } catch (e) {
    console.error("Profile fetch error:", e.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.put("/profile", authMiddleware, async (req, res) => {
  try {
    const interests = Array.isArray(req.body?.interests) ? req.body.interests : [];
    const profile = await saveUserProfile(req.user.uid, { interests });
    res.json(profile);
  } catch (e) {
    console.error("Profile save error:", e.message);
    res.status(500).json({ error: "Failed to save profile" });
  }
});

app.get("/ai-trends", async (req, res) => {
  try {
    const interests = String(req.query?.interests || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const query = buildArxivQuery(interests);
    const searchQuery = encodeURIComponent(query);
    const url = `https://export.arxiv.org/api/query?search_query=${searchQuery}&start=0&max_results=8&sortBy=submittedDate&sortOrder=descending`;

    const { data } = await axios.get(url, { timeout: 15000 });
    const trends = parseArxiv(data);

    res.json({ trends });
  } catch (e) {
    console.error("AI trends fetch error:", e.message);
    res.status(500).json({ error: "Failed to fetch latest AI trends" });
  }
});

app.post("/pdf/context", authMiddleware, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "PDF file is required" });

  try {
    const parsed = await pdfParse(req.file.buffer);
    const extractedText = (parsed.text || "").replace(/\s+/g, " ").trim();

    if (!extractedText) {
      return res.status(400).json({ error: "Could not extract readable text from this PDF" });
    }

    const context = extractedText.slice(0, 15000);

    res.json({
      context,
      meta: {
        fileName: req.file.originalname,
        pageCount: parsed.numpages,
        charCount: extractedText.length,
      },
    });
  } catch (e) {
    console.error("PDF context error:", e.message);
    res.status(500).json({ error: "Failed to process PDF" });
  }
});

// Streaming endpoint — sends live agent updates via SSE
app.post("/research/stream", authMiddleware, async (req, res) => {
  const { query, pdfContext, pdfMeta } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const report = await runResearchPipeline(query, send, { pdfContext, pdfMeta });

    // Save to Firestore
    const reportId = await saveReport(req.user.uid, query, report);

    send({ type: "complete", report, reportId });
  } catch (e) {
    console.error("Pipeline error:", e);
    send({ type: "error", message: e.message });
  } finally {
    res.end();
  }
});

// Non-streaming fallback endpoint
app.post("/research", authMiddleware, async (req, res) => {
  const { query, pdfContext, pdfMeta } = req.body;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const updates = [];
    const report = await runResearchPipeline(query, (u) => updates.push(u), { pdfContext, pdfMeta });
    const reportId = await saveReport(req.user.uid, query, report);
    res.json({ reportId, report });
  } catch (e) {
    console.error("Research error:", e);
    res.status(500).json({ error: e.message });
  }
});

// Get saved reports for user
app.get("/reports", authMiddleware, async (req, res) => {
  try {
    const reports = await getReports(req.user.uid);
    res.json({ reports });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`🚀 Cove API running on http://localhost:${PORT}`));