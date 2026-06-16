import axios from "axios";
import { groq } from "../utils/groq.js";
import dotenv from "dotenv";
import { safeJsonParse } from "../utils/safeJsonParse.js";

dotenv.config();

async function callGroqWithRetry(fn, maxRetries = 5, baseDelay = 1000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const isRateLimit = err.status === 429 || 
                          (err.message && err.message.includes("429")) || 
                          (err.message && err.message.toLowerCase().includes("rate limit"));
                          
      if (isRateLimit && attempt < maxRetries) {
        let delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500;
        const match = err.message?.match(/try again in ([\d\.]+)s/i);
        if (match) {
          delay = (parseFloat(match[1]) * 1000) + 200;
        } else if (err.response?.data?.error?.message) {
          const innerMatch = err.response.data.error.message.match(/try again in ([\d\.]+)s/i);
          if (innerMatch) {
            delay = (parseFloat(innerMatch[1]) * 1000) + 200;
          }
        }
        console.warn(`[Groq Rate Limit] Attempt ${attempt} failed with 429. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
}

async function checkUrlAlive(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
  };
  try {
    const res = await axios.head(url, {
      timeout: 6000,
      maxRedirects: 5,
      headers
    });
    return res.status < 400;
  } catch (err) {
    try {
      const res = await axios.get(url, {
        timeout: 6000,
        maxRedirects: 5,
        headers
      });
      return res.status < 400;
    } catch (getErr) {
      const status = getErr.response?.status;
      if (status && [400, 401, 403, 405].includes(status)) {
        return true;
      }
      return false;
    }
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
      callGroqWithRetry(() =>
        groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Claim: ${claim}\n\nSource snippet: ${snippet}` }
          ],
          temperature: temperature,
          response_format: { type: "json_object" }
        })
      ).then(res => safeJsonParse(res.choices[0].message.content, null))
        .catch(err => {
          console.error("[verifierAgent makeCall error]:", err.message);
          return null;
        });

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

