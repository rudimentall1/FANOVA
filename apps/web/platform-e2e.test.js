import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";
import { Wallet } from "ethers";

const baseUrl = process.env.FANOVA_PLATFORM_URL ?? "http://127.0.0.1:3000";
const logPath = process.env.FANOVA_PLATFORM_LOG ?? "/tmp/fanova-platform.log";
const platformDir = process.env.FANOVA_PLATFORM_DIR;
const adminBootstrap = process.env.FANOVA_ADMIN_BOOTSTRAP_SCRIPT;
const password = "FANOVA-E2E-Password-2026!";

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

  const browser = await chromium.launch({ headless: true });
  const adminContext = await browser.newContext();
  const creatorContext = await browser.newContext();
  const contributorContext = await browser.newContext();

  const walletA = new Wallet("0x0123456789012345678901234567890123456789012345678901234567890123");
  const walletB = new Wallet("0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd");
  const signWalletMessage = async (message, address) => {
    const signer = address.toLowerCase() === walletA.address.toLowerCase() ? walletA :
      address.toLowerCase() === walletB.address.toLowerCase() ? walletB : null;
    if (!signer) throw new Error("Unknown test wallet address");
    return signer.signMessage(message);
  };
  await adminContext.exposeFunction("fanovaSignMessage", signWalletMessage);
  await contributorContext.exposeFunction("fanovaSignMessage", signWalletMessage);
  await contributorContext.addInitScript(({ walletAAddress, walletBAddress }) => {
    globalThis.__fanovaTestAccount = 0;
    globalThis.ethereum = {
      isRabby: true,
      request: async ({ method, params = [] }) => {
        const accounts = [walletAAddress, walletBAddress];
        if (method === "eth_requestAccounts" || method === "eth_accounts") {
          return [accounts[globalThis.__fanovaTestAccount]];
        }
        if (method === "eth_chainId") return "0x74c";
        if (method === "wallet_switchEthereumChain") return null;
        if (method === "personal_sign") {
          const hex = String(params[0]);
          const bytes = new Uint8Array((hex.length - 2) / 2);
          for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Number.parseInt(hex.slice(2 + index * 2, 4 + index * 2), 16);
          }
          const message = new TextDecoder().decode(bytes);
          const signature = await globalThis.fanovaSignMessage(message, String(params[1]));
          globalThis.__fanovaLastSignedMessage = message;
          globalThis.__fanovaLastSignature = signature;
          return signature;
        }
        throw new Error(`Unsupported mocked Rabby method: ${method}`);
      }
    };
  }, { walletAAddress: walletA.address, walletBAddress: walletB.address });

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
    // Link a wallet, reject cross-account reuse, then require that wallet's signature to unlink and replace it.
    await contributorPage.goto(`${baseUrl}/settings/account`);
    await contributorPage.getByRole("heading", { name: "Wallet identity" }).waitFor();
    await contributorPage.getByRole("button", { name: "Connect Rabby" }).click();
    await contributorPage.getByText("Wallet signature verified and linked to this FANOVA account.").waitFor({ timeout: 15_000 });
    await contributorPage.getByText(walletA.address).waitFor();

    const crossAccountLink = await adminPage.evaluate(async (address) => {
      const challengeResponse = await fetch("/api/wallet/challenge", { method: "POST" });
      const challenge = await challengeResponse.json();
      const message = challenge.messageTemplate.replace("<wallet-address>", address);
      const signature = await window.fanovaSignMessage(message, address);
      const response = await fetch("/api/wallet/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature })
      });
      return { status: response.status, body: await response.json() };
    }, walletA.address);
    assert.equal(crossAccountLink.status, 409, `wallet A must not be linked to account B: ${JSON.stringify(crossAccountLink)}`);

    await contributorPage.getByRole("button", { name: "Unlink wallet" }).click();
    try {
      await contributorPage.getByText("Wallet safely unlinked. You can now connect another Soneium wallet.").waitFor({ timeout: 15_000 });
    } catch (error) {
      const debug = await contributorPage.evaluate(async () => ({
        status: document.querySelector(".form-status")?.textContent ?? null,
        wallet: await fetch("/api/wallet").then((response) => response.json()),
        signedMessage: globalThis.__fanovaLastSignedMessage ?? null
      }));
      throw new Error(`Wallet unlink did not complete. Debug=${JSON.stringify(debug)}; serverLog=${readLog().slice(-8000)}; cause=${error.message}`);
    }
    const replayStatus = await contributorPage.evaluate(async () => {
      const response = await fetch("/api/wallet/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: globalThis.__fanovaLastSignedMessage,
          signature: globalThis.__fanovaLastSignature
        })
      });
      return response.status;
    });
    assert.equal(replayStatus, 409, "a consumed unlink challenge must not be replayable");

    await contributorPage.evaluate(() => { globalThis.__fanovaTestAccount = 1; });
    await contributorPage.getByRole("button", { name: "Connect Rabby" }).click();
    await contributorPage.getByText("Wallet signature verified and linked to this FANOVA account.").waitFor({ timeout: 15_000 });
    await contributorPage.getByText(walletB.address).waitFor();

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

    await creatorPage.goto(`${baseUrl}/works/${slug}`);
    const publicContribution = creatorPage.locator(".public-contribution-link").filter({ hasText: firstTitle });
    await publicContribution.waitFor({ state: "visible", timeout: 10_000 });
    await contributorPage.goto(`${baseUrl}/works/${slug}/contributions/${firstId}`);
    await contributorPage.getByRole("heading", { name: firstTitle }).waitFor();

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
