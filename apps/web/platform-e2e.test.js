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
  await page.getByRole("button", { name: "Submit contribution" }).click();
  await page.waitForURL(/\/dashboard\/contributions$/, { timeout: 15_000 });
  await page.getByRole("link", { name: title }).click();
  await page.waitForURL(/\/dashboard\/contributions\//, { timeout: 10_000 });
  return new URL(page.url()).pathname.split("/").pop();
}

test("FANOVA multi-account creator-to-contributor journey", { timeout: 300_000 }, async () => {
  assert.ok(platformDir, "FANOVA_PLATFORM_DIR must be configured");
  assert.ok(adminBootstrap, "FANOVA_ADMIN_BOOTSTRAP_SCRIPT must be configured");

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
    await creatorPage.getByRole("button", { name: "Publish work" }).click();
    await creatorPage.waitForURL(/\/works\/[^/]+$/, { timeout: 15_000 });
    const slug = new URL(creatorPage.url()).pathname.split("/").pop();
    await creatorPage.getByRole("heading", { name: "E2E Story" }).waitFor();

    // A separate reader signs up, verifies email, and returns directly to the contribution form.
    const contributorPage = await registerAndVerify(
      contributorContext,
      "E2E Contributor",
      contributorEmail,
      `/works/${slug}/contribute`
    );
    const contributionType = contributorPage.getByLabel("Contribution type");
    const availableTypes = await contributionType.locator("option").allTextContents();
    assert.deepEqual(availableTypes, ["Fan art"], "the form must reflect the creator's permission rules");

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
    await firstReview.getByRole("button", { name: "Record decision" }).click();
    await firstReview.getByText("approved").waitFor({ timeout: 15_000 });
    await creatorPage.goto(`${baseUrl}/works/${slug}`);
    await creatorPage.getByRole("link", { name: firstTitle }).waitFor();
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
