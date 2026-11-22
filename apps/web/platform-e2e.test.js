import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const baseUrl = process.env.FANOVA_PLATFORM_URL ?? "http://127.0.0.1:3000";
const logPath = process.env.FANOVA_PLATFORM_LOG ?? "/tmp/fanova-platform.log";
const platformDir = process.env.FANOVA_PLATFORM_DIR;
const adminBootstrap = process.env.FANOVA_ADMIN_BOOTSTRAP_SCRIPT;
const provenanceBootstrap = process.env.FANOVA_E2E_PROVENANCE_BOOTSTRAP_SCRIPT;
const password = "FANOVA-E2E-Password-2026!";
const e2eCreatorSigner = "0x1111111111111111111111111111111111111111";
const e2eContributorSigner = "0x2222222222222222222222222222222222222222";

function bootstrapProvenance(mode, ...args) {
  execFileSync("node", [provenanceBootstrap, mode, ...args], { cwd: platformDir, env: process.env, stdio: "pipe" });
}

function readLog() {
  try { return readFileSync(logPath, "utf8"); } catch { return ""; }
}

async function waitForMailLink(kind, offset) {
  const marker = `[FANOVA local mail sink] ${kind} `;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const delta = readLog().slice(offset);
    const index = delta.indexOf(marker);
    if (index >= 0) {
      const value = delta.slice(index + marker.length).split(/\s/)[0].trim();
      if (value.startsWith("http")) return value;
    }
    await delay(250);
  }
  throw new Error(`Timed out waiting for local ${kind} email link. Server log:\n${readLog().slice(-5000)}`);
}

