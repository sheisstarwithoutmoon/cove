import axios from "axios";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import { safeJsonParse } from "../utils/safeJsonParse.js";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a citation verifier.

Determine whether the claim is:
SUPPORTED
PARTIALLY_SUPPORTED
CONTRADICTED
INSUFFICIENT_EVIDENCE

Return ONLY JSON:
{
  "status":"SUPPORTED|PARTIALLY_SUPPORTED|CONTRADICTED|INSUFFICIENT_EVIDENCE",
  "confidence":"high|medium|low",
  "reason":"one line explanation",
  "evidence":"direct quote from snippet or empty string"
}`
        },
        {
          role: "user",
          content: `Claim: ${claim}\n\nSource snippet: ${snippet}`
        }
      ],
      temperature: 0.1,
      response_format: {
        type: "json_object"
      }
    });

    const text = response.choices[0].message.content;

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

export async function verifierAgent(summariesOrMessage) {
  const startTime = Date.now();
  let summaries;
  let isEnvelope = false;

  if (summariesOrMessage && summariesOrMessage.payload && typeof summariesOrMessage.payload === "object") {
    summaries = summariesOrMessage.payload.summaries || [];
    isEnvelope = true;
  } else {
    summaries = summariesOrMessage || [];
  }

  const sourcePromises = summaries
  .filter(source => source && source.url)
  .map(async (source) => {
    const urlAlive = await checkUrlAlive(source.url);

    const claimPromises = (source.claims || []).map(async (claim, index) => {
      const claimText = typeof claim === "string" ? claim : (claim.text || JSON.stringify(claim));
      const result = await verifyClaimAgainstSource(
        claimText,
        source.snippet
      );

      return {
        id: `${source.url}-${index}`,
        claim: claimText,
        evidence: result.evidence || "",
        supported: result.status === "SUPPORTED" || result.status === "PARTIALLY_SUPPORTED",
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

  const results = await Promise.all(sourcePromises);

  if (isEnvelope) {
    const high = results.filter(v => v.confidence !== "low").length;
    const overallConfidence = results.length > 0 ? (high / results.length) : 0;

    return {
      from: "verifier_agent",
      to: "orchestrator_agent",
      type: "VERIFICATION_RESULTS",
      payload: {
        verifiedSources: results
      },
      metadata: {
        timestamp: new Date().toISOString(),
        confidence: overallConfidence,
        latency_ms: Date.now() - startTime
      }
    };
  }

  return results;
}