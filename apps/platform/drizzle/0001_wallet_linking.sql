CREATE TABLE IF NOT EXISTS "wallet_challenge" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "nonce" text NOT NULL,
  "message" text NOT NULL,
  "chain_id" integer NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "consumed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_challenge_nonce_unique" ON "wallet_challenge" ("nonce");
CREATE INDEX IF NOT EXISTS "wallet_challenge_user_created_idx" ON "wallet_challenge" ("user_id", "created_at");

CREATE TABLE IF NOT EXISTS "linked_wallet" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "chain_id" integer NOT NULL,
  "address" text NOT NULL,
  "address_lower" text NOT NULL,
  "verified_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "linked_wallet_chain_address_unique" ON "linked_wallet" ("chain_id", "address_lower");
CREATE UNIQUE INDEX IF NOT EXISTS "linked_wallet_user_chain_unique" ON "linked_wallet" ("user_id", "chain_id");
CREATE INDEX IF NOT EXISTS "linked_wallet_user_idx" ON "linked_wallet" ("user_id");
