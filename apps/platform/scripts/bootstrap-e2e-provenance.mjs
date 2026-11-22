import { randomUUID } from "node:crypto";
import pg from "pg";
import { encodeAbiParameters, keccak256, toBytes } from "viem";

const { Pool } = pg;
const [mode, ...args] = process.argv.slice(2);
const connectionString = process.env.DATABASE_URL;
const contractAddress = process.env.FANOVA_PROVENANCE_CONTRACT;
const databaseUrl = connectionString ? new URL(connectionString) : null;
const isLocalE2eDatabase =
  process.env.GITHUB_ACTIONS === "true" &&
  process.env.FANOVA_E2E_ADMIN_BOOTSTRAP === "true" &&
  databaseUrl &&
  ["localhost", "127.0.0.1"].includes(databaseUrl.hostname) &&
  databaseUrl.pathname === "/fanova";

if (!isLocalE2eDatabase || !contractAddress || !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
  throw new Error("Provenance bootstrap is restricted to the isolated FANOVA GitHub Actions database and a configured test contract.");
}

const pool = new Pool({ connectionString });
const chainId = 1868;
const blockNumber = "30000001";

function storyIdentity(workId, signer) {
  const creatorSalt = keccak256(toBytes(`fanova:work:${workId}`));
  return keccak256(encodeAbiParameters(
    [{ type: "address" }, { type: "bytes32" }],
    [signer, creatorSalt]
  ));
}

function contributionIdentity(contributionId) {
  return keccak256(toBytes(`fanova:contribution:${contributionId}`));
}

async function seedStory() {
  const [slug, creatorEmail, signer] = args;
  if (!slug || !creatorEmail || !/^0x[0-9a-fA-F]{40}$/.test(signer ?? "")) {
    throw new Error("seed-story requires slug, creator email, and creator signer address.");
  }

  const result = await pool.query(
    `SELECT w.id AS work_id, w."owner_user_id", w."current_version_id",
            v.version_number, v.source_hash, v.permission_hash, u.id AS creator_user_id
       FROM "work" w
       JOIN work_version v ON v.id = w."current_version_id"
       JOIN "user" u ON u.id = w."owner_user_id"
      WHERE w.slug = $1 AND u.email = $2 AND w.status = 'published'
      LIMIT 1`,
    [slug, creatorEmail]
  );
  if (result.rowCount !== 1) throw new Error("Published E2E Story and creator account were not found.");
  const row = result.rows[0];
  const now = new Date();
  const storyId = storyIdentity(row.work_id, signer);
  const txHash = `0x${"a".repeat(64)}`;
  const expectedHashes = {
    sourceHash: `0x${row.source_hash}`,
    permissionHash: `0x${row.permission_hash}`
  };
  await pool.query(
    `INSERT INTO linked_wallet
       (id, user_id, chain_id, address, address_lower, verified_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (user_id, chain_id) DO UPDATE
       SET address = EXCLUDED.address,
           address_lower = EXCLUDED.address_lower,
           verified_at = EXCLUDED.verified_at`,
    [randomUUID(), row.creator_user_id, chainId, signer, signer.toLowerCase(), now]
  );
  await pool.query(
    `INSERT INTO provenance_anchor
       (id, idempotency_key, operation_type, status, actor_user_id, expected_signer_address,
        chain_id, contract_address, work_version_id, source_hash, permission_hash,
        transaction_hash, block_number, transaction_index, log_index, event_name,
        verification_snapshot, submitted_at, verified_at, created_at, updated_at)
     VALUES ($1, $2, 'work_version', 'mainnet', $3, $4, $5, $6, $7, $8, $9,
             $10, $11, 0, 0, 'StoryVersionRegistered', $12::jsonb, $13, $13, $13, $13)`,
    [
      randomUUID(), randomUUID(), row.creator_user_id, signer, chainId, contractAddress,
      row.current_version_id, row.source_hash, row.permission_hash, txHash, blockNumber,
      JSON.stringify({
        checkedAt: now.toISOString(),
        chainId,
        contractAddress,
        transactionHash: txHash,
        blockNumber,
        eventName: "StoryVersionRegistered",
        sourceVersion: 1,
        permissionVersion: 1,
        expectedSigner: signer,
        observedSigner: signer,
        expectedEntityId: storyId,
        observedEntityId: storyId,
        expectedHashes,
        observedHashes: expectedHashes,
        confirmations: 1
      }),
      now
    ]
  );
  process.stdout.write(JSON.stringify({ storyId, creatorSigner: signer }) + "\n");
}

