import { sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const creatorRequestStatus = pgEnum("creator_request_status", [
  "pending",
  "approved",
  "rejected"
]);

export const creatorAccessRequest = pgTable("creator_access_request", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  portfolioUrl: text("portfolio_url"),
  statement: text("statement").notNull(),
  status: creatorRequestStatus("status").notNull().default("pending"),
  reviewedBy: text("reviewed_by").references(() => user.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index("creator_request_user_status_idx").on(table.userId, table.status),
  index("creator_request_status_created_idx").on(table.status, table.createdAt),
  uniqueIndex("creator_request_one_pending_per_user")
    .on(table.userId)
    .where(sql`${table.status} = 'pending'`)
]);