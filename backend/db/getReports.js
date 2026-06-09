import { db } from "./index.js";
import { reports } from "./schema.js";

import {
  eq,
  desc
} from "drizzle-orm";

export async function getReports(uid) {

  try {

    const rows =
      await db.query.reports.findMany({

        where:
          eq(reports.uid, uid),

        orderBy:
          desc(reports.createdAt),

        limit: 20,

        with: {

          sources: {

            with: {

              claims: true

            }

          },

          metrics: true

        }

      });

    return rows.map((report) => ({

      id: report.id,

      uid,

      query: report.query,

      created_at: report.createdAt,

      report: {

        title: report.title,

        sources:
          report.sources.map((source) => ({

            url: source.url,

            title: source.title,

            confidence: source.confidence,

            source_type:
              source.sourceType,

            published_date:
              source.publishedDate,

            claims: source.claims.map(claim => ({
              id: claim.claimId,
              text: claim.text,
              status: claim.status,
              confidence: claim.confidence,
              evidence: claim.evidence
            }))
          })),

        sourceCount:
          report.metrics?.sourceCount || 0,

        claimCount:
          report.metrics?.claimCount || 0,

        supportedClaimCount:
          report.metrics?.supportedClaimCount || 0,

        citationCoverage:
          report.metrics?.citationCoverage || 0

      }

    }));

  }
  catch (err) {

    console.error(
      "[Postgres Get Reports]",
      err.message
    );

    return [];

  }

}