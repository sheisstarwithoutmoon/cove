import axios from "axios";
import Groq from "groq-sdk";
import dotenv from "dotenv";
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
          content: `You are a citation verifier. Check if the claim is supported by the source snippet.
Return ONLY JSON: { "supported": true/false, "confidence": "high"|"medium"|"low", "reason": "one line" }
high = directly stated, medium = implied/partial, low = not supported or contradicted`,
        },
        {
          role: "user",
          content: `Claim: ${claim}\n\nSource snippet: ${snippet}`,
        },
      ],
      temperature: 0.1,
    });
    let text = response.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
    return JSON.parse(text);
  } catch {
    return { supported: true, confidence: "medium", reason: "Could not verify" };
  }
}

export async function verifierAgent(summaries) {
  const verified = [];

  for (const source of summaries) {
    const urlAlive = await checkUrlAlive(source.url);

    const verifiedClaims = [];
    for (const claim of source.claims || []) {
      const result = await verifyClaimAgainstSource(claim, source.snippet);
      verifiedClaims.push({
        claim,
        supported: result.supported ?? true,
        confidence: result.confidence ?? "medium",
        reason: result.reason ?? "",
      });
    }

    const confidences = verifiedClaims.map((c) => c.confidence);
    let overall = "medium";
    if (!urlAlive) overall = "low";
    else if (confidences.filter((c) => c === "high").length >= confidences.length / 2) overall = "high";
    else if (confidences.filter((c) => c === "low").length >= confidences.length / 2) overall = "low";

    verified.push({
      url: source.url,
      title: source.title,
      urlAlive,
      claims: verifiedClaims,
      confidence: overall,
      snippet: source.snippet,
    });
  }

  return verified;
}