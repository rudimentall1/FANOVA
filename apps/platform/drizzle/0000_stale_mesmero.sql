CREATE TYPE "public"."app_role" AS ENUM('reader', 'creator', 'moderator', 'admin');--> statement-breakpoint
CREATE TYPE "public"."work_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."contribution_status" AS ENUM('pending', 'approved', 'rejected', 'stale');--> statement-breakpoint
CREATE TYPE "public"."contribution_type" AS ENUM('fan_art', 'translation', 'adaptation');--> statement-breakpoint
CREATE TYPE "public"."creator_request_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."provenance_anchor_status" AS ENUM('local', 'pending', 'mainnet', 'partially_verified', 'stale', 'failed');--> statement-breakpoint
CREATE TYPE "public"."provenance_operation_type" AS ENUM('work_version', 'contribution', 'creator_decision');--> statement-breakpoint
CREATE TABLE "user_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_role" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"role" "app_role" DEFAULT 'reader' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"assigned_by" text
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"password" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"slug" text NOT NULL,
	"status" "work_status" DEFAULT 'draft' NOT NULL,
	"current_version_id" text,
	"draft_version_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "work_version" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"synopsis" text NOT NULL,
	"body" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"source_hash" text NOT NULL,
	"permission_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution" (
	"id" text PRIMARY KEY NOT NULL,
	"work_id" text NOT NULL,
	"source_version_id" text NOT NULL,
	"contributor_user_id" text NOT NULL,
	"type" "contribution_type" NOT NULL,
	"commercial_intent" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" text NOT NULL,
	"acknowledged_permission_hash" text NOT NULL,
	"acknowledged_at" timestamp with time zone NOT NULL,
	"status" "contribution_status" DEFAULT 'pending' NOT NULL,
	"creator_feedback" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_access_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"portfolio_url" text,
	"statement" text NOT NULL,
	"status" "creator_request_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "linked_wallet" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chain_id" integer NOT NULL,
	"address" text NOT NULL,
	"address_lower" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"nonce" text NOT NULL,
	"message" text NOT NULL,
	"chain_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_unlink_challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"nonce" text NOT NULL,
	"message" text NOT NULL,
	"chain_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provenance_anchor" (
	"id" text PRIMARY KEY NOT NULL,
	"idempotency_key" text NOT NULL,
	"operation_type" "provenance_operation_type" NOT NULL,
	"status" "provenance_anchor_status" DEFAULT 'local' NOT NULL,
	"actor_user_id" text NOT NULL,
	"expected_signer_address" text NOT NULL,
	"chain_id" integer NOT NULL,
	"contract_address" text NOT NULL,
	"work_version_id" text,
	"contribution_id" text,
	"source_hash" text,
	"permission_hash" text,
	"contribution_hash" text,
	"transaction_hash" text,
	"block_number" bigint,
	"transaction_index" integer,
	"log_index" integer,
	"event_name" text,
	"verification_snapshot" jsonb,
	"submitted_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provenance_anchor_entity_shape_check" CHECK ((
    ("provenance_anchor"."operation_type" = 'work_version' AND "provenance_anchor"."work_version_id" IS NOT NULL AND "provenance_anchor"."contribution_id" IS NULL)
    OR
    ("provenance_anchor"."operation_type" IN ('contribution', 'creator_decision') AND "provenance_anchor"."contribution_id" IS NOT NULL AND "provenance_anchor"."work_version_id" IS NULL)
  )),
	CONSTRAINT "provenance_anchor_chain_id_check" CHECK ("provenance_anchor"."chain_id" = 1868),
	CONSTRAINT "provenance_anchor_tx_fields_check" CHECK ((
    "provenance_anchor"."transaction_hash" IS NULL
    OR ("provenance_anchor"."submitted_at" IS NOT NULL AND "provenance_anchor"."expected_signer_address" <> '')
  ))
);
--> statement-breakpoint
ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_assigned_by_user_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work" ADD CONSTRAINT "work_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_version" ADD CONSTRAINT "work_version_work_id_work_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."work"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_work_id_work_id_fk" FOREIGN KEY ("work_id") REFERENCES "public"."work"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_source_version_id_work_version_id_fk" FOREIGN KEY ("source_version_id") REFERENCES "public"."work_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_contributor_user_id_user_id_fk" FOREIGN KEY ("contributor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_access_request" ADD CONSTRAINT "creator_access_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_access_request" ADD CONSTRAINT "creator_access_request_reviewed_by_user_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_wallet" ADD CONSTRAINT "linked_wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_challenge" ADD CONSTRAINT "wallet_challenge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_challenge" ADD CONSTRAINT "wallet_challenge_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_unlink_challenge" ADD CONSTRAINT "wallet_unlink_challenge_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_unlink_challenge" ADD CONSTRAINT "wallet_unlink_challenge_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_unlink_challenge" ADD CONSTRAINT "wallet_unlink_challenge_wallet_id_linked_wallet_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."linked_wallet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance_anchor" ADD CONSTRAINT "provenance_anchor_actor_user_id_user_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance_anchor" ADD CONSTRAINT "provenance_anchor_work_version_id_work_version_id_fk" FOREIGN KEY ("work_version_id") REFERENCES "public"."work_version"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provenance_anchor" ADD CONSTRAINT "provenance_anchor_contribution_id_contribution_id_fk" FOREIGN KEY ("contribution_id") REFERENCES "public"."contribution"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_profile_handle_unique" ON "user_profile" USING btree ("handle");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_user_role_unique" ON "user_role" USING btree ("user_id","role");--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_unique" ON "account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE UNIQUE INDEX "session_token_unique" ON "session" USING btree ("token");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "work_slug_unique" ON "work" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "work_owner_status_idx" ON "work" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE INDEX "work_publication_idx" ON "work" USING btree ("status","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "work_version_number_unique" ON "work_version" USING btree ("work_id","version_number");--> statement-breakpoint
CREATE INDEX "work_version_work_id_idx" ON "work_version" USING btree ("work_id");--> statement-breakpoint
CREATE INDEX "contribution_work_status_created_idx" ON "contribution" USING btree ("work_id","status","created_at");--> statement-breakpoint
CREATE INDEX "contribution_user_created_idx" ON "contribution" USING btree ("contributor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "contribution_source_version_idx" ON "contribution" USING btree ("source_version_id");--> statement-breakpoint
CREATE INDEX "creator_request_user_status_idx" ON "creator_access_request" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "creator_request_status_created_idx" ON "creator_access_request" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_request_one_pending_per_user" ON "creator_access_request" USING btree ("user_id") WHERE "creator_access_request"."status" = 'pending';--> statement-breakpoint
CREATE UNIQUE INDEX "linked_wallet_chain_address_unique" ON "linked_wallet" USING btree ("chain_id","address_lower");--> statement-breakpoint
CREATE UNIQUE INDEX "linked_wallet_user_chain_unique" ON "linked_wallet" USING btree ("user_id","chain_id");--> statement-breakpoint
CREATE INDEX "linked_wallet_user_idx" ON "linked_wallet" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_challenge_nonce_unique" ON "wallet_challenge" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "wallet_challenge_user_created_idx" ON "wallet_challenge" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "wallet_unlink_challenge_nonce_unique" ON "wallet_unlink_challenge" USING btree ("nonce");--> statement-breakpoint
CREATE INDEX "wallet_unlink_challenge_user_created_idx" ON "wallet_unlink_challenge" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "provenance_anchor_idempotency_unique" ON "provenance_anchor" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "provenance_anchor_event_unique" ON "provenance_anchor" USING btree ("chain_id","transaction_hash","log_index") WHERE "provenance_anchor"."transaction_hash" IS NOT NULL AND "provenance_anchor"."log_index" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "provenance_anchor_work_version_idx" ON "provenance_anchor" USING btree ("work_version_id","created_at");--> statement-breakpoint
CREATE INDEX "provenance_anchor_contribution_idx" ON "provenance_anchor" USING btree ("contribution_id","created_at");--> statement-breakpoint
CREATE INDEX "provenance_anchor_actor_status_idx" ON "provenance_anchor" USING btree ("actor_user_id","status","created_at");