import { classifyQuerySafety } from "./content_policy.js";

export async function inputGuard(query) {
  // Check for prompt injection attempts using regex heuristics
  const injectionPatterns = [
    /ignore (previous|all|above) instructions/i,
    /you are now/i,
    /system prompt/i,
    /forget everything/i,
    /bypass guardrails/i,
    /do not follow/i
  ];
  
  for (const pattern of injectionPatterns) {
    if (pattern.test(query)) {
      console.warn(`[Input Guard] Injection attempt blocked: ${pattern}`);
      return { safe: false, reason: "Potential prompt injection detected." };
    }
  }
  
  // If heuristics pass, use LLM to semantically classify query safety
  const classification = await classifyQuerySafety(query);
  
  if (!classification.safe) {
      console.warn(`[Input Guard] Content policy violation: ${classification.reason}`);
  }

  return classification;
}
