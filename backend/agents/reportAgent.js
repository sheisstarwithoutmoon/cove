import { groq } from "../utils/groq.js";
import dotenv from "dotenv";
import { safeJsonParse } from "../utils/safeJsonParse.js";

dotenv.config();

function formatReportSources(report, verifiedSources, goodSources, flaggedSources, query, pdfContext, pdfMeta) {
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
  return report;
}

export async function reportAgent(
  queryOrMessage,
  verifiedSourcesLegacy,
  pdfContextLegacy = "",
  pdfMetaLegacy = null
) {
  const startTime = Date.now();
  let query, verifiedSources, pdfContext, pdfMeta, deepResearch;
  let isEnvelope = false;

  if (queryOrMessage && queryOrMessage.payload && typeof queryOrMessage.payload === "object") {
    query = queryOrMessage.payload.query;
    verifiedSources = queryOrMessage.payload.verifiedSources || [];
    pdfContext = queryOrMessage.payload.pdfContext || "";
    pdfMeta = queryOrMessage.payload.pdfMeta || null;
    deepResearch = queryOrMessage.payload.deepResearch || false;
    isEnvelope = true;
  } else {
    query = queryOrMessage;
    verifiedSources = verifiedSourcesLegacy || [];
    pdfContext = pdfContextLegacy;
    pdfMeta = pdfMetaLegacy;
    deepResearch = false;
  }

  // Aggressively drop irrelevant sources that returned empty claims from the summarizer
  verifiedSources = verifiedSources.filter((s) => !(s.confidence === "low" && s.claims && s.claims.length === 0));

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

  const isDeep = Boolean(deepResearch);

  const fallbackReport = {
    title: `Research Report: ${query}`,
    executive_summary: "Research completed with verified sources.",
    comprehensive_analysis: isDeep ? ["Detailed synthesis could not be generated."] : undefined,
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
    contradictions: [],
    research_gaps: [],
    evidence_graph: [],
    conclusion: "See sources for full details."
  };

  const systemPrompt = isDeep 
    ? `You are an expert research analyst writing a highly detailed, comprehensive report based on deep vector-retrieved web sources.
Use additional PDF context only as user background context and never as external citation.
Your goal is to synthesize the massive amount of provided semantic evidence into a cohesive, deeply analytical report.

You MUST ground your writing strictly in the provided sources list (do not invent paper names, facts, or URLs). Cite findings naturally and cross-reference multiple views.
You MUST include sections on contradiction detection, research gap discovery, and an evidence graph mapping claims to sources.

Return ONLY JSON with this structure:
{
  "title": "Report title",
  "executive_summary": "A comprehensive 1-2 paragraph summary that synthesizes the findings to directly and thoroughly answer the user's main research query.",
  "comprehensive_analysis": [
    "Paragraph 1: Deep dive into the first major theme, heavily grounded in the evidence...",
    "Paragraph 2: Detailed synthesis of conflicting or supporting data...",
    "Paragraph 3: Further nuanced breakdown...",
    "Paragraph 4: ..."
  ],
  "key_findings": [
    { 
      "finding": "Specific factual finding", 
      "evidence": "verbatim evidence snippet quote",
      "source_index": 1, 
      "source_title": "title", 
      "source_url": "url" 
    }
  ],
  "contradictions": [
    {
      "topic": "The issue or claim where sources differ or disagree",
      "consensus": "Summary of consensus or status of disagreement",
      "supporting_views": [
        {
          "view": "Description of the supporting view/arguments",
          "source_indices": [1, 2]
        }
      ],
      "opposing_views": [
        {
          "view": "Description of the opposing view/arguments",
          "source_indices": [3]
        }
      ],
      "unresolved_questions": "Remaining open questions or contradictions that cannot be settled by current evidence"
    }
  ],
  "research_gaps": [
    {
      "gap": "Description of the unsolved research gap or missing info",
      "details": "Details on why it is unsolved or what is missing from the literature"
    }
  ],
  "evidence_graph": [
    {
      "claim": "Key synthesized claim or thesis statements",
      "supporting_sources": [
        {
          "title": "Source title (must match a verified source title exactly)",
          "url": "Source URL"
        }
      ],
      "opposing_sources": [
        {
          "title": "Source title (must match a verified source title exactly)",
          "url": "Source URL"
        }
      ],
      "confidence": 0.85
    }
  ],
  "conclusion": "Final wrap-up paragraph"
}`
    : `You are a research report writer. Write a structured report based on verified web sources. Use additional PDF context only as user background context and never as external citation.
You MUST ground your writing strictly in the provided sources list (do not invent paper names, facts, or URLs).
You MUST include sections on contradiction detection, research gap discovery, and an evidence graph mapping claims to sources.

Return ONLY JSON with this structure:
{
  "title": "Report title",
  "executive_summary": "A detailed 1-2 paragraph summary that synthesizes the findings to directly and comprehensively answer the user's main research query.",
  "key_findings": [
    { 
      "finding": "Finding text", 
      "evidence": "verbatim evidence snippet quote supporting this finding",
      "source_index": 1, 
      "source_title": "title", 
      "source_url": "url" 
    }
  ],
  "contradictions": [
    {
      "topic": "The issue or claim where sources differ or disagree",
      "consensus": "Summary of consensus or status of disagreement",
      "supporting_views": [
        {
          "view": "Description of the supporting view/arguments",
          "source_indices": [1]
        }
      ],
      "opposing_views": [
        {
          "view": "Description of the opposing view/arguments",
          "source_indices": [2]
        }
      ],
      "unresolved_questions": "Remaining open questions"
    }
  ],
  "research_gaps": [
    {
      "gap": "Description of the unsolved research gap or missing info",
      "details": "Details on why it is unsolved or what is missing from the literature"
    }
  ],
  "evidence_graph": [
    {
      "claim": "Key synthesized claim or thesis statements",
      "supporting_sources": [
        {
          "title": "Source title (must match a verified source title exactly)",
          "url": "Source URL"
        }
      ],
      "opposing_sources": [
        {
          "title": "Source title (must match a verified source title exactly)",
          "url": "Source URL"
        }
      ],
      "confidence": 0.85
    }
  ],
  "conclusion": "1-2 sentence conclusion"
}`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: `Research Query: ${query}\n\nVerified Sources:\n${sourcesText}${additionalContext}`
        }
      ],
      temperature: 0.2,
      max_tokens: isDeep ? 4000 : 2000,
      response_format: {
        type: "json_object"
      }
    });

    let text = response.choices[0].message.content;
    let report = safeJsonParse(text, fallbackReport);

    report = formatReportSources(report, verifiedSources, goodSources, flaggedSources, query, pdfContext, pdfMeta);

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
    let report = { ...fallbackReport };
    report = formatReportSources(report, verifiedSources, goodSources, flaggedSources, query, pdfContext, pdfMeta);

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