import ai from "../utils/gemini.js";

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

    // We use gemini-2.5-flash for incredibly fast and cheap safety filtering
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text);
    return {
      safe: result.safe,
      reason: result.reason || "Violates content policy"
    };
  } catch (error) {
    console.error("[Content Policy Guard Error]", error.message);
    // Fail-open strategy for availability: if the safety checker is down, we allow the query.
    // In a strict enterprise environment, this would be fail-closed (return { safe: false }).
    return { safe: true, reason: "" };
  }
}
