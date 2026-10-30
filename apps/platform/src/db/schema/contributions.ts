import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { work, workVersion } from "./content";

export const contributionType = pgEnum("contribution_type", [
  "fan_art",
  "translation",
  "adaptation"
]);

export const contributionStatus = pgEnum("contribution_status", [
  "pending",
  "approved",
  "rejected",
  "stale"
]);

export const contribution = pgTable("contribution", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => work.id, { onDelete: "cascade" }),
  sourceVersionId: text("source_version_id").notNull().references(() => workVersion.id, { onDelete: "restrict" }),
  contributorUserId: text("contributor_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  type: contributionType("type").notNull(),
  commercialIntent: boolean("commercial_intent").notNull().default(false),
  title: text("title").notNull(),
  content: text("content").notNull(),
  contentHash: text("content_hash").notNull(),
  acknowledgedPermissionHash: text("acknowledged_permission_hash").notNull(),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }).notNull(),
  status: contributionStatus("status").notNull().default("pending"),
  creatorFeedback: text("creator_feedback"),
  decidedBy: text("decided_by").references(() => user.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("contribution_work_status_created_idx").on(table.workId, table.status, table.createdAt),
  index("contribution_user_created_idx").on(table.contributorUserId, table.createdAt),
  index("contribution_source_version_idx").on(table.sourceVersionId)
]);