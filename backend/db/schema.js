import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  real
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";
//
// REPORTS
//
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),

  uid: text("uid").notNull(),

  query: text("query").notNull(),

  title: text("title"),

  createdAt: timestamp("created_at", {mode: "date"}).defaultNow(),
});

//
// SOURCES
//
export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),

  reportId: uuid("report_id")
    .references(() => reports.id, {
      onDelete: "cascade",
    })
    .notNull(),

  title: text("title"),

  url: text("url").notNull(),

  confidence: text("confidence"),

  sourceType: text("source_type"),

  publishedDate: timestamp("published_date", {mode: "date"}),
});

//
// CLAIMS
//
export const claims = pgTable("claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  claimId: text("claim_id"),

  sourceId: uuid("source_id")
    .references(() => sources.id, {
      onDelete: "cascade",
    })
    .notNull(),

  text: text("text"),

  status: text("status"),

  confidence: text("confidence"),

  evidence: text("evidence"),
});

//
// METRICS
//
export const metrics = pgTable("metrics", {
  id: uuid("id").defaultRandom().primaryKey(),

  reportId: uuid("report_id")
    .references(() => reports.id, {
      onDelete: "cascade",
    })
    .notNull()
    .unique(),

  sourceCount: integer("source_count"),

  claimCount: integer("claim_count"),

  supportedClaimCount: integer("supported_claim_count"),

  citationCoverage: real("citation_coverage"),
});

export const reportsRelations = relations(reports, ({ many, one }) => ({
  sources: many(sources),

  metrics: one(metrics, {
    fields: [reports.id],
    references: [metrics.reportId],
  }),
}));


export const sourcesRelations = relations(sources, ({ one, many }) => ({
  report: one(reports, {
    fields: [sources.reportId],
    references: [reports.id],
  }),

  claims: many(claims),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  source: one(sources, {
    fields: [claims.sourceId],
    references: [sources.id],
  }),
}));

export const metricsRelations = relations(metrics, ({ one }) => ({
  report: one(reports, {
    fields: [metrics.reportId],
    references: [reports.id],
  }),
}));