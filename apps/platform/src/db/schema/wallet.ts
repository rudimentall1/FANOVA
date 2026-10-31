import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { session, user } from "./auth";

export const walletChallenge = pgTable("wallet_challenge", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull().references(() => session.id, { onDelete: "cascade" }),
  nonce: text("nonce").notNull(),
  message: text("message").notNull(),
  chainId: integer("chain_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("wallet_challenge_nonce_unique").on(table.nonce),
  index("wallet_challenge_user_created_idx").on(table.userId, table.createdAt)
]);

export const linkedWallet = pgTable("linked_wallet", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  chainId: integer("chain_id").notNull(),
  address: text("address").notNull(),
  addressLower: text("address_lower").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("linked_wallet_chain_address_unique").on(table.chainId, table.addressLower),
  uniqueIndex("linked_wallet_user_chain_unique").on(table.userId, table.chainId),
  index("linked_wallet_user_idx").on(table.userId)
]);
