import { groq } from "../utils/groq.js";
import { safeJsonParse } from "../utils/safeJsonParse.js";

export async function classifyQuerySafety(query) {
  try {
    const prompt = `You are a strict safety guardrail for an AI research system.
Determine if the following query violates any safety policies. 
Violations include: hate speech, self-harm, illegal acts, explicit content, highly dangerous activities, or requests to generate malware.

Query: "${query}"

Return ONLY JSON in this format:
{
  "safe": true|false,
  "reason": "Explain why it is unsafe, or empty string if safe"
}`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are a strict safety classifier. Output JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const result = safeJsonParse(response.choices[0].message.content, { safe: true, reason: "" });
    return {
      safe: result.safe !== false,
      reason: result.reason || "Violates content policy"
    };
  } catch (error) {
    console.error("[Content Policy Guard Error]", error.message);
    // Fail-open strategy for availability: if the safety checker is down, we allow the query.
    // In a strict enterprise environment, this would be fail-closed (return { safe: false }).
    return { safe: true, reason: "" };
  }
}