async function markContributionMainnet() {
  const [contributionId] = args;
  if (!contributionId) throw new Error("mark-contribution requires a contribution ID.");
  const result = await pool.query(
    `SELECT a.id, a.expected_signer_address, a.actor_user_id, a.source_hash,
            a.permission_hash, a.contribution_hash, c.content_hash, c.acknowledged_permission_hash,
            v.source_hash AS version_source_hash
       FROM provenance_anchor a
       JOIN contribution c ON c.id = a.contribution_id
       JOIN work_version v ON v.id = c.source_version_id
      WHERE a.contribution_id = $1 AND a.operation_type = 'contribution'
      LIMIT 1`,
    [contributionId]
  );
  if (result.rowCount !== 1) throw new Error("Contribution intent was not found.");
  const row = result.rows[0];
  const now = new Date();
  const txHash = `0x${"b".repeat(64)}`;
  const entityId = contributionIdentity(contributionId);
  const expectedHashes = {
    sourceHash: `0x${row.version_source_hash}`,
    permissionHash: `0x${row.acknowledged_permission_hash}`,
    contributionHash: `0x${row.content_hash}`
  };
  await pool.query(
    `UPDATE provenance_anchor
        SET status = 'mainnet',
            transaction_hash = $2,
            block_number = $3,
            transaction_index = 0,
            log_index = 0,
            event_name = 'ContributionRegistered',
            verification_snapshot = $4::jsonb,
            submitted_at = COALESCE(submitted_at, $5),
            verified_at = $5,
            updated_at = $5
      WHERE id = $1`,
    [
      row.id, txHash, blockNumber,
      JSON.stringify({
        checkedAt: now.toISOString(),
        chainId,
        contractAddress,
        transactionHash: txHash,
        blockNumber,
        eventName: "ContributionRegistered",
        expectedSigner: row.expected_signer_address,
        observedSigner: row.expected_signer_address,
        expectedEntityId: entityId,
        observedEntityId: entityId,
        expectedHashes,
        observedHashes: expectedHashes,
        confirmations: 1
      }),
      now
    ]
  );
  process.stdout.write(JSON.stringify({ contributionId, entityId }) + "\n");
}

async function linkUser() {
  const [email, address] = args;
  if (!email || !/^0x[0-9a-fA-F]{40}$/.test(address ?? "")) {
    throw new Error("link-user requires an account email and wallet address.");
  }
  const account = await pool.query('SELECT id FROM "user" WHERE email = $1 LIMIT 1', [email]);
  if (account.rowCount !== 1) throw new Error("E2E account was not found.");
  const now = new Date();
  await pool.query(
    `INSERT INTO linked_wallet
       (id, user_id, chain_id, address, address_lower, verified_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $6)
     ON CONFLICT (user_id, chain_id) DO UPDATE
       SET address = EXCLUDED.address,
           address_lower = EXCLUDED.address_lower,
           verified_at = EXCLUDED.verified_at`,
    [randomUUID(), account.rows[0].id, chainId, address, address.toLowerCase(), now]
  );
  process.stdout.write(JSON.stringify({ email, address }) + "\n");
}

async function unlinkUser() {
  const [email] = args;
  if (!email) throw new Error("unlink-user requires an account email.");
  const result = await pool.query(
    `DELETE FROM linked_wallet
      WHERE user_id = (SELECT id FROM "user" WHERE email = $1)
        AND chain_id = $2
      RETURNING id`,
    [email, chainId]
  );
  process.stdout.write(JSON.stringify({ email, deletedWalletRows: result.rowCount }) + "\n");
}

try {
  if (mode === "seed-story") await seedStory();
  else if (mode === "mark-contribution-mainnet") await markContributionMainnet();
  else if (mode === "link-user") await linkUser();
  else if (mode === "unlink-user") await unlinkUser();
  else throw new Error("Supported modes: seed-story, mark-contribution-mainnet, link-user, unlink-user.");
} finally {
  await pool.end();
}
