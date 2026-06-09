export const jsonParseMetrics = {
  parseFailures: 0,
  recoveredParses: 0
};

export function safeJsonParse(text, fallback) {
  if (typeof text !== "string") {
    jsonParseMetrics.parseFailures++;
    return fallback;
  }

  // 1. Try simple parse first
  try {
    return JSON.parse(text);
  } catch (err) {
    // Continue to recovery
  }

  // 2. Perform recovery/repair
  let cleaned = text.trim();

  // Remove markdown wrappers (e.g., ```json ... ``` or ``` ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1").trim();

  // Extract JSON block (if there is text before or after the JSON)
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf("]");
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }

  // Repair trailing commas inside arrays and objects
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    const parsed = JSON.parse(cleaned);
    jsonParseMetrics.recoveredParses++;
    return parsed;
  } catch (err) {
    jsonParseMetrics.parseFailures++;
    return fallback;
  }
}
