import assert from "node:assert/strict";
import test from "node:test";

const baseUrl = process.env.FANOVA_PLATFORM_URL ?? "http://127.0.0.1:3000";

test("restored published work and approved public contribution remain readable", { timeout: 30_000 }, async () => {
  const searchUrl = new URL("/api/works", baseUrl);
  searchUrl.searchParams.set("q", "E2E Story Revised");

  const worksResponse = await fetch(searchUrl);
  const worksBody = await worksResponse.text();
  assert.equal(worksResponse.status, 200, `restored public works search failed: ${worksResponse.status} ${worksBody}`);

  const worksPayload = JSON.parse(worksBody);
  const restoredWork = worksPayload.works?.find((item) => item.title === "E2E Story Revised");
  assert.ok(restoredWork, "the latest published work version must exist in the restored database");

  const pageResponse = await fetch(new URL(`/works/${encodeURIComponent(restoredWork.slug)}`, baseUrl));
  assert.equal(pageResponse.status, 200, `restored public work page failed: ${pageResponse.status}`);

  const pageHtml = await pageResponse.text();
  assert.ok(pageHtml.includes("E2E Story Revised"), "the latest published work version must render from the restored database");
  assert.ok(pageHtml.includes("E2E Fan Art Submission"), "the approved public contribution must render from the restored database");
});
