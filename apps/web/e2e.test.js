import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { chromium } from "playwright";

test("creator-to-fan workflow and unauthorized review failure work in a real browser", async () => {
  const port = 4174;
  const baseURL = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["serve.mjs"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore"
  });
  let browser;

  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const response = await fetch(baseURL);
        if (response.ok) { ready = true; break; }
      } catch {}
      await delay(250);
    }
    assert.equal(ready, true, "local app server should start");

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(baseURL);
    page.once("dialog", dialog => dialog.accept());
    await page.getByRole("button", { name: "Reset local demo data" }).click();
    await page.getByLabel("Story title").fill("The Glass City");
    await page.getByLabel("Story text").fill("A courier discovers a city that changes every midnight.");
    await page.getByLabel("Permitted-use rules").fill("Fans may submit non-commercial continuations. No adaptations outside this story.");
    await page.locator("#story-form button").click();
    await assertNotice(page, "Story published locally");
    assert.match(await page.locator(".permission-box").innerText(), /Permitted-use rules · v1/);

    await page.getByRole("button", { name: "Fan" }).click();
    await page.getByLabel("Contribution title").fill("The Midnight Map");
    await page.getByLabel("Your contribution").fill("The courier finds a map that records tomorrow's streets.");
    await page.locator('input[name="acknowledged"]').check();
    await page.locator("#contribution-form button").click();
    await assertNotice(page, "Contribution saved locally");
    assert.match(await page.locator(".contribution-card .source-ref").first().innerText(), /source v1 · permissions v1/);

    await page.getByRole("button", { name: "Try unauthorized approval" }).click();
    await assertNotice(page, "only the story's authorized creator may review contributions");
    assert.equal(await page.locator(".chip.pending").count(), 1, "unauthorized attempt must leave contribution pending");

    await page.getByRole("button", { name: "Creator" }).click();
    await page.locator('[data-review="approved"]').click();
    await assertNotice(page, "Decision saved locally");
    assert.equal(await page.locator(".chip.approved").count(), 1, "creator approval should update the contribution state");

    await page.getByRole("button", { name: "Fan" }).click();
    await page.getByLabel("Contribution title").fill("The Lantern Keeper");
    await page.getByLabel("Your contribution").fill("A keeper lights a lantern to guide the courier home.");
    await page.locator('input[name="acknowledged"]').check();
    await page.locator("#contribution-form button").click();
    await assertNotice(page, "Contribution saved locally");

    await page.getByRole("button", { name: "Creator" }).click();
    await page.locator('[data-review="rejected"]').click();
    await assertNotice(page, "Decision saved locally");
    assert.equal(await page.locator(".chip.approved").count(), 1);
    assert.equal(await page.locator(".chip.rejected").count(), 1, "creator rejection should be visible");
    assert.match(await page.locator(".status").innerText(), /LOCAL MVP · NO CHAIN WRITES/);
    assert.match(await page.locator(".network-note").innerText(), /read-only check.*Soneium Mainnet/);
    assert.match(await page.locator(".onchain-proof").innerText(), /Contract deployment check/);
    assert.ok(await page.locator("#chain-proof-status").count(), "deployment status label should render");
    assert.match(await page.locator("#onchain-actions-title").innerText(), /Anchor this workflow onchain/);
    assert.equal(await page.locator("[data-onchain-action]").count(), 5, "wallet workflow controls should render");
    assert.match(await page.locator(".onchain-actions").innerText(), /Mainnet transactions cost ETH gas/);
  } finally {
    if (browser) await browser.close();
    server.kill("SIGTERM");
  }
});

async function assertNotice(page, expectedText) {
  const notice = page.locator("#notice");
  await notice.waitFor({ state: "visible" });
  assert.ok((await notice.innerText()).includes(expectedText), `expected notice to include: ${expectedText}`);
}
