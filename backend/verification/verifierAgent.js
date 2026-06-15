import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { safeJsonParse } from "../utils/safeJsonParse.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function checkUrlAlive(url) {
  try {
    const res = await axios.head(url, {
      timeout: 8000,
      maxRedirects: 5,
      headers: { "User-Agent": "Cove/1.0" },
    });
    return res.status < 400;
  } catch {
    return false;
  }
}

async function verifyClaimAgainstSource(claim, snippet) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Claim: ${claim}\n\nSource snippet: ${snippet}`,
      config: {
        systemInstruction: `You are a citation verifier.

Determine whether the claim is:
SUPPORTED
PARTIALLY_SUPPORTED
CONTRADICTED
INSUFFICIENT_EVIDENCE`,
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            status: {
              type: "STRING",
              enum: ["SUPPORTED", "PARTIALLY_SUPPORTED", "CONTRADICTED", "INSUFFICIENT_EVIDENCE"]
            },
            confidence: {
              type: "STRING",
              enum: ["high", "medium", "low"]
            },
            reason: {
              type: "STRING"
            },
            evidence: {
              type: "STRING"
            }
          },
          required: ["status", "confidence", "reason", "evidence"]
        }
      }
    });

    const text = response.text;

    return safeJsonParse(text, {
      status: "INSUFFICIENT_EVIDENCE",
      confidence: "low",
      reason: "Parse error",
      evidence: "",
    });
  } catch (err) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      confidence: "low",
      reason: "Verification exception: " + err.message,
      evidence: "",
    };
  }
}

export async function verifierAgent(summaries) {
  const sourcePromises = summaries
  .filter(source => source && source.url)
  .map(async (source) => {
    const urlAlive = await checkUrlAlive(source.url);

    const claimPromises = (source.claims || []).map(async (claim) => {
      const result = await verifyClaimAgainstSource(
        claim.text,
        source.snippet
      );

      return {
        id: claim.id,
        text: claim.text,
        evidence: result.evidence || "",
        status: result.status || "INSUFFICIENT_EVIDENCE",
        confidence: result.confidence || "low",
        reason: result.reason || "",
      };
    });

    const verifiedClaims = await Promise.all(claimPromises);

    // Score each claim status
    const statusScores = {
      SUPPORTED: 1,
      PARTIALLY_SUPPORTED: 0.7,
      INSUFFICIENT_EVIDENCE: 0.3,
      CONTRADICTED: 0,
    };

    const avgScore =
      verifiedClaims.reduce(
        (sum, c) => sum + (statusScores[c.status] || 0.3),
        0
      ) / Math.max(verifiedClaims.length, 1);

    let overall = "medium";

    if (!urlAlive) {
      overall = "low";
    } else if (avgScore >= 0.8) {
      overall = "high";
    } else if (avgScore < 0.5) {
      overall = "low";
    }

    return {
      url: source.url,
      title: source.title,
      urlAlive,
      claims: verifiedClaims,
      confidence: overall,
      snippet: source.snippet,
      source_type: source.source_type,
      published_date: source.published_date,
      relevance_score: source.relevance_score,
    };
  });

  return await Promise.all(sourcePromises);
}