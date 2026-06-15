export async function outputGuard(reportObj) {
  // Check for PII (Personally Identifiable Information) leaks in the final report
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN (US)
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/ // Credit Cards
  ];

  const contentToCheck = [
    reportObj.executive_summary,
    ...(reportObj.comprehensive_analysis || [])
  ].join(" ");

  for (const pattern of piiPatterns) {
    if (pattern.test(contentToCheck)) {
      console.error("[Output Guard] PII detected in report output!");
      return { safe: false, reason: "Report generation halted: Potential PII detected in the output." };
    }
  }

  // Ensure JSON structure meets minimal structural validity before returning to user
  if (!reportObj.title || !reportObj.executive_summary) {
    return { safe: false, reason: "Report generation halted: Malformed structural integrity detected." };
  }

  return { safe: true, reason: "" };
}
