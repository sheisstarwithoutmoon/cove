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
    const systemPrompt = `You are a citation verifier. Think step by step. First, identify the main claim. Then, find the evidence in the source. Then, assess whether the evidence supports the claim. Finally, give your verdict.

Determine whether the claim is:
SUPPORTED
PARTIALLY_SUPPORTED
CONTRADICTED
INSUFFICIENT_EVIDENCE

Return ONLY JSON:
{
  "thought_process": "Step-by-step reasoning...",
  "status": "SUPPORTED|PARTIALLY_SUPPORTED|CONTRADICTED|INSUFFICIENT_EVIDENCE",
  "confidence": "high|medium|low",
  "reason": "one line explanation",
  "evidence": "direct quote from snippet or empty string"
}

Example 1:
Claim: 'GPT-4 has 1 trillion parameters'
Source: 'OpenAI has not disclosed GPT-4's parameter count'
Output: {
  "thought_process": "1. Main claim: GPT-4 has 1 trillion parameters. 2. Evidence: OpenAI has not disclosed parameter count. 3. Assessment: The source explicitly states parameters are undisclosed. 4. Verdict: CONTRADICTED.",
  "status": "CONTRADICTED",
  "confidence": "high",
  "reason": "The source explicitly states parameters are undisclosed.",
  "evidence": "OpenAI has not disclosed GPT-4's parameter count"
}`;

    const makeCall = (temperature) => 
      groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Claim: ${claim}\n\nSource snippet: ${snippet}` }
        ],
        temperature: temperature,
        response_format: { type: "json_object" }
      }).then(res => safeJsonParse(res.choices[0].message.content, null))
        .catch(err => null);

    // 1st Pass: Deterministic single verification
    const firstResult = await makeCall(0.1);
    
    // If the first result is confident, trust it to save API calls
    if (firstResult && firstResult.status && firstResult.confidence !== "low") {
      return {
        status: firstResult.status,
        confidence: firstResult.confidence,
        reason: firstResult.reason || "",
        evidence: firstResult.evidence || ""
      };
    }

    // 2nd Pass: Fallback Self-Consistency for uncertain claims
    // We already have 1 result, so we just need 2 more with higher temperature
    const fallbackPromises = Array.from({ length: 2 }).map(() => makeCall(0.5));
    const fallbackResults = await Promise.all(fallbackPromises);
    
    const allResults = [firstResult, ...fallbackResults];
    const validResults = allResults.filter(r => r && r.status);

    if (validResults.length === 0) {
      return {
        status: "INSUFFICIENT_EVIDENCE",
        confidence: "low",
        reason: "Verification failed on all attempts",
        evidence: "",
      };
    }

    // Majority Vote on status
    const statusCounts = {};
    validResults.forEach(r => {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });

    let majorityStatus = validResults[0].status;
    let maxCount = 0;
    for (const [status, count] of Object.entries(statusCounts)) {
      if (count > maxCount) {
        maxCount = count;
        majorityStatus = status;
      }
    }

    // Find the first result that matched the majority vote to pull its reason/evidence
    const finalResult = validResults.find(r => r.status === majorityStatus);

    return {
      status: finalResult.status,
      confidence: finalResult.confidence || "low",
      reason: finalResult.reason || "",
      evidence: finalResult.evidence || ""
    };
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
      claimsCount: verifiedClaims.length,
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