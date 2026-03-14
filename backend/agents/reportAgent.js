import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function reportAgent(query, verifiedSources, pdfContext = "", pdfMeta = null) {
  const goodSources = verifiedSources.filter((s) => s.confidence !== "low");
  const flaggedSources = verifiedSources.filter((s) => s.confidence === "low");

  const sourcesText = goodSources
    .map((s, i) => {
      const claims = s.claims.filter((c) => c.supported).map((c) => `  - ${c.claim}`).join("\n");
      return `[${i + 1}] ${s.title} (${s.url})\n${claims}`;
    })
    .join("\n\n");

  const additionalContext = pdfContext
    ? `\n\nAdditional user-provided PDF context (supplementary only, do not cite as external source):\n${pdfContext.slice(0, 2500)}`
    : "";

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a research report writer. Write a structured report based on verified web sources. Use additional PDF context only as user background context and never as external citation.
Return ONLY JSON with this structure:
{
  "title": "Report title",
  "executive_summary": "2-3 sentence overview",
  "key_findings": [
    { "finding": "Finding text", "source_index": 1, "source_title": "title", "source_url": "url" }
  ],
  "conclusion": "1-2 sentence conclusion"
}`,
        },
        {
          role: "user",
          content: `Research Query: ${query}\n\nVerified Sources:\n${sourcesText}${additionalContext}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    let text = response.choices[0].message.content.trim().replace(/```json|```/g, "").trim();
    const report = JSON.parse(text);

    report.sources = verifiedSources.map((s) => ({
      url: s.url,
      title: s.title,
      confidence: s.confidence,
      urlAlive: s.urlAlive,
      claimsCount: s.claims.filter((c) => c.supported).length,
    }));
    report.verifiedCount = goodSources.length;
    report.flaggedCount = flaggedSources.length;
    report.query = query;
    report.pdfContextUsed = Boolean(pdfContext);
    report.pdfMeta = pdfMeta || null;

    return report;
  } catch (e) {
    console.error("Report agent error:", e.message);
    return {
      title: `Research Report: ${query}`,
      executive_summary: "Research completed with verified sources.",
      key_findings: goodSources.flatMap((s, i) =>
        s.claims
          .filter((c) => c.supported)
          .slice(0, 2)
          .map((c) => ({ finding: c.claim, source_index: i + 1, source_title: s.title, source_url: s.url }))
      ),
      conclusion: "See sources for full details.",
      sources: verifiedSources.map((s) => ({ url: s.url, title: s.title, confidence: s.confidence, urlAlive: s.urlAlive, claimsCount: 1 })),
      verifiedCount: goodSources.length,
      flaggedCount: flaggedSources.length,
      pdfContextUsed: Boolean(pdfContext),
      pdfMeta: pdfMeta || null,
      query,
    };
  }
}