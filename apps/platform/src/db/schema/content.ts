import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export type WorkPermissions = {
  fanArt: boolean;
  translations: boolean;
  adaptations: boolean;
  commercialUse: boolean;
  attributionRequired: boolean;
  additionalTerms: string;
};

export const workStatus = pgEnum("work_status", ["draft", "published", "archived"]);

export const work = pgTable("work", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  slug: text("slug").notNull(),
  status: workStatus("status").notNull().default("draft"),
  currentVersionId: text("current_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true })
}, (table) => [
  uniqueIndex("work_slug_unique").on(table.slug),
  index("work_owner_status_idx").on(table.ownerUserId, table.status),
  index("work_publication_idx").on(table.status, table.publishedAt)
]);

export const workVersion = pgTable("work_version", {
  id: text("id").primaryKey(),
  workId: text("work_id").notNull().references(() => work.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  title: text("title").notNull(),
  synopsis: text("synopsis").notNull(),
  body: text("body").notNull(),
  permissions: jsonb("permissions").$type<WorkPermissions>().notNull(),
  sourceHash: text("source_hash").notNull(),
  permissionHash: text("permission_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("work_version_number_unique").on(table.workId, table.versionNumber),
  index("work_version_work_id_idx").on(table.workId)
]);