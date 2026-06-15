import { ai } from "../utils/gemini.js";
import { safeJsonParse } from "../utils/safeJsonParse.js";

export async function reportAgent(
  queryOrMessage,
  verifiedSourcesLegacy,
  pdfContextLegacy = "",
  pdfMetaLegacy = null
) {
  const startTime = Date.now();
  let query, verifiedSources, pdfContext, pdfMeta;
  let isEnvelope = false;

  if (queryOrMessage && queryOrMessage.payload && typeof queryOrMessage.payload === "object") {
    query = queryOrMessage.payload.query;
    verifiedSources = queryOrMessage.payload.verifiedSources || [];
    pdfContext = queryOrMessage.payload.pdfContext || "";
    pdfMeta = queryOrMessage.payload.pdfMeta || null;
    isEnvelope = true;
  } else {
    query = queryOrMessage;
    verifiedSources = verifiedSourcesLegacy || [];
    pdfContext = pdfContextLegacy;
    pdfMeta = pdfMetaLegacy;
  }

  const goodSources = verifiedSources.filter((s) => s.confidence !== "low");
  const flaggedSources = verifiedSources.filter((s) => s.confidence === "low");

  const sourcesText = goodSources
    .map((s, i) => {
      const claims = s.claims
        .filter((c) => c.supported)
        .map((c) => `  - Claim: ${c.claim}\n    Evidence: ${c.evidence || "verbatim source snippet"}`)
        .join("\n");
      return `[${i + 1}] ${s.title} (${s.url})\n${claims}`;
    })
    .join("\n\n");

  const additionalContext = pdfContext
    ? `\n\nAdditional user-provided PDF context (supplementary only, do not cite as external source):\n${pdfContext.slice(0, 2500)}`
    : "";

  const fallbackReport = {
    title: `Research Report: ${query}`,
    executive_summary: "Research completed with verified sources.",
    key_findings: goodSources.flatMap((s, i) =>
      s.claims
        .filter((c) => c.supported)
        .slice(0, 2)
        .map((c) => ({
          finding: c.claim,
          evidence: c.evidence || "",
          source_index: i + 1,
          source_title: s.title,
          source_url: s.url
        }))
    ),
    conclusion: "See sources for full details."
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Research Query: ${query}\n\nVerified Sources:\n${sourcesText}${additionalContext}`,
      config: {
        systemInstruction: `You are a research report writer. Write a structured report based on verified web sources. Use additional PDF context only as user background context and never as external citation.`,
        temperature: 0.3,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            executive_summary: { type: "STRING" },
            key_findings: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  finding: { type: "STRING" },
                  evidence: { type: "STRING" },
                  source_index: { type: "INTEGER" },
                  source_title: { type: "STRING" },
                  source_url: { type: "STRING" }
                },
                required: ["finding", "evidence", "source_index", "source_title", "source_url"]
              }
            },
            conclusion: { type: "STRING" }
          },
          required: ["title", "executive_summary", "key_findings", "conclusion"]
        }
      }
    });

    let text = response.text;
    const report = safeJsonParse(text, fallbackReport);

    report.sources = verifiedSources.map((s) => ({
      url: s.url,
      title: s.title,
      confidence: s.confidence,
      urlAlive: s.urlAlive,
      claims: s.claims.filter(c => c.supported).map(c => ({
        claim: c.claim,
        evidence: c.evidence,
        supported: c.supported,
        confidence: c.confidence
      })),
      claimsCount: s.claims.filter((c) => c.supported).length,
      source_type: s.source_type,
      published_date: s.published_date
    }));
    report.verifiedCount = goodSources.length;
    report.flaggedCount = flaggedSources.length;
    report.query = query;
    report.pdfContextUsed = Boolean(pdfContext);
    report.pdfMeta = pdfMeta || null;

    if (isEnvelope) {
      return {
        from: "report_agent",
        to: "orchestrator_agent",
        type: "FINAL_REPORT",
        payload: {
          report: report
        },
        metadata: {
          timestamp: new Date().toISOString(),
          latency_ms: Date.now() - startTime
        }
      };
    }

    return report;
  } catch (e) {
    console.error("Report agent error:", e.message);
    const report = { ...fallbackReport };
    report.sources = verifiedSources.map((s) => ({ 
      url: s.url, 
      title: s.title, 
      confidence: s.confidence, 
      urlAlive: s.urlAlive, 
      claims: s.claims.filter(c => c.supported).map(c => ({
        claim: c.claim,
        evidence: c.evidence,
        supported: c.supported,
        confidence: c.confidence
      })),
      claimsCount: s.claims.filter((c) => c.supported).length,
      source_type: s.source_type,
      published_date: s.published_date
    }));
    report.verifiedCount = goodSources.length;
    report.flaggedCount = flaggedSources.length;
    report.pdfContextUsed = Boolean(pdfContext);
    report.pdfMeta = pdfMeta || null;
    report.query = query;

    if (isEnvelope) {
      return {
        from: "report_agent",
        to: "orchestrator_agent",
        type: "FINAL_REPORT",
        payload: {
          report: report
        },
        metadata: {
          timestamp: new Date().toISOString(),
          error: e.message,
          latency_ms: Date.now() - startTime
        }
      };
    }

    return report;
  }
}