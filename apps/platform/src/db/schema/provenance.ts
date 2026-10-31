import { sql } from "drizzle-orm";
import {
  bigint,
  check,
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
import { contribution } from "./contributions";
import { workVersion } from "./content";

export const provenanceOperationType = pgEnum("provenance_operation_type", [
  "work_version",
  "contribution",
  "creator_decision"
]);

export const provenanceAnchorStatus = pgEnum("provenance_anchor_status", [
  "local",
  "pending",
  "mainnet",
  "partially_verified",
  "stale",
  "failed"
]);

export type ProvenanceVerificationSnapshot = {
  checkedAt: string;
  chainId: number;
  contractAddress: string;
  transactionHash?: string;
  blockNumber?: string;
  transactionIndex?: number;
  logIndex?: number;
  eventName?: string;
  expectedSigner?: string;
  observedSigner?: string;
  expectedEntityId?: string;
  observedEntityId?: string;
  expectedHashes?: Record<string, string>;
  observedHashes?: Record<string, string>;
  confirmations?: number;
  failureCode?: string;
  notes?: string[];
};

export const provenanceAnchor = pgTable("provenance_anchor", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull(),
  operationType: provenanceOperationType("operation_type").notNull(),
  status: provenanceAnchorStatus("status").notNull().default("local"),
  actorUserId: text("actor_user_id").notNull().references(() => user.id, { onDelete: "restrict" }),
  expectedSignerAddress: text("expected_signer_address").notNull(),
  chainId: integer("chain_id").notNull(),
  contractAddress: text("contract_address").notNull(),
  workVersionId: text("work_version_id").references(() => workVersion.id, { onDelete: "restrict" }),
  contributionId: text("contribution_id").references(() => contribution.id, { onDelete: "restrict" }),
  sourceHash: text("source_hash"),
  permissionHash: text("permission_hash"),
  contributionHash: text("contribution_hash"),
  transactionHash: text("transaction_hash"),
  blockNumber: bigint("block_number", { mode: "bigint" }),
  transactionIndex: integer("transaction_index"),
  logIndex: integer("log_index"),
  eventName: text("event_name"),
  verificationSnapshot: jsonb("verification_snapshot").$type<ProvenanceVerificationSnapshot>(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("provenance_anchor_idempotency_unique").on(table.idempotencyKey),
  uniqueIndex("provenance_anchor_event_unique")
    .on(table.chainId, table.transactionHash, table.logIndex)
    .where(sql`${table.transactionHash} IS NOT NULL AND ${table.logIndex} IS NOT NULL`),
  index("provenance_anchor_work_version_idx").on(table.workVersionId, table.createdAt),
  index("provenance_anchor_contribution_idx").on(table.contributionId, table.createdAt),
  index("provenance_anchor_actor_status_idx").on(table.actorUserId, table.status, table.createdAt),
  check("provenance_anchor_entity_shape_check", sql`(
    (${table.operationType} = 'work_version' AND ${table.workVersionId} IS NOT NULL AND ${table.contributionId} IS NULL)
    OR
    (${table.operationType} IN ('contribution', 'creator_decision') AND ${table.contributionId} IS NOT NULL AND ${table.workVersionId} IS NULL)
  )`),
  check("provenance_anchor_chain_id_check", sql`${table.chainId} = 1868`),
  check("provenance_anchor_tx_fields_check", sql`(
    ${table.transactionHash} IS NULL
    OR (${table.submittedAt} IS NOT NULL AND ${table.expectedSignerAddress} <> '')
  )`)
]);