async function verifyClaimsAgainstSourceBatch(claims, snippet) {
  if (!claims || claims.length === 0) return [];
  try {
    const claimsFormatted = claims.map((c, idx) => `Claim ID: ${idx}\nClaim: "${c}"`).join("\n\n");

    const systemPrompt = `You are a citation verifier. You must evaluate multiple claims against a single source snippet.
For each claim, identify the evidence in the source, assess whether the evidence supports the claim, and provide a verdict.

Determine whether each claim is:
- SUPPORTED: The source explicitly supports the claim.
- PARTIALLY_SUPPORTED: The source partially supports the claim, but some details are missing or slightly off.
- CONTRADICTED: The source contradicts the claim.
- INSUFFICIENT_EVIDENCE: The source does not have enough information to support or contradict the claim.

Return ONLY a JSON object with a "results" array matching the following schema:
{
  "results": [
    {
      "id": 0,
      "thought_process": "Step-by-step reasoning...",
      "status": "SUPPORTED|PARTIALLY_SUPPORTED|CONTRADICTED|INSUFFICIENT_EVIDENCE",
      "confidence": "high|medium|low",
      "reason": "One line explanation",
      "evidence": "Direct quote from snippet or empty string"
    },
    ...
  ]
}`;

    const makeCall = (temperature) => 
      callGroqWithRetry(() =>
        groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Claims to verify:\n${claimsFormatted}\n\nSource snippet:\n${snippet}` }
          ],
          temperature: temperature,
          response_format: { type: "json_object" }
        })
      ).then(res => safeJsonParse(res.choices[0].message.content, null))
        .catch(err => {
          console.error("[verifierAgent makeCall error]:", err.message);
          return null;
        });

    // 1st Pass: Deterministic single verification
    let batchResult = await makeCall(0.1);
    
    // Fallback: if 1st pass failed or returns invalid structure, try once more with slightly higher temperature
    if (!batchResult || !Array.isArray(batchResult.results)) {
      console.warn("[Verifier Batch] First pass failed, retrying...");
      batchResult = await makeCall(0.3);
    }

    const resultsMap = {};
    if (batchResult && Array.isArray(batchResult.results)) {
      for (const item of batchResult.results) {
        resultsMap[item.id] = {
          thought_process: item.thought_process || "",
          status: item.status || "INSUFFICIENT_EVIDENCE",
          confidence: item.confidence || "low",
          reason: item.reason || "",
          evidence: item.evidence || ""
        };
      }
    }

    // Return in the original order
    return claims.map((c, idx) => {
      return resultsMap[idx] || {
        thought_process: "Failed to parse batch verifier response for this claim.",
        status: "INSUFFICIENT_EVIDENCE",
        confidence: "low",
        reason: "Batch parsing fallback",
        evidence: ""
      };
    });
  } catch (e) {
    console.error("Batch claim verification error:", e.message);
    return claims.map(() => ({
      thought_process: "Error occurred during batch verification.",
      status: "INSUFFICIENT_EVIDENCE",
      confidence: "low",
      reason: `Error: ${e.message}`,
      evidence: ""
    }));
  }
}


export async function checkSourceRelevance(query, title, snippet) {
  if (!query) return { relevant: true, reason: "" };
  try {
    const prompt = `You are a research relevance auditor. Evaluate if the source is relevant to the user's query and intent.
User Query: "${query}"

Source Title: "${title}"
Source Snippet: "${snippet}"

Assess if this source helps answer the query. If the user is asking for specific things (like applications, comparisons, surveys, or historical trends), verify if this source addresses those aspects. If the source is completely off-topic or irrelevant (e.g. it talks about Quranic studies, image steganography, or disease diagnostics when the query is about language models or RAG), classify it as NOT relevant.

Return ONLY JSON:
{
  "relevant": true|false,
  "reason": "Short explanation of relevance or why it is irrelevant"
}`;

    const res = await callGroqWithRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a strict academic evaluator. Output JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    );

    return safeJsonParse(res.choices[0].message.content, { relevant: true, reason: "" });
  } catch (e) {
    console.error("Relevance check error:", e.message);
    return { relevant: true, reason: "" };
  }
}

export async function checkBatchRelevance(query, papers) {
  if (!query || !papers || papers.length === 0) return [];
  try {
    const papersFormatted = papers.map((p, idx) => {
      return `Paper ID: ${idx}
Title: "${p.title}"
Snippet: "${p.snippet}"`;
    }).join("\n\n---\n\n");

    const prompt = `You are a research relevance auditor. Evaluate if each of the following sources is relevant to the user's query and intent.
User Query: "${query}"

Sources to evaluate:
${papersFormatted}

Assess if each source helps answer the query. If the user is asking for specific things (like applications, comparisons, surveys, or historical trends), verify if this source addresses those aspects. If the source is completely off-topic or irrelevant (e.g. it talks about Quranic studies, image steganography, or disease diagnostics when the query is about language models or RAG), classify it as relevant: false.

Return ONLY a JSON object with a "results" array matching the following schema:
{
  "results": [
    {
      "id": 0,
      "relevant": true|false,
      "reason": "Short explanation of relevance or why it is irrelevant"
    },
    ...
  ]
}`;

    const res = await callGroqWithRetry(() =>
      groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are a strict academic evaluator. Output JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    );

    const parsed = safeJsonParse(res.choices[0].message.content, { results: [] });
    const resultsMap = {};
    if (parsed && Array.isArray(parsed.results)) {
      for (const item of parsed.results) {
        resultsMap[item.id] = {
          relevant: !!item.relevant,
          reason: item.reason || ""
        };
      }
    }

    // Return in the original order
    return papers.map((p, idx) => {
      const audit = resultsMap[idx] || { relevant: true, reason: "Defaulted to relevant due to missing parse info" };
      return { res: p, audit };
    });
  } catch (e) {
    console.error("Batch relevance check error:", e.message);
    // Fallback: mark all as relevant if error
    return papers.map(p => ({
      res: p,
      audit: { relevant: true, reason: `Relevance audit failed: ${e.message}` }
    }));
  }
}


export async function verifierAgent(summariesOrMessage) {
  const startTime = Date.now();
  let summaries = [];
  let query = "";
  let isEnvelope = false;

  if (summariesOrMessage && summariesOrMessage.payload && typeof summariesOrMessage.payload === "object") {
    summaries = summariesOrMessage.payload.summaries || [];
    query = summariesOrMessage.payload.query || "";
    isEnvelope = true;
  } else {
    summaries = summariesOrMessage || [];
  }

  const validSources = summaries.filter(source => source && source.url);
  const results = [];
  const CHUNK_SIZE = 3;

  for (let i = 0; i < validSources.length; i += CHUNK_SIZE) {
    const chunk = validSources.slice(i, i + CHUNK_SIZE);
    
    const chunkPromises = chunk.map(async (source) => {
      const urlAlive = await checkUrlAlive(source.url);

      const claimsList = (source.claims || []).map(claim => 
        typeof claim === "string" ? claim : (claim.text || JSON.stringify(claim))
      );

      const batchResults = await verifyClaimsAgainstSourceBatch(claimsList, source.snippet);

      const verifiedClaims = claimsList.map((claimText, index) => {
        const result = batchResults[index];
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

      const hasSupported = verifiedClaims.some(c => c.supported);
      const hasContradicted = verifiedClaims.some(c => c.status === "CONTRADICTED");
      
      let overall = "low";
      
      if (hasSupported && !hasContradicted) {
        overall = "medium";
        const supportedRatio = verifiedClaims.filter(c => c.supported).length / verifiedClaims.length;
        if (supportedRatio >= 0.75) {
          overall = "high";
        }
      } else if (hasSupported && hasContradicted) {
        overall = "medium";
      } else {
        overall = "low";
      }

      // If URL is dead, cap overall confidence to "medium" but don't force to "low"
      if (!urlAlive && overall === "high") {
        overall = "medium";
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

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);

    // Small delay between chunks to let rate limit tokens refresh
    if (i + CHUNK_SIZE < validSources.length) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

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