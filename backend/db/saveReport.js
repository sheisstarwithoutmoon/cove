import { db } from "./index.js";
import { reports, sources, claims, metrics } from "./schema.js";

export async function saveReport(uid, query, report) {
  try {

    //
    // REPORT
    //
    const [reportRow] = await db
      .insert(reports)
      .values({
        uid,
        query,
        title: report.title,
        reportJson: JSON.stringify(report)
      })
      .returning();
      
    console.log("REPORT INSERTED");
    console.log(reportRow);
    const reportId = reportRow.id;

    //
    // SOURCES
    //
    const sourceValues = (report.sources || []).map((source) => ({
      reportId,
      title: source.title,
      url: source.url,
      confidence: source.confidence,
      sourceType: source.source_type,
      publishedDate:
        source.published_date
          ? new Date(source.published_date)
          : null
    }));

    const insertedSources =
      sourceValues.length > 0
        ? await db
            .insert(sources)
            .values(sourceValues)
            .returning()
        : [];

    //
    // Build URL → sourceId map
    //
    const sourceIdMap = {};

    insertedSources.forEach((row) => {
      sourceIdMap[row.url] = row.id;
    });

    //
    // CLAIMS
    //
    const claimValues = [];

    for (const source of report.sources || []) {

      const sourceId = sourceIdMap[source.url];

      for (const claim of source.claims || []) {

        claimValues.push({
          claimId: claim.id,
          sourceId,
          text: claim.text,
          status: claim.status,
          confidence: claim.confidence,
          evidence: claim.evidence
        });

      }
    }

    if (claimValues.length > 0) {

      await db
        .insert(claims)
        .values(claimValues);

    }

    //
    // METRICS
    //
    const allClaims =
      report.sources?.flatMap(
        s => s.claims || []
      ) || [];

    const supportedClaims =
      allClaims.filter(
        c =>
          c.status === "SUPPORTED" ||
          c.status === "PARTIALLY_SUPPORTED"
      );

    await db.insert(metrics).values({
      reportId,

      sourceCount:
        report.sources?.length || 0,

      claimCount:
        allClaims.length,

      supportedClaimCount:
        supportedClaims.length,

      citationCoverage:
        allClaims.length
          ? supportedClaims.length / allClaims.length
          : 0
    });

    return reportId;

  } catch (err) {
    console.error("[Postgres Save Report]");
    console.error(err);
    return null;
  }
}