async function registerAndVerify(context, name, email, callbackURL = "/dashboard") {
  const page = await context.newPage();
  const before = readLog().length;
  await page.goto(`${baseUrl}/sign-up?callbackURL=${encodeURIComponent(callbackURL)}`);
  await page.getByLabel("Display name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.getByRole("status").waitFor({ timeout: 15_000 });
  const verificationUrl = await waitForMailLink("verification", before);
  await page.goto(verificationUrl);
  await page.waitForURL((url) => url.pathname === callbackURL, { timeout: 30_000 });
  return page;
}

async function submitContribution(page, slug, title, text) {
  await page.goto(`${baseUrl}/works/${slug}/contribute`);
  await page.getByLabel("Contribution type").selectOption("fan_art");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Your contribution").fill(text);
  await page.getByLabel("I have read and acknowledge the current permitted-use rules.").check();
  const submissionResponse = page.waitForResponse((response) =>
    response.url().includes(`/api/works/${slug}/contributions`) &&
    response.request().method() === "POST"
  );
  await page.getByRole("button", { name: "Submit contribution" }).click();
  const submitted = await submissionResponse;
  assert.equal(submitted.status(), 201, `contribution submission failed: ${submitted.status()} ${await submitted.text()}`);
  const result = await submitted.json();
  assert.ok(result.contribution?.id, "successful submission must return its persisted contribution ID");
  await page.waitForURL(/\/dashboard\/contributions$/, { timeout: 15_000 });

  // Confirm the saved record through a fresh server-rendered request, not only client navigation state.
  await page.goto(`${baseUrl}/dashboard/contributions`);
  const listResult = await page.evaluate(async () => {
    const response = await fetch("/api/contributions");
    return { status: response.status, body: await response.json() };
  });
  assert.equal(listResult.status, 200, `contribution list API failed after fresh navigation: ${JSON.stringify(listResult)}`);
  assert.ok(
    listResult.body.contributions?.some((item) => item.id === result.contribution.id),
    `persisted contribution missing from list API: expected ${result.contribution.id}; received ${JSON.stringify(listResult.body)}`
  );
  const contributionLink = page.getByRole("link", { name: title });
  try {
    await contributionLink.waitFor({ state: "visible", timeout: 15_000 });
  } catch (error) {
    throw new Error(
      `Contribution exists in list API but is not rendered in dashboard. URL=${page.url()}; ` +
      `body=${(await page.locator("body").innerText()).slice(0, 3000)}; cause=${error.message}`
    );
  }
  await contributionLink.click();
  await page.waitForURL(/\/dashboard\/contributions\//, { timeout: 10_000 });
  return result.contribution.id;
}

test("FANOVA multi-account creator-to-contributor journey", { timeout: 300_000 }, async () => {
  assert.ok(platformDir, "FANOVA_PLATFORM_DIR must be configured");
  assert.ok(adminBootstrap, "FANOVA_ADMIN_BOOTSTRAP_SCRIPT must be configured");
  assert.ok(provenanceBootstrap, "FANOVA_E2E_PROVENANCE_BOOTSTRAP_SCRIPT must be configured");

  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext();
  const creatorContext = await browser.newContext();
  const contributorContext = await browser.newContext();

  const adminEmail = "admin@fanova.test";
  const creatorEmail = "creator@fanova.test";
  const contributorEmail = "contributor@fanova.test";

  try {
    // Register and verify the first operator, then provision the first admin out-of-band.
    const adminPage = await registerAndVerify(adminContext, "E2E Admin", adminEmail);
    execFileSync("node", [adminBootstrap], {
      cwd: platformDir,
      env: { ...process.env, ADMIN_EMAIL: adminEmail },
      stdio: "pipe"
    });
    await adminPage.goto(`${baseUrl}/admin/creator-requests`);
    await adminPage.getByRole("heading", { name: "Creator applications." }).waitFor();

    // A reader requests creator access. The user cannot assign the role directly.
    const creatorPage = await registerAndVerify(creatorContext, "E2E Creator", creatorEmail);
    const forbiddenCreate = await creatorPage.evaluate(async () => {
      const response = await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Forbidden work",
          synopsis: "This content must not be created by a reader account.",
          body: "A sufficiently long body that should still be rejected because the account does not have creator permissions. ".repeat(2),
          permissions: {
            fanArt: true, translations: true, adaptations: false,
            commercialUse: false, attributionRequired: true, additionalTerms: ""
          },
          publish: true
        })
      });
      return response.status;
    });
    assert.equal(forbiddenCreate, 403, "reader must not create works");

    await creatorPage.goto(`${baseUrl}/dashboard/creator-access`);
    await creatorPage.getByLabel("What do you create, and what would you publish on FANOVA?").fill(
      "I create original short fiction and want to publish a story world where contributors can create fan art and translations under explicit rules."
    );
    await creatorPage.getByRole("button", { name: "Submit creator application" }).click();
    await creatorPage.getByRole("heading", { name: "Application under review." }).waitFor();

    await adminPage.reload();
    const application = adminPage.locator(".request-card").filter({ hasText: creatorEmail });
    await application.waitFor({ state: "visible" });
    const approvalResponse = adminPage.waitForResponse((response) =>
      response.url().includes("/api/admin/creator-requests/") &&
      response.request().method() === "POST"
    );
    await application.getByRole("button", { name: "Approve creator" }).click();
    const approval = await approvalResponse;
    assert.equal(approval.status(), 200, `creator approval failed: ${approval.status()} ${await approval.text()}`);

    execFileSync("node", [adminBootstrap], {
      cwd: platformDir,
      env: { ...process.env, ADMIN_EMAIL: creatorEmail, ROLE_TO_CHECK: "creator" },
      stdio: "pipe"
    });

    await creatorPage.goto(`${baseUrl}/studio`);
    await creatorPage.getByRole("heading", { name: /Your stories/ }).waitFor({ timeout: 15_000 });

    // Creator publishes a work with fan art allowed, but translations and adaptations disabled.
    await creatorPage.goto(`${baseUrl}/studio/works/new`);
    await creatorPage.getByLabel("Story title").fill("E2E Story");
    await creatorPage.getByLabel("Short synopsis").fill("A test story used to verify the creator and contributor product journey.");
    await creatorPage.getByLabel("Original work").fill(
      "Mara found a map that showed a hidden orchard. Every visitor saw a different path through the trees. " +
      "The story is intentionally synthetic and exists only in the isolated CI database. ".repeat(2)
    );
    await creatorPage.getByLabel("Translations").uncheck();
    assert.equal(await creatorPage.getByLabel("Fan art").isChecked(), true, "fan art should remain enabled");
    assert.equal(await creatorPage.getByLabel("Translations").isChecked(), false, "translations should be disabled");
    await creatorPage.getByRole("button", { name: "Publish work" }).click();
    await creatorPage.waitForURL((url) => /^\/works\/[^/]+$/.test(url.pathname), { timeout: 15_000 });
    const slug = new URL(creatorPage.url()).pathname.split("/").pop();
    await creatorPage.getByRole("heading", { name: "E2E Story" }).waitFor();
    await creatorPage.getByText("Fan art allowed").waitFor();
    await creatorPage.getByText("Translations not permitted").waitFor();

    // Seed a synthetic, fully bound Story proof in the isolated CI database.
    bootstrapProvenance("seed-story", slug, creatorEmail, e2eCreatorSigner);

    // A separate reader signs up, verifies email, and returns directly to the contribution form.
    const contributorPage = await registerAndVerify(
      contributorContext,
      "E2E Contributor",
      contributorEmail,
      `/works/${slug}/contribute`
    );
    try {
      await contributorPage.getByRole("heading", { name: "E2E Story" }).waitFor({ timeout: 10_000 });
    } catch (error) {
      throw new Error(
        `Contributor did not reach the published work page. URL=${contributorPage.url()}; ` +
        `body=${(await contributorPage.locator("body").innerText()).slice(0, 2400)}; ` +
        `serverLog=${readLog().slice(-6000)}; cause=${error.message}`
      );
    }
    const contributionType = contributorPage.getByLabel("Contribution type");
    const availableTypes = await contributionType.locator("option").allTextContents();
    assert.deepEqual(
      availableTypes,
      ["Fan art"],
      `the form must reflect the creator's permission rules; URL=${contributorPage.url()}; page=${(await contributorPage.locator("body").innerText()).slice(0, 1800)}`
    );

    const firstTitle = "E2E Fan Art Submission";
    const firstId = await submitContribution(
      contributorPage,
      slug,
      firstTitle,
      "A fan-art concept showing the orchard at dusk, with the map folded beside a lantern. " +
      "The composition follows the creator's published rules and is submitted for review. ".repeat(2)
    );

    bootstrapProvenance("link-user", contributorEmail, e2eContributorSigner);

    // Recover an existing contribution intent after the contributor wallet is unlinked.
    const contributionIntentKey = "123e4567-e89b-42d3-a456-426614174001";
    const contributionIntent = await contributorPage.evaluate(async ({ id, key, signer }) => {
      const response = await fetch("/api/contributions/" + id + "/provenance/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key })
      });
      return { status: response.status, body: await response.json(), signer };
    }, { id: firstId, key: contributionIntentKey, signer: e2eContributorSigner });
    assert.equal(contributionIntent.status, 201, "initial contribution intent must be created");
    assert.equal(contributionIntent.body.anchor.expectedSignerAddress.toLowerCase(), contributionIntent.signer.toLowerCase());
    const crossAccountIntentReplay = await adminPage.evaluate(async ({ id, key }) => {
      const response = await fetch("/api/contributions/" + id + "/provenance/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key })
      });
      return response.status;
    }, { id: firstId, key: contributionIntentKey });
    assert.equal(crossAccountIntentReplay, 409, "another account must not retrieve a contributor's existing intent");

    bootstrapProvenance("unlink-user", contributorEmail);

    const replayedContributionIntent = await contributorPage.evaluate(async ({ id, key, signer }) => {
      const response = await fetch("/api/contributions/" + id + "/provenance/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key })
      });
      return { status: response.status, body: await response.json(), signer };
    }, { id: firstId, key: contributionIntentKey, signer: e2eContributorSigner });
    assert.equal(replayedContributionIntent.status, 200, "existing contribution intent must replay after unlink");
    assert.equal(replayedContributionIntent.body.idempotent, true);
    assert.equal(replayedContributionIntent.body.anchor.expectedSignerAddress.toLowerCase(), replayedContributionIntent.signer.toLowerCase());

    const newContributionIntentWithoutWallet = await contributorPage.evaluate(async (id) => {
      const response = await fetch("/api/contributions/" + id + "/provenance/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: "123e4567-e89b-42d3-a456-426614174002" })
      });
      return response.status;
    }, firstId);
    assert.equal(newContributionIntentWithoutWallet, 409, "a fresh contribution intent must still require a linked wallet");

    bootstrapProvenance("mark-contribution-mainnet", firstId);

    // The creator approves the submission and explicitly makes it public.
    await creatorPage.goto(`${baseUrl}/studio/works/${slug}/submissions`);
    const firstReview = creatorPage.locator(".contribution-card").filter({ hasText: firstTitle });
    await firstReview.getByLabel("Make this approved contribution public").check();
    const decisionResponse = creatorPage.waitForResponse((response) =>
      response.url().includes(`/api/contributions/${firstId}/decision`) &&
      response.request().method() === "POST"
    );
    await firstReview.getByRole("button", { name: "Record decision" }).click();
    const decision = await decisionResponse;
    assert.equal(decision.status(), 200, `creator decision failed: ${decision.status()} ${await decision.text()}`);
    const decisionBody = await decision.json();
    assert.equal(decisionBody.contribution?.status, "approved", "creator decision must persist as approved");
    await firstReview.getByText("approved").waitFor({ timeout: 15_000 });

    // Inspect the creator-authorized record after the decision before testing public rendering.
    const reviewState = await creatorPage.evaluate(async (workSlug) => {
      const response = await fetch(`/api/studio/works/${workSlug}/contributions`);
      return { status: response.status, body: await response.json() };
    }, slug);
    assert.equal(reviewState.status, 200, `creator contribution API failed: ${JSON.stringify(reviewState)}`);
    const approvedRecord = reviewState.body.contributions?.find((item) => item.id === firstId);
    assert.ok(approvedRecord, `approved contribution missing from creator review API: ${JSON.stringify(reviewState.body)}`);
    assert.equal(approvedRecord.status, "approved", `creator API returned unexpected status: ${JSON.stringify(approvedRecord)}`);
    assert.equal(
      approvedRecord.isPublic,
      true,
      `creator selected public visibility but persisted record is not public: ${JSON.stringify(approvedRecord)}`
    );


    // Creator decision intent replay remains available after the creator unlinks.
    const decisionIntentKey = "123e4567-e89b-42d3-a456-426614174003";
    const decisionIntent = await creatorPage.evaluate(async ({ id, key, signer }) => {
      const response = await fetch("/api/contributions/" + id + "/decision/provenance/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key })
      });
      return { status: response.status, body: await response.json(), signer };
    }, { id: firstId, key: decisionIntentKey, signer: e2eCreatorSigner });
    assert.equal(decisionIntent.status, 200, "creator decision action should already have prepared its single provenance intent");
    assert.equal(decisionIntent.body.anchor.expectedSignerAddress.toLowerCase(), decisionIntent.signer.toLowerCase());
    bootstrapProvenance("unlink-user", creatorEmail);

    const replayedDecisionIntent = await creatorPage.evaluate(async ({ id, key, signer }) => {
      const response = await fetch("/api/contributions/" + id + "/decision/provenance/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: key })
      });
      return { status: response.status, body: await response.json(), signer };
    }, { id: firstId, key: decisionIntentKey, signer: e2eCreatorSigner });
    assert.equal(replayedDecisionIntent.status, 200, "existing creator decision intent must replay after unlink");
    assert.equal(replayedDecisionIntent.body.anchor.expectedSignerAddress.toLowerCase(), replayedDecisionIntent.signer.toLowerCase());

    const differentKeyReusesDecisionIntent = await creatorPage.evaluate(async (id) => {
      const response = await fetch("/api/contributions/" + id + "/decision/provenance/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: "123e4567-e89b-42d3-a456-426614174004" })
      });
      return { status: response.status, body: await response.json() };
    }, firstId);
    assert.equal(differentKeyReusesDecisionIntent.status, 200, "one decision intent per contribution is replayable after unlink");
    assert.equal(differentKeyReusesDecisionIntent.body.anchor.id, decisionIntent.body.anchor.id);

    await creatorPage.goto(`${baseUrl}/works/${slug}`);
    const publicContribution = creatorPage.locator(".public-contribution-link").filter({ hasText: firstTitle });
    await publicContribution.waitFor({ state: "visible", timeout: 10_000 });
    await creatorPage.getByText("STORY PROVENANCE").waitFor();
    await creatorPage.getByText("MAINNET · VERIFIED").first().waitFor();
    await creatorPage.getByText("LOCAL", { exact: true }).first().waitFor();
    await creatorPage.getByText("Contribution anchor").waitFor();
    await creatorPage.getByText("Creator decision anchor").waitFor();
    await contributorPage.goto(`${baseUrl}/works/${slug}/contributions/${firstId}`);
    await contributorPage.getByRole("heading", { name: firstTitle }).waitFor();
    await contributorPage.getByText("PROVENANCE EVIDENCE").waitFor();
    await contributorPage.getByText("MAINNET · VERIFIED").first().waitFor();
    await contributorPage.getByText("LOCAL", { exact: true }).first().waitFor();
    await contributorPage.getByText("Contribution", { exact: true }).waitFor();
    await contributorPage.getByText("Creator decision").waitFor();

    // A second pending submission becomes stale when the creator publishes a new source version.
    const secondTitle = "E2E Pending Submission";
    const secondId = await submitContribution(
      contributorPage,
      slug,
      secondTitle,
      "A second contribution tied to the original version. It must become stale after the creator publishes a revised source. " +
      "This record remains in history and cannot be approved against the new version. ".repeat(2)
    );

    await creatorPage.goto(`${baseUrl}/studio/works/${slug}/edit`);
    await creatorPage.getByLabel("Story title").fill("E2E Story Revised");
    await creatorPage.getByRole("button", { name: "Publish work" }).click();
    await creatorPage.waitForURL(new RegExp(`/works/${slug}$`), { timeout: 15_000 });
    await creatorPage.getByRole("heading", { name: "E2E Story Revised" }).waitFor();

    await contributorPage.goto(`${baseUrl}/dashboard/contributions`);
    const staleRow = contributorPage.locator(".work-row").filter({ hasText: secondTitle });
    await staleRow.getByText("stale").waitFor({ timeout: 15_000 });
    await contributorPage.goto(`${baseUrl}/dashboard/contributions/${secondId}`);
    await contributorPage.getByText("YOUR CONTRIBUTION · STALE").waitFor();

    // Other accounts cannot read a contributor's private submission detail.
    const forbiddenPrivateRead = await adminPage.goto(`${baseUrl}/dashboard/contributions/${secondId}`);
    assert.equal(forbiddenPrivateRead?.status(), 404, "private contribution detail must be owner-only");

    // Password recovery uses the local mail sink and returns the account to a usable state.
    await contributorPage.goto(`${baseUrl}/forgot-password`);
    const beforeReset = readLog().length;
    await contributorPage.getByLabel("Email").fill(contributorEmail);
    await contributorPage.getByRole("button", { name: "Send reset link" }).click();
    const resetUrl = await waitForMailLink("password-reset", beforeReset);
    await contributorPage.goto(resetUrl);
    await contributorPage.getByLabel("New password").fill("FANOVA-E2E-New-Password-2026!");
    await contributorPage.getByLabel("Confirm password").fill("FANOVA-E2E-New-Password-2026!");
    await contributorPage.getByRole("button", { name: "Update password" }).click();
    await contributorPage.getByRole("status").waitFor();

    await contributorPage.goto(`${baseUrl}/sign-in`);
    await contributorPage.getByLabel("Email").fill(contributorEmail);
    await contributorPage.getByLabel("Password").fill("FANOVA-E2E-New-Password-2026!");
    await contributorPage.getByRole("button", { name: "Sign in" }).click();
    await contributorPage.waitForURL(/\/dashboard$/, { timeout: 15_000 });
    await contributorPage.getByRole("heading", { name: "Welcome to FANOVA." }).waitFor();

    await contributorPage.getByRole("button", { name: "Sign out" }).click();
    await contributorPage.waitForURL(/\/sign-in$/, { timeout: 10_000 });
    await contributorPage.goto(`${baseUrl}/dashboard`);
    await contributorPage.waitForURL(/\/sign-in$/, { timeout: 10_000 });

    await creatorPage.goto(`${baseUrl}/admin/creator-requests`);
    await creatorPage.waitForURL(/\/dashboard$/, { timeout: 10_000 });
  } finally {
    await adminContext.close();
    await creatorContext.close();
    await contributorContext.close();
    await browser.close();
  }
});
